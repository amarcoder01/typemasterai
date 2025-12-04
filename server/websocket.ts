import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { botService } from "./bot-service";
import { raceCache } from "./race-cache";
import { wsRateLimiter } from "./ws-rate-limiter";
import { raceCleanupScheduler } from "./race-cleanup";
import { metricsCollector } from "./metrics";
import type { Server } from "http";

interface RaceClient {
  ws: WebSocket;
  raceId: number;
  participantId: number;
  username: string;
  lastActivity: number;
}

interface RaceRoom {
  raceId: number;
  clients: Map<number, RaceClient>;
  countdownTimer?: NodeJS.Timeout;
  shardId: number;
}

interface ServerStats {
  totalConnections: number;
  activeRooms: number;
  totalParticipants: number;
  messagesProcessed: number;
  messagesDropped: number;
}

const NUM_SHARDS = 16;
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const CONNECTION_TIMEOUT_MS = 60 * 1000;

const MAX_CONNECTIONS = 50000;
const LOAD_SHEDDING_THRESHOLD = 0.8;
const DB_FAILURE_THRESHOLD = 5;
const DB_RECOVERY_INTERVAL_MS = 30 * 1000;

interface LoadState {
  isUnderPressure: boolean;
  dbFailures: number;
  lastDbFailure: number;
  lastRecoveryCheck: number;
  connectionRejections: number;
}

class RaceWebSocketServer {
  private wss: WebSocketServer | null = null;
  private races: Map<number, RaceRoom> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private stats: ServerStats = {
    totalConnections: 0,
    activeRooms: 0,
    totalParticipants: 0,
    messagesProcessed: 0,
    messagesDropped: 0,
  };
  private loadState: LoadState = {
    isUnderPressure: false,
    dbFailures: 0,
    lastDbFailure: 0,
    lastRecoveryCheck: 0,
    connectionRejections: 0,
  };

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws/race" });

    raceCache.initialize(async (updates) => {
      await this.flushProgressToDatabase(updates);
    });

    wsRateLimiter.initialize();
    raceCleanupScheduler.initialize();

