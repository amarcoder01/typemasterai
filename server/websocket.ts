import { WebSocketServer, WebSocket } from "ws";
import DOMPurify from "isomorphic-dompurify";
import { storage } from "./storage";
import { botService } from "./bot-service";
import { raceCache } from "./race-cache";
import { wsRateLimiter } from "./ws-rate-limiter";
import { raceCleanupScheduler } from "./race-cleanup";
import { metricsCollector } from "./metrics";
import { eloRatingService } from "./elo-rating-service";
import { antiCheatService } from "./anticheat-service";
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

interface ExtensionState {
  lastExtendedAt: number;
  extensionCount: number;
  pendingExtension: boolean;
}

const EXTENSION_COOLDOWN_MS = 5000;
const MAX_EXTENSIONS_PER_RACE = 5;

class RaceWebSocketServer {
  private wss: WebSocketServer | null = null;
  private races: Map<number, RaceRoom> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private extensionStates: Map<number, ExtensionState> = new Map();
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
        this.cleanupExtensionState(raceId);
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
      case "extend_paragraph":
        await this.handleExtendParagraph(ws, message);
        break;
      case "submit_keystrokes":
        await this.handleSubmitKeystrokes(ws, message);
        break;
      case "chat_message":
        await this.handleChatMessage(ws, message);
        break;
      case "spectate":
        await this.handleSpectate(ws, message);
        break;
      case "stop_spectate":
        await this.handleStopSpectate(ws, message);
        break;
      case "get_replay":
        await this.handleGetReplay(ws, message);
        break;
      case "get_rating":
        await this.handleGetRating(ws, message);
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

