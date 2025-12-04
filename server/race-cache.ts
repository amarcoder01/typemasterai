import type { Race, RaceParticipant } from "@shared/schema";

interface CachedRace {
  race: Race;
  participants: RaceParticipant[];
  updatedAt: number;
  accessedAt: number;
  version: number;
}

interface ParticipantProgress {
  progress: number;
  wpm: number;
  accuracy: number;
  errors: number;
  lastUpdate: number;
  dirty: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  flushes: number;
  activeRaces: number;
  totalParticipants: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL for race data
const MAX_CACHE_SIZE = 10000; // Maximum number of races to cache
const PROGRESS_FLUSH_INTERVAL_MS = 500; // Flush progress updates every 500ms
const LRU_CHECK_INTERVAL_MS = 60 * 1000; // Check for LRU eviction every minute

class RaceCache {
  private cache: Map<number, CachedRace> = new Map();
  private progressBuffer: Map<number, ParticipantProgress> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    flushes: 0,
    activeRaces: 0,
    totalParticipants: 0,
  };
  private flushTimer: NodeJS.Timeout | null = null;
  private lruTimer: NodeJS.Timeout | null = null;
  private flushCallback: ((updates: Map<number, ParticipantProgress>) => Promise<void>) | null = null;

  initialize(flushCallback: (updates: Map<number, ParticipantProgress>) => Promise<void>) {
    this.flushCallback = flushCallback;
    
    this.flushTimer = setInterval(() => {
      this.flushProgressUpdates();
    }, PROGRESS_FLUSH_INTERVAL_MS);

    this.lruTimer = setInterval(() => {
      this.evictStaleEntries();
    }, LRU_CHECK_INTERVAL_MS);

    console.log("[RaceCache] Initialized with TTL:", CACHE_TTL_MS, "ms, max size:", MAX_CACHE_SIZE);
  }

