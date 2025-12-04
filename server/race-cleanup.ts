import { storage } from "./storage";
import { raceCache } from "./race-cache";

interface CleanupStats {
  totalCleaned: number;
  lastCleanup: Date | null;
  waitingCleaned: number;
  countdownCleaned: number;
  racingCleaned: number;
}

const CLEANUP_INTERVAL_MS = 60 * 1000; // Run cleanup every minute
const WAITING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes for waiting races
const COUNTDOWN_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes for countdown races
const RACING_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes for racing races
const FINISHED_RETENTION_MS = 24 * 60 * 60 * 1000; // Keep finished races for 24 hours

class RaceCleanupScheduler {
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private stats: CleanupStats = {
    totalCleaned: 0,
    lastCleanup: null,
    waitingCleaned: 0,
    countdownCleaned: 0,
    racingCleaned: 0,
  };

  initialize() {
    this.cleanupTimer = setInterval(() => {
      this.runCleanup();
    }, CLEANUP_INTERVAL_MS);
    
    setTimeout(() => {
      this.runCleanup();
    }, 5000);

    console.log("[RaceCleanup] Scheduler initialized");
  }

  shutdown() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  async runCleanup(): Promise<void> {
    if (this.isRunning) {
      console.log("[RaceCleanup] Cleanup already running, skipping");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const staleRaces = await storage.getStaleRaces(
        WAITING_TIMEOUT_MS,
        COUNTDOWN_TIMEOUT_MS,
        RACING_TIMEOUT_MS
      );

      let cleaned = 0;

      for (const race of staleRaces) {
        try {
          await storage.updateRaceStatus(race.id, "finished", undefined, new Date());
          
          raceCache.deleteRace(race.id);

          cleaned++;

          if (race.status === "waiting") this.stats.waitingCleaned++;
          else if (race.status === "countdown") this.stats.countdownCleaned++;
          else if (race.status === "racing") this.stats.racingCleaned++;

        } catch (error) {
          console.error(`[RaceCleanup] Failed to clean race ${race.id}:`, error);
        }
      }

      const oldFinished = await storage.cleanupOldFinishedRaces(FINISHED_RETENTION_MS);

      if (cleaned > 0 || oldFinished > 0) {
        console.log(`[RaceCleanup] Cleaned ${cleaned} stale races, ${oldFinished} old finished races in ${Date.now() - startTime}ms`);
      }

      this.stats.totalCleaned += cleaned + oldFinished;
      this.stats.lastCleanup = new Date();

    } catch (error) {
      console.error("[RaceCleanup] Cleanup failed:", error);
    } finally {
      this.isRunning = false;
    }
  }

  getStats(): CleanupStats {
    return { ...this.stats };
  }

  async forceCleanup(): Promise<void> {
    await this.runCleanup();
  }
}

export const raceCleanupScheduler = new RaceCleanupScheduler();
