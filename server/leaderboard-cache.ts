import { storage } from "./storage";
import crypto from "crypto";

export type LeaderboardType = "global" | "code" | "stress" | "dictation" | "rating";
export type TimeFrame = "all" | "daily" | "weekly" | "monthly";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  lastAccessed: number;
  hits: number;
  etag: string;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  wpm: number;
  accuracy: number;
  avatarColor: string | null;
  rank: number;
  isVerified?: boolean;
  verifiedAt?: Date;
}

interface PaginatedResponse<T> {
  entries: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
  metadata: {
    cacheHit: boolean;
    timeframe: TimeFrame;
    lastUpdated: number;
    etag?: string;
  };
}

const CACHE_TTL_MS = {
  global: 30000,
  code: 30000,
  stress: 5000,
  dictation: 30000,
  rating: 15000,
  aroundMe: 10000,
  timeBased: 60000,
};

const MAX_CACHE_SIZE = 100;
const MAX_MEMORY_MB = 50;

function generateEtag(data: any): string {
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(data));
  return `"${hash.digest('hex').substring(0, 16)}"`;
}

function estimateMemorySize(obj: any): number {
  const str = JSON.stringify(obj);
  return Buffer.byteLength(str, 'utf8');
}

class LeaderboardCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    memoryUsedBytes: 0,
  };

  private getCacheKey(
    type: LeaderboardType,
    options: {
      timeframe?: TimeFrame;
      difficulty?: string;
      language?: string;
      tier?: string;
      limit?: number;
      offset?: number;
      userId?: string;
    }
  ): string {
    const parts: string[] = [type];
    if (options.timeframe) parts.push(`tf:${options.timeframe}`);
    if (options.difficulty) parts.push(`diff:${options.difficulty}`);
    if (options.language) parts.push(`lang:${options.language}`);
    if (options.tier) parts.push(`tier:${options.tier}`);
    if (options.limit) parts.push(`lim:${options.limit}`);
    if (options.offset) parts.push(`off:${options.offset}`);
    if (options.userId) parts.push(`uid:${options.userId}`);
    return parts.join(":");
  }

  private getTTL(type: LeaderboardType): number {
    return CACHE_TTL_MS[type] || 30000;
  }

  private isExpired(entry: CacheEntry<any>, ttl: number): boolean {
    return Date.now() - entry.timestamp > ttl;
  }

  private evictLRU(): void {
    if (this.cache.size < MAX_CACHE_SIZE) return;

    let lruKey: string | null = null;
    let lruTime = Infinity;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  get<T>(key: string, ttl: number): { data: T; etag: string } | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry, ttl)) {
      this.stats.memoryUsedBytes -= estimateMemorySize(entry.data);
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.lastAccessed = Date.now();
    entry.hits++;
    this.stats.hits++;
    return { data: entry.data as T, etag: entry.etag };
  }

  getEtag(key: string, ttl: number): string | null {
    const entry = this.cache.get(key);
    if (!entry || this.isExpired(entry, ttl)) {
      return null;
    }
    return entry.etag;
  }

  set<T>(key: string, data: T): string {
    this.evictLRU();
    this.evictIfMemoryExceeded();
    const now = Date.now();
    const etag = generateEtag(data);
    const memSize = estimateMemorySize(data);
    
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.stats.memoryUsedBytes -= estimateMemorySize(existingEntry.data);
    }
    
    this.cache.set(key, {
      data,
      timestamp: now,
      lastAccessed: now,
      hits: 0,
      etag,
    });
    
    this.stats.memoryUsedBytes += memSize;
    return etag;
  }

  private evictIfMemoryExceeded(): void {
    const maxBytes = MAX_MEMORY_MB * 1024 * 1024;
    while (this.stats.memoryUsedBytes > maxBytes && this.cache.size > 0) {
      let lruKey: string | null = null;
      let lruTime = Infinity;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessed < lruTime) {
          lruTime = entry.lastAccessed;
          lruKey = key;
        }
      }

      if (lruKey) {
        const entry = this.cache.get(lruKey);
        if (entry) {
          this.stats.memoryUsedBytes -= estimateMemorySize(entry.data);
        }
        this.cache.delete(lruKey);
        this.stats.evictions++;
      } else {
        break;
      }
    }
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size,
    };
  }

  async getGlobalLeaderboard(options: {
    timeframe?: TimeFrame;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<any>> {
    const { timeframe = "all", limit = 20, offset = 0 } = options;
    const cacheKey = this.getCacheKey("global", { timeframe, limit, offset });
    
    const cached = this.get<PaginatedResponse<any>>(cacheKey, CACHE_TTL_MS.global);
    if (cached) {
      return { ...cached.data, metadata: { ...cached.data.metadata, cacheHit: true, etag: cached.etag } };
    }

    const entries = await storage.getLeaderboardPaginated(limit, offset, timeframe);
    const total = await storage.getLeaderboardCount(timeframe);

    const response: PaginatedResponse<any> = {
      entries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + entries.length < total,
        nextCursor: offset + limit < total ? this.encodeCursor(offset + limit) : undefined,
        prevCursor: offset > 0 ? this.encodeCursor(Math.max(0, offset - limit)) : undefined,
      },
      metadata: {
        cacheHit: false,
        timeframe,
        lastUpdated: Date.now(),
      },
    };

    this.set(cacheKey, response);
    return response;
  }

  async getStressLeaderboard(options: {
    difficulty?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<any>> {
    const { difficulty, limit = 50, offset = 0 } = options;
    const cacheKey = this.getCacheKey("stress", { difficulty, limit, offset });
    
    const cached = this.get<PaginatedResponse<any>>(cacheKey, CACHE_TTL_MS.stress);
    if (cached) {
      return { ...cached.data, metadata: { ...cached.data.metadata, cacheHit: true, etag: cached.etag } };
    }

    const entries = await storage.getStressTestLeaderboardPaginated(difficulty, limit, offset);
    const total = await storage.getStressTestLeaderboardCount(difficulty);

    const response: PaginatedResponse<any> = {
      entries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + entries.length < total,
        nextCursor: offset + limit < total ? this.encodeCursor(offset + limit) : undefined,
        prevCursor: offset > 0 ? this.encodeCursor(Math.max(0, offset - limit)) : undefined,
      },
      metadata: {
        cacheHit: false,
        timeframe: "all",
        lastUpdated: Date.now(),
      },
    };

    this.set(cacheKey, response);
    return response;
  }

  async getCodeLeaderboard(options: {
    language?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<any>> {
    const { language, limit = 20, offset = 0 } = options;
    const cacheKey = this.getCacheKey("code", { language, limit, offset });
    
    const cached = this.get<PaginatedResponse<any>>(cacheKey, CACHE_TTL_MS.code);
    if (cached) {
      return { ...cached.data, metadata: { ...cached.data.metadata, cacheHit: true, etag: cached.etag } };
    }

    const entries = await storage.getCodeLeaderboardPaginated(language, limit, offset);
    const total = await storage.getCodeLeaderboardCount(language);

    const response: PaginatedResponse<any> = {
      entries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + entries.length < total,
        nextCursor: offset + limit < total ? this.encodeCursor(offset + limit) : undefined,
        prevCursor: offset > 0 ? this.encodeCursor(Math.max(0, offset - limit)) : undefined,
      },
      metadata: {
        cacheHit: false,
        timeframe: "all",
        lastUpdated: Date.now(),
      },
    };

    this.set(cacheKey, response);
    return response;
  }

  async getRatingLeaderboard(options: {
    tier?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<any>> {
    const { tier, limit = 50, offset = 0 } = options;
    const cacheKey = this.getCacheKey("rating", { tier, limit, offset });
    
    const cached = this.get<PaginatedResponse<any>>(cacheKey, CACHE_TTL_MS.rating);
    if (cached) {
      return { ...cached.data, metadata: { ...cached.data.metadata, cacheHit: true, etag: cached.etag } };
    }

    const entries = await storage.getRatingLeaderboardPaginated(tier, limit, offset);
    const total = await storage.getRatingLeaderboardCount(tier);

    const response: PaginatedResponse<any> = {
      entries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + entries.length < total,
        nextCursor: offset + limit < total ? this.encodeCursor(offset + limit) : undefined,
        prevCursor: offset > 0 ? this.encodeCursor(Math.max(0, offset - limit)) : undefined,
      },
      metadata: {
        cacheHit: false,
        timeframe: "all",
        lastUpdated: Date.now(),
      },
    };

    this.set(cacheKey, response);
    return response;
  }

  async getDictationLeaderboard(options: {
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<any>> {
    const { limit = 20, offset = 0 } = options;
    const cacheKey = this.getCacheKey("dictation", { limit, offset });
    
    const cached = this.get<PaginatedResponse<any>>(cacheKey, CACHE_TTL_MS.dictation);
    if (cached) {
      return { ...cached.data, metadata: { ...cached.data.metadata, cacheHit: true, etag: cached.etag } };
    }

    const entries = await storage.getDictationLeaderboardPaginated(limit, offset);
    const total = await storage.getDictationLeaderboardCount();

    const response: PaginatedResponse<any> = {
      entries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + entries.length < total,
        nextCursor: offset + limit < total ? this.encodeCursor(offset + limit) : undefined,
        prevCursor: offset > 0 ? this.encodeCursor(Math.max(0, offset - limit)) : undefined,
      },
      metadata: {
        cacheHit: false,
        timeframe: "all",
        lastUpdated: Date.now(),
      },
    };

    this.set(cacheKey, response);
    return response;
  }

  async getAroundMe(
    type: LeaderboardType,
    userId: string,
    options: {
      difficulty?: string;
      language?: string;
      tier?: string;
      range?: number;
    } = {}
  ): Promise<{ userRank: number; entries: any[]; cacheHit: boolean }> {
    const { range = 5 } = options;
    const cacheKey = this.getCacheKey(type, { ...options, userId });
    
    const cached = this.get<{ userRank: number; entries: any[] }>(cacheKey, CACHE_TTL_MS.aroundMe);
    if (cached) {
      return { ...cached.data, cacheHit: true };
    }

    let result: { userRank: number; entries: any[] };

    switch (type) {
      case "global":
        result = await storage.getLeaderboardAroundUser(userId, range);
        break;
      case "stress":
        result = await storage.getStressLeaderboardAroundUser(userId, options.difficulty, range);
        break;
      case "code":
        result = await storage.getCodeLeaderboardAroundUser(userId, options.language, range);
        break;
      case "rating":
        result = await storage.getRatingLeaderboardAroundUser(userId, options.tier, range);
        break;
      case "dictation":
        result = await storage.getDictationLeaderboardAroundUser(userId, range);
        break;
      default:
        result = { userRank: -1, entries: [] };
    }

    this.set(cacheKey, result);
    return { ...result, cacheHit: false };
  }

  private encodeCursor(offset: number): string {
    return Buffer.from(`offset:${offset}`).toString("base64");
  }

  decodeCursor(cursor: string): number {
    try {
      const decoded = Buffer.from(cursor, "base64").toString("utf-8");
      const match = decoded.match(/^offset:(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    } catch {
      return 0;
    }
  }
}

export const leaderboardCache = new LeaderboardCache();

export function getTimeframeDateRange(timeframe: TimeFrame): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;

  switch (timeframe) {
    case "daily":
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      break;
    case "weekly":
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "all":
    default:
      start = new Date(0);
      break;
  }

  return { start, end };
}
