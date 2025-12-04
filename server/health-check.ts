import { storage } from "./storage";
import { raceWebSocket } from "./websocket";
import { metricsCollector } from "./metrics";

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: ComponentHealth;
    websocket: ComponentHealth;
    memory: ComponentHealth;
    cache: ComponentHealth;
  };
  metrics?: ReturnType<typeof metricsCollector.getStats>;
}

interface ComponentHealth {
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

const VERSION = "2.0.0-scalable";
const MEMORY_WARNING_THRESHOLD = 0.85;
const MEMORY_CRITICAL_THRESHOLD = 0.95;
const DB_LATENCY_WARNING_MS = 100;
const DB_LATENCY_CRITICAL_MS = 500;

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  
  try {
    await storage.getActiveRaces();
    const latencyMs = Date.now() - start;
    
    if (latencyMs > DB_LATENCY_CRITICAL_MS) {
      return {
        status: "degraded",
        latencyMs,
        message: "Database response time is high",
      };
    }
    
    if (latencyMs > DB_LATENCY_WARNING_MS) {
      return {
        status: "healthy",
        latencyMs,
        message: "Database response time is elevated",
      };
    }
    
    return {
      status: "healthy",
      latencyMs,
    };
  } catch (error: any) {
    return {
      status: "unhealthy",
      message: `Database connection failed: ${error.message}`,
    };
  }
}

function checkWebSocket(): ComponentHealth {
  try {
    const stats = raceWebSocket.getStats();
    const loadState = raceWebSocket.getLoadState();
    
    if (loadState.isUnderPressure) {
      return {
        status: "degraded",
        message: "WebSocket server under pressure",
        details: {
          connections: stats.totalConnections,
          dbFailures: loadState.dbFailures,
          rejections: loadState.connectionRejections,
        },
      };
    }
    
    return {
      status: "healthy",
      details: {
        connections: stats.totalConnections,
        rooms: stats.activeRooms,
        messagesProcessed: stats.messagesProcessed,
      },
    };
  } catch (error: any) {
    return {
      status: "unhealthy",
      message: `WebSocket check failed: ${error.message}`,
    };
  }
}

function checkMemory(): ComponentHealth {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const rssMB = Math.round(memUsage.rss / 1024 / 1024);
  const heapUsageRatio = memUsage.heapUsed / memUsage.heapTotal;
  
  const details = {
    heapUsedMB,
    heapTotalMB,
    rssMB,
    heapUsagePercent: Math.round(heapUsageRatio * 100),
  };
  
  if (heapUsageRatio > MEMORY_CRITICAL_THRESHOLD) {
    return {
      status: "unhealthy",
      message: "Memory usage critical",
      details,
    };
  }
  
  if (heapUsageRatio > MEMORY_WARNING_THRESHOLD) {
    return {
      status: "degraded",
      message: "Memory usage high",
      details,
    };
  }
  
  return {
    status: "healthy",
    details,
  };
}

function checkCache(): ComponentHealth {
  try {
    const cacheStats = raceWebSocket.getCacheStats();
    const hitRate = cacheStats.hits + cacheStats.misses > 0
      ? cacheStats.hits / (cacheStats.hits + cacheStats.misses)
      : 1;
    
    return {
      status: "healthy",
      details: {
        hitRate: Math.round(hitRate * 100),
        activeRaces: cacheStats.activeRaces,
        evictions: cacheStats.evictions,
      },
    };
  } catch (error: any) {
    return {
      status: "degraded",
      message: `Cache check failed: ${error.message}`,
    };
  }
}

export async function performHealthCheck(includeMetrics = false): Promise<HealthCheckResult> {
  const [database, websocket, memory, cache] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkWebSocket()),
    Promise.resolve(checkMemory()),
    Promise.resolve(checkCache()),
  ]);
  
  const checks = { database, websocket, memory, cache };
  
  const statuses = Object.values(checks).map(c => c.status);
  let overallStatus: "healthy" | "degraded" | "unhealthy";
  
  if (statuses.includes("unhealthy")) {
    overallStatus = "unhealthy";
  } else if (statuses.includes("degraded")) {
    overallStatus = "degraded";
  } else {
    overallStatus = "healthy";
  }
  
  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: VERSION,
    checks,
  };
  
  if (includeMetrics) {
    result.metrics = metricsCollector.getStats();
  }
  
  return result;
}

export async function performLivenessCheck(): Promise<{ alive: boolean }> {
  return { alive: true };
}

export async function performReadinessCheck(): Promise<{ ready: boolean; reason?: string }> {
  try {
    await storage.getActiveRaces();
    return { ready: true };
  } catch (error: any) {
    return { ready: false, reason: error.message };
  }
}
