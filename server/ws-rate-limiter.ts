import type { WebSocket } from "ws";

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  refillInterval: number; // ms between refills
}

interface ClientBucket {
  tokens: number;
  lastRefill: number;
  messageCount: number;
  lastReset: number;
  violations: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  violation?: boolean;
}

const MESSAGE_TYPE_LIMITS: Record<string, RateLimitConfig> = {
  progress: { maxTokens: 30, refillRate: 20, refillInterval: 50 }, // 20 per second max
  join: { maxTokens: 5, refillRate: 1, refillInterval: 1000 }, // 1 per second
  ready: { maxTokens: 3, refillRate: 1, refillInterval: 1000 },
  finish: { maxTokens: 3, refillRate: 1, refillInterval: 1000 },
  leave: { maxTokens: 3, refillRate: 1, refillInterval: 1000 },
  chat_message: { maxTokens: 20, refillRate: 2, refillInterval: 500 }, // 4 per second, burst of 20
  // Host command rate limits - stricter to prevent abuse
  kick_player: { maxTokens: 3, refillRate: 1, refillInterval: 2000 }, // 1 kick per 2 seconds
  lock_room: { maxTokens: 2, refillRate: 1, refillInterval: 3000 }, // 1 lock toggle per 3 seconds
  ready_toggle: { maxTokens: 5, refillRate: 2, refillInterval: 1000 }, // 2 toggles per second
  rematch: { maxTokens: 2, refillRate: 1, refillInterval: 5000 }, // 1 rematch per 5 seconds
  spectate: { maxTokens: 3, refillRate: 1, refillInterval: 2000 }, // 1 spectate per 2 seconds
  stop_spectate: { maxTokens: 3, refillRate: 1, refillInterval: 1000 },
  keystroke_validation: { maxTokens: 10, refillRate: 5, refillInterval: 200 }, // 5 per second
  default: { maxTokens: 10, refillRate: 5, refillInterval: 200 },
};

const MAX_PAYLOAD_SIZE = 10 * 1024; // 10KB max payload
const MAX_VIOLATIONS = 10;
const VIOLATION_RESET_MS = 60 * 1000; // Reset violations after 1 minute
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up stale buckets every 5 minutes
const BUCKET_EXPIRE_MS = 10 * 60 * 1000; // Expire buckets after 10 minutes of inactivity

class WebSocketRateLimiter {
  private buckets: Map<WebSocket, Map<string, ClientBucket>> = new Map();
  private globalStats = {
    totalMessages: 0,
    droppedMessages: 0,
    violations: 0,
    activeConnections: 0,
  };
  private cleanupTimer: NodeJS.Timeout | null = null;

  initialize() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleBuckets();
    }, CLEANUP_INTERVAL_MS);
    console.log("[WS RateLimiter] Initialized");
  }

  shutdown() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  validatePayload(data: string): { valid: boolean; error?: string } {
    if (data.length > MAX_PAYLOAD_SIZE) {
      return { valid: false, error: `Payload too large: ${data.length} bytes (max: ${MAX_PAYLOAD_SIZE})` };
    }

    try {
      const parsed = JSON.parse(data);
      if (!parsed || typeof parsed !== 'object') {
        return { valid: false, error: "Invalid message format: must be JSON object" };
      }
      if (!parsed.type || typeof parsed.type !== 'string') {
        return { valid: false, error: "Invalid message format: missing or invalid 'type' field" };
      }
      if (parsed.type.length > 50) {
        return { valid: false, error: "Invalid message type: too long" };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: "Invalid JSON" };
    }
  }

  checkLimit(ws: WebSocket, messageType: string): RateLimitResult {
    this.globalStats.totalMessages++;

    if (!this.buckets.has(ws)) {
      this.buckets.set(ws, new Map());
      this.globalStats.activeConnections = this.buckets.size;
    }

    const clientBuckets = this.buckets.get(ws)!;
    const config = MESSAGE_TYPE_LIMITS[messageType] || MESSAGE_TYPE_LIMITS.default;

    if (!clientBuckets.has(messageType)) {
      clientBuckets.set(messageType, {
        tokens: config.maxTokens,
        lastRefill: Date.now(),
        messageCount: 0,
        lastReset: Date.now(),
        violations: 0,
      });
    }

    const bucket = clientBuckets.get(messageType)!;
    const now = Date.now();

    if (now - bucket.lastReset > VIOLATION_RESET_MS) {
      bucket.violations = 0;
      bucket.lastReset = now;
    }

    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor((timePassed / config.refillInterval) * config.refillRate);
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    if (bucket.tokens < 1) {
      bucket.violations++;
      this.globalStats.droppedMessages++;
      
      if (bucket.violations >= MAX_VIOLATIONS) {
        this.globalStats.violations++;
        return {
          allowed: false,
          remaining: 0,
          retryAfter: Math.ceil(config.refillInterval / 1000),
          violation: true,
        };
      }

      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil(config.refillInterval / 1000),
      };
    }

    bucket.tokens--;
    bucket.messageCount++;

    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
    };
  }

  removeClient(ws: WebSocket): void {
    this.buckets.delete(ws);
    this.globalStats.activeConnections = this.buckets.size;
  }

  private cleanupStaleBuckets(): void {
    const now = Date.now();
    let cleaned = 0;

    const bucketEntries = Array.from(this.buckets.entries());
    for (const [ws, clientBuckets] of bucketEntries) {
      let allStale = true;
      const bucketValues = Array.from(clientBuckets.values());
      for (const bucket of bucketValues) {
        if (now - bucket.lastRefill < BUCKET_EXPIRE_MS) {
          allStale = false;
          break;
        }
      }
      if (allStale) {
        this.buckets.delete(ws);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[WS RateLimiter] Cleaned ${cleaned} stale client buckets`);
      this.globalStats.activeConnections = this.buckets.size;
    }
  }

  getStats() {
    return { ...this.globalStats };
  }

  getClientStats(ws: WebSocket): Record<string, { remaining: number; messageCount: number }> {
    const clientBuckets = this.buckets.get(ws);
    if (!clientBuckets) return {};

    const stats: Record<string, { remaining: number; messageCount: number }> = {};
    const clientBucketEntries = Array.from(clientBuckets.entries());
    for (const [type, bucket] of clientBucketEntries) {
      stats[type] = {
        remaining: Math.floor(bucket.tokens),
        messageCount: bucket.messageCount,
      };
    }
    return stats;
  }
}

export const wsRateLimiter = new WebSocketRateLimiter();
