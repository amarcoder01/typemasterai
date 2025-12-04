import type { Server } from "http";
import { raceWebSocket } from "./websocket";
import { metricsCollector } from "./metrics";
import { raceCleanupScheduler } from "./race-cleanup";
import { raceCache } from "./race-cache";

const SHUTDOWN_TIMEOUT_MS = 30000;

let isShuttingDown = false;
let httpServer: Server | null = null;

export function registerShutdownHandlers(server: Server): void {
  httpServer = server;

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
  
  process.on("uncaughtException", (error) => {
    console.error("[Shutdown] Uncaught exception:", error);
    handleShutdown("uncaughtException");
  });
  
  process.on("unhandledRejection", (reason) => {
    console.error("[Shutdown] Unhandled rejection:", reason);
  });

  console.log("[Shutdown] Graceful shutdown handlers registered");
}

async function handleShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.log("[Shutdown] Already shutting down, ignoring signal:", signal);
    return;
  }
  
  isShuttingDown = true;
  console.log(`[Shutdown] Received ${signal}, starting graceful shutdown...`);
  
  const shutdownTimeout = setTimeout(() => {
    console.error("[Shutdown] Forced exit after timeout");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  
  try {
    console.log("[Shutdown] Stopping new connections...");
    if (httpServer) {
      httpServer.close();
    }
    
    console.log("[Shutdown] Flushing cache to database...");
    await raceCache.flushAll();
    
    console.log("[Shutdown] Closing WebSocket connections...");
    raceWebSocket.shutdown();
    
    console.log("[Shutdown] Stopping cleanup scheduler...");
    raceCleanupScheduler.shutdown();
    
    console.log("[Shutdown] Stopping metrics collector...");
    metricsCollector.shutdown();
    
    console.log("[Shutdown] Graceful shutdown complete");
    clearTimeout(shutdownTimeout);
    process.exit(0);
  } catch (error) {
    console.error("[Shutdown] Error during shutdown:", error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

export function isServerShuttingDown(): boolean {
  return isShuttingDown;
}