    this.wss.on("connection", (ws: WebSocket) => {
      if (!this.acceptConnection(ws)) {
        return;
      }
      
      this.stats.totalConnections++;
      console.log(`[WS] New connection (total: ${this.stats.totalConnections})`);

      ws.on("message", async (data: Buffer | string) => {
        const dataStr = data.toString();
        
        const validation = wsRateLimiter.validatePayload(dataStr);
        if (!validation.valid) {
          ws.send(JSON.stringify({ 
            type: "error", 
            message: validation.error,
            code: "INVALID_PAYLOAD"
          }));
          return;
        }

        try {
          const message = JSON.parse(dataStr);
          
          const rateLimit = wsRateLimiter.checkLimit(ws, message.type);
          if (!rateLimit.allowed) {
            this.stats.messagesDropped++;
            if (rateLimit.violation) {
              ws.send(JSON.stringify({ 
                type: "error", 
                message: "Rate limit exceeded. Please slow down.",
                code: "RATE_LIMITED",
                retryAfter: rateLimit.retryAfter
              }));
            }
            return;
          }

          this.stats.messagesProcessed++;
          metricsCollector.recordWsMessage();
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error("WebSocket message error:", error);
          ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
        }
      });

      ws.on("close", () => {
        this.stats.totalConnections--;
        wsRateLimiter.removeClient(ws);
        this.handleDisconnect(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });

    this.heartbeatTimer = setInterval(() => {
      this.performHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    console.log("[WS] WebSocket server initialized with scalability features");
    console.log(`[WS] Shards: ${NUM_SHARDS}, Heartbeat: ${HEARTBEAT_INTERVAL_MS}ms`);
  }

  shutdown() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    raceCache.shutdown();
    wsRateLimiter.shutdown();
    raceCleanupScheduler.shutdown();
    
    const raceRooms = Array.from(this.races.values());
    for (const raceRoom of raceRooms) {
      if (raceRoom.countdownTimer) {
        clearInterval(raceRoom.countdownTimer);
      }
    }
    
    this.races.clear();
  }

  private async flushProgressToDatabase(updates: Map<number, { progress: number; wpm: number; accuracy: number; errors: number; lastUpdate: number; dirty: boolean }>): Promise<void> {
    if (this.loadState.dbFailures >= DB_FAILURE_THRESHOLD) {
      console.warn("[WS] DB circuit breaker open, skipping progress flush");
      return;
    }

    const dbUpdates = new Map<number, { progress: number; wpm: number; accuracy: number; errors: number }>();
    
    const updateEntries = Array.from(updates.entries());
    for (const [id, update] of updateEntries) {
      dbUpdates.set(id, {
        progress: update.progress,
        wpm: update.wpm,
        accuracy: update.accuracy,
        errors: update.errors,
      });
    }

    if (dbUpdates.size > 0) {
      try {
        await storage.bulkUpdateParticipantProgress(dbUpdates);
        this.recordDbSuccess();
      } catch (error) {
        console.error("[WS] Failed to flush progress to database:", error);
        this.recordDbFailure();
      }
    }
  }

  private getShardId(raceId: number): number {
    return raceId % NUM_SHARDS;
  }

  private performHeartbeat(): void {
    const now = Date.now();
    let staleConnections = 0;

    const raceEntries = Array.from(this.races.entries());
    for (const [raceId, raceRoom] of raceEntries) {
      const staleClients: number[] = [];
      
      const clientEntries = Array.from(raceRoom.clients.entries());
      for (const [participantId, client] of clientEntries) {
        if (now - client.lastActivity > CONNECTION_TIMEOUT_MS) {
          staleClients.push(participantId);
          staleConnections++;
        }
      }

      for (const participantId of staleClients) {
        raceRoom.clients.delete(participantId);
        this.broadcastToRace(raceId, {
          type: "participant_disconnected",
          participantId,
          reason: "timeout",
        });
      }

      if (raceRoom.clients.size === 0) {
        if (raceRoom.countdownTimer) {
          clearInterval(raceRoom.countdownTimer);
        }
        this.races.delete(raceId);
      }
    }

    this.updateStats();

    if (staleConnections > 0) {
      console.log(`[WS] Heartbeat: cleaned ${staleConnections} stale connections`);
    }
  }

  private updateStats(): void {
    this.stats.activeRooms = this.races.size;
    let totalParticipants = 0;
    const rooms = Array.from(this.races.values());
    for (const room of rooms) {
      totalParticipants += room.clients.size;
    }
    this.stats.totalParticipants = totalParticipants;
  }

  private async handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case "join":
        await this.handleJoin(ws, message);
        break;
      case "ready":
        await this.handleReady(message);
        break;
      case "progress":
        await this.handleProgress(message);
        break;
      case "finish":
        await this.handleFinish(message);
        break;
      case "leave":
        await this.handleLeave(ws, message);
        break;
      default:
        console.warn("Unknown message type:", message.type);
    }
  }

  private async handleJoin(ws: WebSocket, message: any) {
    const { raceId, participantId, username } = message;

    if (!raceId || !participantId || !username) {
      ws.send(JSON.stringify({ type: "error", message: "Missing required fields" }));
      return;
    }

    let cachedRace = raceCache.getRace(raceId);
    let race;
    let participants;

    if (cachedRace) {
      race = cachedRace.race;
      participants = cachedRace.participants;
    } else {
      race = await storage.getRace(raceId);
      if (!race) {
        ws.send(JSON.stringify({ type: "error", message: "Race not found" }));
        return;
      }
      participants = await storage.getRaceParticipants(raceId);
      raceCache.setRace(race, participants);
    }

    let raceRoom = this.races.get(raceId);
    if (!raceRoom) {
      raceRoom = {
        raceId,
        clients: new Map(),
        shardId: this.getShardId(raceId),
      };
      this.races.set(raceId, raceRoom);
    }

    const existingClient = raceRoom.clients.get(participantId);
    const isReconnect = !!existingClient;

    const client: RaceClient = { 
      ws, 
      raceId, 
      participantId, 
      username,
      lastActivity: Date.now(),
    };
    raceRoom.clients.set(participantId, client);

    let participant = participants.find(p => p.id === participantId);
    
    if (!participant) {
      participants = await storage.getRaceParticipants(raceId);
      participant = participants.find(p => p.id === participantId);
      raceCache.updateParticipants(raceId, participants);
    }
    
    if (!isReconnect) {
      this.broadcastToRace(raceId, {
        type: "participant_joined",
        participant,
        participants,
      });
      console.log(`[WS] New join: ${username} (${participantId}) in race ${raceId}`);
    } else {
      ws.send(JSON.stringify({
        type: "participants_sync",
        participants,
      }));
      console.log(`[WS] Reconnect: ${username} (${participantId}) in race ${raceId}`);
    }

    ws.send(JSON.stringify({
      type: "joined",
      race,
      participants,
    }));

    this.updateStats();
  }

  private async handleReady(message: any) {
    const { raceId } = message;
    const raceRoom = this.races.get(raceId);
    if (!raceRoom) return;

    let cachedRace = raceCache.getRace(raceId);
    let race;
    let participants;

    if (cachedRace) {
      race = cachedRace.race;
      participants = cachedRace.participants;
    } else {
      race = await storage.getRace(raceId);
      participants = await storage.getRaceParticipants(raceId);
      if (race) {
        raceCache.setRace(race, participants);
      }
    }
    
    if (!race || race.status !== "waiting") return;

    const requiredPlayers = 1;
    
    if (participants.length >= requiredPlayers) {
      await this.startCountdown(raceId);
    }
  }

  private async startCountdown(raceId: number) {
    const raceRoom = this.races.get(raceId);
    if (!raceRoom) return;

    let cachedRace = raceCache.getRace(raceId);
    let race;
    let participants;

    if (cachedRace) {
      race = cachedRace.race;
      participants = cachedRace.participants;
    } else {
      race = await storage.getRace(raceId);
      if (!race) return;
      participants = await storage.getRaceParticipants(raceId);
      raceCache.setRace(race, participants);
    }

    const humanCount = participants.filter(p => p.isBot === 0).length;
    
    if (humanCount > 0 && participants.length < race.maxPlayers) {
      const botsNeeded = race.maxPlayers - participants.length;
      
      if (botsNeeded > 0) {
        console.log(`[Bot Auto-Fill] Adding ${botsNeeded} bots to race ${raceId} (${participants.length}/${race.maxPlayers} players)`);
        const bots = await botService.addBotsToRace(raceId, botsNeeded);
        console.log(`[Bot Auto-Fill] Successfully added ${bots.length} bots:`, bots.map(b => b.username).join(', '));
        
        this.broadcastToRace(raceId, {
          type: "bots_added",
          bots,
        });
        
        participants = await storage.getRaceParticipants(raceId);
        raceCache.updateParticipants(raceId, participants);
      }
    }

    await storage.updateRaceStatus(raceId, "countdown");
    raceCache.updateRaceStatus(raceId, "countdown");

    this.broadcastToRace(raceId, {
      type: "countdown_start",
      countdown: 3,
      participants,
    });

    let countdown = 3;
    raceRoom.countdownTimer = setInterval(async () => {
      countdown--;
      
      if (countdown > 0) {
        this.broadcastToRace(raceId, {
          type: "countdown",
          countdown,
        });
      } else {
        if (raceRoom.countdownTimer) {
          clearInterval(raceRoom.countdownTimer);
        }
        
        const startedAt = new Date();
        await storage.updateRaceStatus(raceId, "racing", startedAt);
        raceCache.updateRaceStatus(raceId, "racing", startedAt);
        
        this.broadcastToRace(raceId, {
          type: "race_start",
        });

        const cachedData = raceCache.getRace(raceId);
        const allParticipants = cachedData?.participants || await storage.getRaceParticipants(raceId);
        const bots = allParticipants.filter(p => p.isBot === 1);
        
        bots.forEach(bot => {
          botService.startBotTyping(
            bot.id,
            raceId,
            race.paragraphContent.length,
            (data) => this.broadcastToRace(raceId, data)
          );
        });
      }
    }, 1000);
  }

  private async handleProgress(message: any) {
    const { participantId, progress, wpm, accuracy, errors } = message;

    raceCache.bufferProgress(participantId, progress, wpm, accuracy, errors);

    const raceId = this.findRaceIdByParticipant(participantId);
    if (raceId) {
      const raceRoom = this.races.get(raceId);
      if (raceRoom) {
        const client = raceRoom.clients.get(participantId);
        if (client) {
          client.lastActivity = Date.now();
        }
      }

      this.broadcastToRace(raceId, {
        type: "progress_update",
        participantId,
        progress,
        wpm,
        accuracy,
        errors,
      });
    }
  }

  private async handleFinish(message: any) {
    const { raceId, participantId } = message;

    const cachedRace = raceCache.getRace(raceId);
    let race = cachedRace?.race;
    
    if (!race) {
      race = await storage.getRace(raceId);
    }

    if (!race || race.status === "finished") {
      return;
    }

    const cachedParticipants = cachedRace?.participants;
    let participants = cachedParticipants;
    
    if (!participants) {
      participants = await storage.getRaceParticipants(raceId);
    }

    const participant = participants.find(p => p.id === participantId);
    
    if (!participant) {
      return;
    }

    const { position, isNewFinish } = await storage.finishParticipant(participantId);

    if (!isNewFinish) {
      return;
    }

    raceCache.finishParticipant(raceId, participantId, position);

    this.broadcastToRace(raceId, {
      type: "participant_finished",
      participantId,
      position,
    });

    const updatedCached = raceCache.getRace(raceId);
    const updatedParticipants = updatedCached?.participants || await storage.getRaceParticipants(raceId);
    const allFinished = updatedParticipants.every(p => p.isFinished === 1);

    if (allFinished) {
      const finishedAt = new Date();
      await storage.updateRaceStatus(raceId, "finished", undefined, finishedAt);
      raceCache.updateRaceStatus(raceId, "finished", undefined, finishedAt);
      
      botService.stopAllBotsInRace(raceId, updatedParticipants);
      
      this.broadcastToRace(raceId, {
        type: "race_finished",
        results: updatedParticipants.sort((a, b) => (a.finishPosition || 999) - (b.finishPosition || 999)),
      });
    }
  }

  private async handleLeave(ws: WebSocket, message: any) {
    const { raceId, participantId } = message;
    
    await storage.deleteRaceParticipant(participantId);
    raceCache.removeParticipant(raceId, participantId);
    raceCache.clearProgressBuffer(participantId);
    
    const raceRoom = this.races.get(raceId);
    if (raceRoom) {
      this.broadcastToRace(raceId, {
        type: "participant_left",
        participantId,
      });

      raceRoom.clients.delete(participantId);
      
      if (raceRoom.clients.size === 0) {
        if (raceRoom.countdownTimer) {
          clearInterval(raceRoom.countdownTimer);
        }
        this.races.delete(raceId);
      }
    }

    this.updateStats();
  }

  private handleDisconnect(ws: WebSocket) {
    const racesToCheck = Array.from(this.races.entries());
    for (const [raceId, raceRoom] of racesToCheck) {
      const clientsToCheck = Array.from(raceRoom.clients.entries());
      for (const [participantId, client] of clientsToCheck) {
        if (client.ws === ws) {
          raceRoom.clients.delete(participantId);
          
          this.broadcastToRace(raceId, {
            type: "participant_disconnected",
            participantId,
          });

          if (raceRoom.clients.size === 0) {
            if (raceRoom.countdownTimer) {
              clearInterval(raceRoom.countdownTimer);
            }
            this.races.delete(raceId);
          }
          
          this.updateStats();
          return;
        }
      }
    }
  }

  private findRaceIdByParticipant(participantId: number): number | null {
    const racesToCheck = Array.from(this.races.entries());
    for (const [raceId, raceRoom] of racesToCheck) {
      if (raceRoom.clients.has(participantId)) {
        return raceId;
      }
    }
    return null;
  }

  private broadcastToRace(raceId: number, message: any) {
    const raceRoom = this.races.get(raceId);
    if (!raceRoom) return;

    const data = JSON.stringify(message);
    raceRoom.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  getRaceRoom(raceId: number): RaceRoom | undefined {
    return this.races.get(raceId);
  }

  private acceptConnection(ws: WebSocket): boolean {
    this.checkLoadState();

    if (this.stats.totalConnections >= MAX_CONNECTIONS) {
      this.loadState.connectionRejections++;
      ws.close(1013, "Server at capacity");
      console.warn(`[WS] Connection rejected: server at capacity (${this.stats.totalConnections}/${MAX_CONNECTIONS})`);
      return false;
    }

    const loadFactor = this.stats.totalConnections / MAX_CONNECTIONS;
    if (loadFactor >= LOAD_SHEDDING_THRESHOLD) {
      this.loadState.isUnderPressure = true;
      
      if (Math.random() < (loadFactor - LOAD_SHEDDING_THRESHOLD) * 5) {
        this.loadState.connectionRejections++;
        ws.close(1013, "Server under heavy load");
        console.warn(`[WS] Connection shed: server under pressure (load: ${(loadFactor * 100).toFixed(1)}%)`);
        return false;
      }
    }

    return true;
  }

  private checkLoadState(): void {
    const now = Date.now();
    
    if (now - this.loadState.lastRecoveryCheck > DB_RECOVERY_INTERVAL_MS) {
      this.loadState.lastRecoveryCheck = now;
      
      if (this.loadState.dbFailures > 0) {
        this.loadState.dbFailures = Math.max(0, this.loadState.dbFailures - 1);
        console.log(`[WS] DB failure count recovered to ${this.loadState.dbFailures}`);
      }
    }

    const loadFactor = this.stats.totalConnections / MAX_CONNECTIONS;
    this.loadState.isUnderPressure = loadFactor >= LOAD_SHEDDING_THRESHOLD || 
                                      this.loadState.dbFailures >= DB_FAILURE_THRESHOLD;
  }

  private recordDbFailure(): void {
    this.loadState.dbFailures++;
    this.loadState.lastDbFailure = Date.now();
    
    if (this.loadState.dbFailures >= DB_FAILURE_THRESHOLD) {
      this.loadState.isUnderPressure = true;
      console.error(`[WS] DB failure threshold reached (${this.loadState.dbFailures}), entering degraded mode`);
    }
  }

  private recordDbSuccess(): void {
    if (this.loadState.dbFailures > 0) {
      this.loadState.dbFailures = Math.max(0, this.loadState.dbFailures - 1);
    }
  }

  isUnderPressure(): boolean {
    return this.loadState.isUnderPressure;
  }

  getStats(): ServerStats {
    this.updateStats();
    return { ...this.stats };
  }

  getCacheStats() {
    return raceCache.getStats();
  }

  getRateLimiterStats() {
    return wsRateLimiter.getStats();
  }

  getCleanupStats() {
    return raceCleanupScheduler.getStats();
  }

  getLoadState() {
    return { ...this.loadState };
  }
}

export const raceWebSocket = new RaceWebSocketServer();