    if (!isReconnect && race.status === "waiting") {
      await this.addBotsIfNeeded(raceId, race, participants);
    }
  }

  private async addBotsIfNeeded(raceId: number, race: any, participants: any[]) {
    const humanCount = participants.filter((p: any) => p.isBot === 0).length;
    const botCount = participants.filter((p: any) => p.isBot === 1).length;
    
    if (humanCount > 0 && botCount === 0 && participants.length < race.maxPlayers) {
      const botsNeeded = Math.min(3, race.maxPlayers - participants.length);
      
      if (botsNeeded > 0) {
        console.log(`[Bot Lobby] Adding ${botsNeeded} bots to race ${raceId} in waiting room`);
        const bots = await botService.addBotsToRace(raceId, botsNeeded);
        console.log(`[Bot Lobby] Added ${bots.length} bots:`, bots.map(b => b.username).join(', '));
        
        this.broadcastToRace(raceId, {
          type: "bots_added",
          bots,
        });
        
        const updatedParticipants = await storage.getRaceParticipants(raceId);
        raceCache.updateParticipants(raceId, updatedParticipants);
        
        this.broadcastToRace(raceId, {
          type: "participants_sync",
          participants: updatedParticipants,
        });
      }
    }
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

        const freshRace = await storage.getRace(raceId);
        if (!freshRace || !freshRace.paragraphContent) {
          console.error(`[Bot Typing] Cannot start bots - race ${raceId} has no paragraph content`);
          return;
        }

        const cachedData = raceCache.getRace(raceId);
        const allParticipants = cachedData?.participants || await storage.getRaceParticipants(raceId);
        const bots = allParticipants.filter(p => p.isBot === 1);
        
        console.log(`[Bot Typing] Starting ${bots.length} bots for race ${raceId}, paragraph length: ${freshRace.paragraphContent.length}`);
        
        bots.forEach(bot => {
          console.log(`[Bot Typing] Starting bot ${bot.username} (${bot.id})`);
          botService.startBotTyping(
            bot.id,
            raceId,
            freshRace.paragraphContent.length,
            (data) => this.broadcastToRace(raceId, data),
            (botRaceId, botParticipantId, position) => this.handleBotFinished(botRaceId, botParticipantId, position)
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

    // Always fetch fresh participants from DB to ensure accurate allFinished check
    const freshParticipants = await storage.getRaceParticipants(raceId);
    const allFinished = freshParticipants.every(p => p.isFinished === 1);
    
    console.log(`[Human Finish] All finished check: ${allFinished}, participants: ${freshParticipants.map(p => `${p.username}:${p.isFinished}`).join(', ')}`);

    if (allFinished) {
      const updatedParticipants = freshParticipants;
      const finishedAt = new Date();
      await storage.updateRaceStatus(raceId, "finished", undefined, finishedAt);
      raceCache.updateRaceStatus(raceId, "finished", undefined, finishedAt);
      
      botService.stopAllBotsInRace(raceId, updatedParticipants);
      this.cleanupExtensionState(raceId);
      
      const sortedResults = updatedParticipants.sort((a, b) => (a.finishPosition || 999) - (b.finishPosition || 999));
      
      this.broadcastToRace(raceId, {
        type: "race_finished",
        results: sortedResults,
      });

      this.processRaceCompletion(raceId, sortedResults).catch(err => {
        console.error(`[RaceFinish] Error processing race completion:`, err);
      });
    }
  }

  private async handleBotFinished(raceId: number, participantId: number, position: number) {
    console.log(`[Bot Finish] Bot ${participantId} finished race ${raceId} in position ${position}`);
    
    // Check if race already finished
    const race = await storage.getRace(raceId);
    if (!race || race.status === "finished") {
      return; // Race already finished
    }
    
    // Persist bot finish to database (critical for allFinished check)
    const { position: dbPosition, isNewFinish } = await storage.finishParticipant(participantId);
    
    if (!isNewFinish) {
      console.log(`[Bot Finish] Bot ${participantId} already finished, skipping`);
      return;
    }
    
    // Update the cache with the bot's finish status
    raceCache.finishParticipant(raceId, participantId, dbPosition);
    
    // Always fetch fresh participants from DB to ensure accurate allFinished check
    const freshParticipants = await storage.getRaceParticipants(raceId);
    const allFinished = freshParticipants.every(p => p.isFinished === 1);
    
    console.log(`[Bot Finish] All finished check: ${allFinished}, participants: ${freshParticipants.map(p => `${p.username}:${p.isFinished}`).join(', ')}`);
    
    if (allFinished) {
      const finishedAt = new Date();
      await storage.updateRaceStatus(raceId, "finished", undefined, finishedAt);
      raceCache.updateRaceStatus(raceId, "finished", undefined, finishedAt);
      
      botService.stopAllBotsInRace(raceId, freshParticipants);
      this.cleanupExtensionState(raceId);
      
      const sortedResults = freshParticipants.sort((a, b) => (a.finishPosition || 999) - (b.finishPosition || 999));
      
      console.log(`[Bot Finish] Broadcasting race_finished for race ${raceId}`);
      
      this.broadcastToRace(raceId, {
        type: "race_finished",
        results: sortedResults,
      });
      
      this.processRaceCompletion(raceId, sortedResults).catch(err => {
        console.error(`[RaceFinish] Error processing race completion:`, err);
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
        this.cleanupExtensionState(raceId);
      }
    }

    this.updateStats();
  }

  private async handleExtendParagraph(ws: WebSocket, message: any) {
    const { raceId, participantId } = message;
    
    if (!raceId || !participantId) {
      ws.send(JSON.stringify({ type: "error", message: "Missing raceId or participantId" }));
      return;
    }

    let extensionState = this.extensionStates.get(raceId);
    if (!extensionState) {
      extensionState = { lastExtendedAt: 0, extensionCount: 0, pendingExtension: false };
      this.extensionStates.set(raceId, extensionState);
    }

    const now = Date.now();
    if (extensionState.pendingExtension) {
      console.log(`[Paragraph Extend] Race ${raceId} extension already in progress, skipping`);
      return;
    }

    if (now - extensionState.lastExtendedAt < EXTENSION_COOLDOWN_MS) {
      console.log(`[Paragraph Extend] Race ${raceId} in cooldown, skipping`);
      return;
    }

    if (extensionState.extensionCount >= MAX_EXTENSIONS_PER_RACE) {
      console.log(`[Paragraph Extend] Race ${raceId} reached max extensions (${MAX_EXTENSIONS_PER_RACE})`);
      return;
    }

    extensionState.pendingExtension = true;

    try {
      const race = await storage.getRace(raceId);
      
      if (!race || race.status !== "racing") {
        ws.send(JSON.stringify({ type: "error", message: "Race not active" }));
        return;
      }

      // Don't extend if any participant has already finished - race should end soon
      const cachedData = raceCache.getRace(raceId);
      const participants = cachedData?.participants || await storage.getRaceParticipants(raceId);
      const hasFinisher = participants.some(p => p.isFinished === 1);
      
      if (hasFinisher) {
        console.log(`[Paragraph Extend] Race ${raceId} has finished participants, skipping extension`);
        return;
      }

      const additionalParagraph = await storage.getRandomParagraph("english", "quote");
      if (!additionalParagraph) {
        ws.send(JSON.stringify({ type: "error", message: "No additional content available" }));
        return;
      }

      const newContent = additionalParagraph.content;
      const previousLength = race.paragraphContent.length;
      
      const updatedRace = await storage.extendRaceParagraph(raceId, newContent);
      const newTotalLength = updatedRace?.paragraphContent.length || previousLength + newContent.length + 1;
      
      raceCache.extendParagraph(raceId, newContent);

      extensionState.lastExtendedAt = now;
      extensionState.extensionCount++;

      console.log(`[Paragraph Extend] Race ${raceId} extended by ${newContent.length} chars (total: ${newTotalLength}, extension ${extensionState.extensionCount}/${MAX_EXTENSIONS_PER_RACE})`);

      this.broadcastToRace(raceId, {
        type: "paragraph_extended",
        additionalContent: newContent,
        newTotalLength,
        previousLength,
      });

      // Re-fetch participants to update bots with new paragraph length
      const currentParticipants = await storage.getRaceParticipants(raceId);
      const bots = currentParticipants.filter(p => p.isBot === 1 && p.isFinished !== 1);
      
      bots.forEach(bot => {
        botService.updateParagraphLength(bot.id, newTotalLength);
      });
    } finally {
      extensionState.pendingExtension = false;
    }
  }

  private cleanupExtensionState(raceId: number) {
    this.extensionStates.delete(raceId);
  }

  // ============================================================================
  // NEW MULTIPLAYER FEATURES HANDLERS
  // ============================================================================

  private async handleSubmitKeystrokes(ws: WebSocket, message: any) {
    const { raceId, participantId, keystrokes, clientWpm, userId } = message;

    if (!raceId || !participantId || !keystrokes) {
      ws.send(JSON.stringify({ type: "error", message: "Missing keystroke data" }));
      return;
    }

    try {
      const validation = await antiCheatService.validateKeystrokes(
        raceId,
        participantId,
        keystrokes,
        clientWpm || 0,
        userId
      );

      ws.send(JSON.stringify({
        type: "keystroke_validation",
        participantId,
        isValid: validation.isValid,
        isFlagged: validation.isFlagged,
        serverWpm: validation.serverCalculatedWpm,
        requiresCertification: validation.flagReasons.includes("requires_certification"),
      }));

      if (validation.isFlagged) {
        console.log(`[AntiCheat] Flagged participant ${participantId}: ${validation.flagReasons.join(", ")}`);
      }
    } catch (error) {
      console.error("[AntiCheat] Keystroke validation error:", error);
    }
  }

  private async handleChatMessage(ws: WebSocket, message: any) {
    const { raceId, participantId, content, messageType = "text", emoteCode } = message;

    if (!raceId || !participantId || !content) {
      ws.send(JSON.stringify({ type: "error", message: "Missing chat message data" }));
      return;
    }

    if (typeof content !== 'string') {
      ws.send(JSON.stringify({ type: "error", message: "Invalid message content" }));
      return;
    }

    if (content.length > 500) {
      ws.send(JSON.stringify({ type: "error", message: "Message too long" }));
      return;
    }

    const raceRoom = this.races.get(raceId);
    if (!raceRoom) return;

    const client = raceRoom.clients.get(participantId);
    if (!client) {
      ws.send(JSON.stringify({ type: "error", message: "Unauthorized: not a participant" }));
      return;
    }

    const sanitizedContent = DOMPurify.sanitize(content.trim(), {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });

    if (!sanitizedContent) {
      ws.send(JSON.stringify({ type: "error", message: "Empty message after sanitization" }));
      return;
    }

    try {
      const chatMessage = await storage.createRaceChatMessage({
        raceId,
        participantId,
        messageType,
        content: sanitizedContent,
        emoteCode,
      });

      this.broadcastToRace(raceId, {
        type: "chat_message",
        message: {
          id: chatMessage.id,
          participantId,
          username: client.username,
          content: sanitizedContent,
          messageType,
          emoteCode,
          createdAt: chatMessage.createdAt,
        },
      });

      this.triggerBotChatResponses(raceId, sanitizedContent);
    } catch (error) {
      console.error("[Chat] Message save error:", error);
    }
  }

  private raceChatCooldowns: Map<number, number> = new Map();
  private readonly BOT_CHAT_COOLDOWN_MS = 15000;

  private async triggerBotChatResponses(raceId: number, humanMessage: string) {
    try {
      const race = await storage.getRace(raceId);
      if (!race) {
        console.log(`[Bot Chat] Race ${raceId} not found`);
        return;
      }

      if (race.status === "finished" || race.status === "abandoned") {
        console.log(`[Bot Chat] Race ${raceId} is ${race.status}, skipping bot response`);
        return;
      }

      const now = Date.now();
      const lastRaceChat = this.raceChatCooldowns.get(raceId) || 0;
      if (now - lastRaceChat < this.BOT_CHAT_COOLDOWN_MS) {
        console.log(`[Bot Chat] Race ${raceId} is on cooldown, skipping`);
        return;
      }

      const participants = await storage.getRaceParticipants(raceId);
      const botParticipants = participants.filter(p => p.isBot === 1);

      console.log(`[Bot Chat] Race ${raceId} has ${botParticipants.length} bot participants`);

      if (botParticipants.length === 0) return;

      const respondingBot = botParticipants[Math.floor(Math.random() * botParticipants.length)];
      console.log(`[Bot Chat] Selected bot ${respondingBot.username} (${respondingBot.id}) to potentially respond`);

      const hasProfile = botService.isBot(respondingBot.id);
      
      if (hasProfile) {
        const chatResponse = botService.generateBotChatResponse(
          respondingBot.id,
          humanMessage,
          race.status
        );

        console.log(`[Bot Chat] Bot response decision: shouldRespond=${chatResponse.shouldRespond}`);

        if (!chatResponse.shouldRespond || !chatResponse.response) {
          return;
        }

        this.raceChatCooldowns.set(raceId, now);
        const delay = 1000 + Math.random() * 2000;

        setTimeout(async () => {
          try {
            const currentRace = await storage.getRace(raceId);
            if (!currentRace || currentRace.status === "finished" || currentRace.status === "abandoned") {
              console.log(`[Bot Chat] Race ${raceId} ended, skipping delayed response`);
              return;
            }

            const botChatMessage = await storage.createRaceChatMessage({
              raceId,
              participantId: respondingBot.id,
              messageType: "text",
              content: chatResponse.response!,
            });

            this.broadcastToRace(raceId, {
              type: "chat_message",
              message: {
                id: botChatMessage.id,
                participantId: respondingBot.id,
                username: chatResponse.botUsername || respondingBot.username,
                content: chatResponse.response,
                messageType: "text",
                createdAt: botChatMessage.createdAt,
                isBot: true,
              },
            });

            console.log(`[Bot Chat] ${chatResponse.botUsername} responded in race ${raceId}: "${chatResponse.response}"`);
          } catch (error) {
            console.error("[Bot Chat] Failed to send bot response:", error);
          }
        }, delay);
      } else {
        console.log(`[Bot Chat] Bot ${respondingBot.username} (${respondingBot.id}) has no profile, using fallback`);
        await this.sendDirectBotResponse(raceId, respondingBot);
      }
    } catch (error) {
      console.error("[Bot Chat] Error triggering bot responses:", error);
    }
  }

  private async sendDirectBotResponse(raceId: number, bot: any) {
    const now = Date.now();
    const lastRaceChat = this.raceChatCooldowns.get(raceId) || 0;
    
    if (now - lastRaceChat < this.BOT_CHAT_COOLDOWN_MS) {
      console.log(`[Bot Chat] Race ${raceId} is on cooldown for fallback, skipping`);
      return;
    }

    const responseChance = 0.9;
    if (Math.random() > responseChance) {
      console.log(`[Bot Chat] Bot ${bot.username} decided not to respond (random chance)`);
      return;
    }

    this.raceChatCooldowns.set(raceId, now);

    const responses = [
      "Hey! Good luck! 🎯",
      "Hi there! Ready to type fast?",
      "Hello! Let's race!",
      "Nice! Let's do this! 💪",
      "Good luck everyone!",
      "This is going to be fun!",
      "Let's go! 🔥",
      "Hey! Excited to race with you!",
      "Hi! May the fastest fingers win!",
      "Ready when you are! 🚀",
      "Let's see who's the fastest!",
      "Bring it on! 😎",
      "Can't wait to start!",
      "Hello! Best of luck to everyone!",
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    const delay = 1000 + Math.random() * 2000;

    console.log(`[Bot Chat] Direct response scheduled for ${bot.username} in ${delay}ms`);

    setTimeout(async () => {
      try {
        const currentRace = await storage.getRace(raceId);
        if (!currentRace || currentRace.status === "finished" || currentRace.status === "abandoned") {
          console.log(`[Bot Chat] Race ${raceId} ended, skipping delayed fallback response`);
          return;
        }

        const botChatMessage = await storage.createRaceChatMessage({
          raceId,
          participantId: bot.id,
          messageType: "text",
          content: response,
        });

        this.broadcastToRace(raceId, {
          type: "chat_message",
          message: {
            id: botChatMessage.id,
            participantId: bot.id,
            username: bot.username,
            content: response,
            messageType: "text",
            createdAt: botChatMessage.createdAt,
            isBot: true,
          },
        });

        console.log(`[Bot Chat] ${bot.username} responded directly in race ${raceId}: "${response}"`);
      } catch (error) {
        console.error("[Bot Chat] Failed to send direct bot response:", error);
      }
    }, delay);
  }

  private spectators: Map<number, Map<WebSocket, string>> = new Map();

  private async handleSpectate(ws: WebSocket, message: any) {
    const { raceId, userId, sessionId } = message;

    if (!raceId) {
      ws.send(JSON.stringify({ type: "error", message: "Missing race ID" }));
      return;
    }

    const race = await storage.getRace(raceId);
    if (!race) {
      ws.send(JSON.stringify({ type: "error", message: "Race not found" }));
      return;
    }

    let spectatorMap = this.spectators.get(raceId);
    if (!spectatorMap) {
      spectatorMap = new Map();
      this.spectators.set(raceId, spectatorMap);
    }
    
    const generatedSessionId = sessionId || `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    spectatorMap.set(ws, generatedSessionId);

    try {
      await storage.addRaceSpectator({
        raceId,
        userId,
        sessionId: generatedSessionId,
        isActive: true,
      });

      const spectatorCount = await storage.getActiveSpectatorCount(raceId);
      const participants = await storage.getRaceParticipants(raceId);

      ws.send(JSON.stringify({
        type: "spectate_joined",
        race,
        participants,
        spectatorCount,
      }));

      this.broadcastToRace(raceId, {
        type: "spectator_update",
        spectatorCount,
      });
    } catch (error) {
      console.error("[Spectator] Join error:", error);
    }
  }

  private async handleStopSpectate(ws: WebSocket, message: any) {
    const { raceId } = message;

    if (!raceId) return;

    await this.cleanupSpectator(ws, raceId);
  }

  private async cleanupSpectator(ws: WebSocket, raceId: number) {
    const spectatorMap = this.spectators.get(raceId);
    if (!spectatorMap) return;

    const sessionId = spectatorMap.get(ws);
    spectatorMap.delete(ws);
    
    if (spectatorMap.size === 0) {
      this.spectators.delete(raceId);
    }

    if (sessionId) {
      try {
        await storage.removeRaceSpectator(raceId, sessionId);
        const spectatorCount = await storage.getActiveSpectatorCount(raceId);
        
        this.broadcastToRace(raceId, {
          type: "spectator_update",
          spectatorCount,
        });
      } catch (error) {
        console.error("[Spectator] Leave error:", error);
      }
    }
  }

  private async handleGetReplay(ws: WebSocket, message: any) {
    const { raceId } = message;

    if (!raceId) {
      ws.send(JSON.stringify({ type: "error", message: "Missing race ID" }));
      return;
    }

    try {
      const replay = await storage.getRaceReplay(raceId);
      
      if (!replay) {
        ws.send(JSON.stringify({ type: "error", message: "Replay not found" }));
        return;
      }

      await storage.incrementReplayViewCount(raceId);

      ws.send(JSON.stringify({
        type: "replay_data",
        replay,
      }));
    } catch (error) {
      console.error("[Replay] Fetch error:", error);
      ws.send(JSON.stringify({ type: "error", message: "Failed to fetch replay" }));
    }
  }

  private async handleGetRating(ws: WebSocket, message: any) {
    const { userId } = message;

    if (!userId) {
      ws.send(JSON.stringify({ type: "error", message: "Missing user ID" }));
      return;
    }

    try {
      const rating = await storage.getOrCreateUserRating(userId);
      const tierInfo = eloRatingService.getTierInfo(rating.tier);

      ws.send(JSON.stringify({
        type: "rating_data",
        rating: {
          ...rating,
          tierInfo,
        },
      }));
    } catch (error) {
      console.error("[Rating] Fetch error:", error);
      ws.send(JSON.stringify({ type: "error", message: "Failed to fetch rating" }));
    }
  }

  private async processRaceCompletion(raceId: number, participants: any[]) {
    try {
      const results = participants
        .filter(p => p.isFinished === 1)
        .map(p => ({
          participantId: p.id,
          userId: p.userId,
          position: p.finishPosition || 999,
          wpm: p.wpm,
          accuracy: p.accuracy,
          isBot: p.isBot === 1,
        }));

      const ratingChanges = await eloRatingService.processRaceResults(raceId, results);

      if (ratingChanges.length > 0) {
        this.broadcastToRace(raceId, {
          type: "rating_changes",
          changes: ratingChanges.map(change => ({
            participantId: results.find(r => r.userId === change.userId)?.participantId,
            ...change,
            tierInfo: eloRatingService.getTierInfo(change.tier),
          })),
        });
      }

      const keystrokesData = await storage.getRaceKeystrokes(raceId);
      const race = await storage.getRace(raceId);
      
      if (race && keystrokesData.length > 0) {
        try {
          await storage.createRaceReplay({
            raceId,
            paragraphContent: race.paragraphContent,
            duration: race.finishedAt && race.startedAt 
              ? Math.round((race.finishedAt.getTime() - race.startedAt.getTime()))
              : null,
            participantData: participants.map(p => ({
              participantId: p.id,
              username: p.username,
              wpm: p.wpm,
              accuracy: p.accuracy,
              position: p.finishPosition,
              keystrokes: keystrokesData.find(k => k.participantId === p.id)?.keystrokes || [],
            })),
            isPublic: false,
          });
          console.log(`[Replay] Saved replay for race ${raceId}`);
        } catch (error) {
          console.error(`[Replay] Failed to save replay for race ${raceId}:`, error);
        }
      }
    } catch (error) {
      console.error(`[RaceCompletion] Error processing race ${raceId}:`, error);
    }
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
            this.cleanupExtensionState(raceId);
          }
          
          this.updateStats();
          return;
        }
      }
    }

    for (const [raceId, spectatorMap] of this.spectators.entries()) {
      if (spectatorMap.has(ws)) {
        this.cleanupSpectator(ws, raceId).catch(err => {
          console.error(`[Spectator] Cleanup error on disconnect:`, err);
        });
        break;
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