  shutdown() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.lruTimer) {
      clearInterval(this.lruTimer);
      this.lruTimer = null;
    }
    this.flushProgressUpdates();
  }

  async flushAll(): Promise<void> {
    console.log("[RaceCache] Flushing all progress updates before shutdown...");
    await this.flushProgressUpdates();
    console.log(`[RaceCache] Flushed ${this.progressBuffer.size} pending updates`);
  }

  setRace(race: Race, participants: RaceParticipant[] = []): void {
    const existing = this.cache.get(race.id);
    const now = Date.now();
    
    if (this.cache.size >= MAX_CACHE_SIZE && !existing) {
      this.evictLRU();
    }

    this.cache.set(race.id, {
      race,
      participants,
      updatedAt: now,
      accessedAt: now,
      version: existing ? existing.version + 1 : 1,
    });

    this.updateStats();
  }

  getRace(raceId: number): CachedRace | undefined {
    const entry = this.cache.get(raceId);
    if (entry) {
      const now = Date.now();
      if (now - entry.updatedAt > CACHE_TTL_MS) {
        this.cache.delete(raceId);
        this.stats.evictions++;
        return undefined;
      }
      entry.accessedAt = now;
      this.stats.hits++;
      return entry;
    }
    this.stats.misses++;
    return undefined;
  }

  updateParticipants(raceId: number, participants: RaceParticipant[]): void {
    const entry = this.cache.get(raceId);
    if (entry) {
      entry.participants = participants;
      entry.updatedAt = Date.now();
      entry.version++;
    }
  }

  addParticipant(raceId: number, participant: RaceParticipant): void {
    const entry = this.cache.get(raceId);
    if (entry) {
      const existingIdx = entry.participants.findIndex(p => p.id === participant.id);
      if (existingIdx >= 0) {
        entry.participants[existingIdx] = participant;
      } else {
        entry.participants.push(participant);
      }
      entry.updatedAt = Date.now();
      entry.version++;
    }
  }

  removeParticipant(raceId: number, participantId: number): void {
    const entry = this.cache.get(raceId);
    if (entry) {
      entry.participants = entry.participants.filter(p => p.id !== participantId);
      entry.updatedAt = Date.now();
      entry.version++;
    }
  }

  updateRaceStatus(raceId: number, status: string, startedAt?: Date, finishedAt?: Date): void {
    const entry = this.cache.get(raceId);
    if (entry) {
      entry.race = {
        ...entry.race,
        status,
        startedAt: startedAt || entry.race.startedAt,
        finishedAt: finishedAt || entry.race.finishedAt,
      };
      entry.updatedAt = Date.now();
      entry.version++;
    }
  }

  bufferProgress(participantId: number, progress: number, wpm: number, accuracy: number, errors: number): void {
    this.progressBuffer.set(participantId, {
      progress,
      wpm,
      accuracy,
      errors,
      lastUpdate: Date.now(),
      dirty: true,
    });

    const entries = Array.from(this.cache.values());
    for (const entry of entries) {
      const participant = entry.participants.find((p: RaceParticipant) => p.id === participantId);
      if (participant) {
        participant.progress = progress;
        participant.wpm = wpm;
        participant.accuracy = accuracy;
        participant.errors = errors;
        break;
      }
    }
  }

  private async flushProgressUpdates(): Promise<void> {
    if (this.progressBuffer.size === 0 || !this.flushCallback) {
      return;
    }

    const dirtyUpdates = new Map<number, ParticipantProgress>();
    const progressEntries = Array.from(this.progressBuffer.entries());
    for (const [id, update] of progressEntries) {
      if (update.dirty) {
        dirtyUpdates.set(id, { ...update, dirty: false });
        update.dirty = false;
      }
    }

    if (dirtyUpdates.size > 0) {
      try {
        await this.flushCallback(dirtyUpdates);
        this.stats.flushes++;
      } catch (error) {
        console.error("[RaceCache] Failed to flush progress updates:", error);
        const dirtyEntries = Array.from(dirtyUpdates.entries());
        for (const [id] of dirtyEntries) {
          const existing = this.progressBuffer.get(id);
          if (existing) {
            existing.dirty = true;
          }
        }
      }
    }
  }

  private evictStaleEntries(): void {
    const now = Date.now();
    const entriesToRemove: number[] = [];

    const cacheEntries = Array.from(this.cache.entries());
    for (const [raceId, entry] of cacheEntries) {
      if (now - entry.updatedAt > CACHE_TTL_MS) {
        entriesToRemove.push(raceId);
      }
    }

    for (const raceId of entriesToRemove) {
      this.cache.delete(raceId);
      this.stats.evictions++;
    }

    if (entriesToRemove.length > 0) {
      console.log(`[RaceCache] Evicted ${entriesToRemove.length} stale entries`);
    }

    this.updateStats();
  }

  private evictLRU(): void {
    let oldestAccess = Infinity;
    let oldestRaceId: number | null = null;

    const cacheEntries = Array.from(this.cache.entries());
    for (const [raceId, entry] of cacheEntries) {
      if (entry.accessedAt < oldestAccess) {
        oldestAccess = entry.accessedAt;
        oldestRaceId = raceId;
      }
    }

    if (oldestRaceId !== null) {
      this.cache.delete(oldestRaceId);
      this.stats.evictions++;
      console.log(`[RaceCache] LRU eviction: race ${oldestRaceId}`);
    }
  }

  private updateStats(): void {
    this.stats.activeRaces = this.cache.size;
    let totalParticipants = 0;
    const entries = Array.from(this.cache.values());
    for (const entry of entries) {
      totalParticipants += entry.participants.length;
    }
    this.stats.totalParticipants = totalParticipants;
  }

  deleteRace(raceId: number): void {
    this.cache.delete(raceId);
    this.updateStats();
  }

  getActiveRaces(): Race[] {
    const now = Date.now();
    const activeRaces: Race[] = [];

    const entries = Array.from(this.cache.values());
    for (const entry of entries) {
      if (now - entry.updatedAt <= CACHE_TTL_MS) {
        if (["waiting", "countdown", "racing"].includes(entry.race.status)) {
          activeRaces.push(entry.race);
        }
      }
    }

    return activeRaces.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  clearProgressBuffer(participantId: number): void {
    this.progressBuffer.delete(participantId);
  }

  getProgressFromBuffer(participantId: number): ParticipantProgress | undefined {
    return this.progressBuffer.get(participantId);
  }

  finishParticipant(raceId: number, participantId: number, position: number): void {
    const entry = this.cache.get(raceId);
    if (entry) {
      const participant = entry.participants.find(p => p.id === participantId);
      if (participant) {
        participant.isFinished = 1;
        participant.finishPosition = position;
        participant.finishedAt = new Date();
      }
      entry.updatedAt = Date.now();
      entry.version++;
    }
  }
}

export const raceCache = new RaceCache();
