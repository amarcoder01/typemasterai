import { WebSocketServer, WebSocket } from "ws";
import DOMPurify from "isomorphic-dompurify";
import OpenAI from "openai";
import { storage } from "./storage";
import { botService } from "./bot-service";
import { raceCache } from "./race-cache";
import { wsRateLimiter } from "./ws-rate-limiter";
import { raceCleanupScheduler } from "./race-cleanup";
import { metricsCollector } from "./metrics";
import { eloRatingService } from "./elo-rating-service";
import { antiCheatService } from "./anticheat-service";
import type { Server } from "http";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface RaceClient {
  ws: WebSocket;
  raceId: number;
  participantId: number;
  username: string;
  lastActivity: number;
  isReady: boolean;
}

interface RaceRoom {
  raceId: number;
  clients: Map<number, RaceClient>;
  countdownTimer?: NodeJS.Timeout;
  timedRaceTimer?: NodeJS.Timeout;
  raceStartTime?: number;
  shardId: number;
  isFinishing?: boolean; // Prevents cleanup during race completion
  hostParticipantId?: number; // The first player to join controls the race
  isLocked?: boolean; // Prevents new players from joining
  kickedPlayers: Set<number>; // List of kicked participant IDs
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
const CONNECTION_TIMEOUT_MS = 180 * 1000; // 3 minutes - longer than max race duration (2 min)

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

  private async enrichResultsWithRatings(participants: any[]): Promise<any[]> {
    const enrichedResults = await Promise.all(
      participants.map(async (p) => {
        if (p.isBot === 1) {
          return { ...p, isBot: true, rating: null, tier: null, ratingChange: null };
        }
        
        if (!p.userId) {
          return { ...p, isBot: false, rating: null, tier: null, ratingChange: null };
        }
        
        try {
          const userRating = await storage.getOrCreateUserRating(p.userId);
          const tierInfo = eloRatingService.getTierInfo(userRating.tier);
          return {
            ...p,
            isBot: false,
            rating: userRating.rating,
            tier: userRating.tier,
            tierInfo,
            ratingChange: null,
          };
        } catch (error) {
          console.error(`[Rating] Failed to fetch rating for user ${p.userId}:`, error);
          return { ...p, isBot: false, rating: null, tier: null, ratingChange: null };
        }
      })
    );
    return enrichedResults;
  }

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
      if (raceRoom.timedRaceTimer) {
        clearTimeout(raceRoom.timedRaceTimer);
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
        // NEVER clean up a race that is currently finishing - prevents race condition
        if (raceRoom.isFinishing) {
          console.log(`[WS Heartbeat] Keeping race room ${raceId} alive - race is finishing`);
          continue;
        }
        
        // For timed races that are still racing, DON'T delete the room - let the timer complete
        // This ensures results are broadcast even if all clients disconnect
        if (raceRoom.timedRaceTimer) {
          console.log(`[WS Heartbeat] Keeping race room ${raceId} alive - timed race timer active`);
          // Keep the race room and timer alive - it will clean up after broadcasting results
          continue;
        }
        
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

  // SECURITY: Validate that the message comes from an authenticated participant
  private validateAuthenticatedMessage(ws: WebSocket, message: any): boolean {
    const authParticipantId = (ws as any).authenticatedParticipantId;
    const authRaceId = (ws as any).authenticatedRaceId;
    
    // Skip validation for join messages (authentication happens there)
    if (message.type === "join") {
      return true;
    }
    
    // Spectate and get_replay don't require prior authentication
    if (message.type === "spectate" || message.type === "get_replay" || message.type === "stop_spectate" || message.type === "get_rating") {
      return true;
    }
    
    // Must be authenticated for all other messages
    if (!authParticipantId) {
      console.warn(`[WS Security] Unauthenticated message rejected: ${message.type}`);
      ws.send(JSON.stringify({ type: "error", message: "Not authenticated. Please join a race first." }));
      return false;
    }
    
    // Validate participantId in message matches authenticated ID
    if (message.participantId && message.participantId !== authParticipantId) {
      console.warn(`[WS Security] Participant ID mismatch: auth=${authParticipantId}, message=${message.participantId}`);
      ws.send(JSON.stringify({ type: "error", message: "Invalid participant ID" }));
      return false;
    }
    
    // Validate raceId in message matches authenticated race
    if (message.raceId && message.raceId !== authRaceId) {
      console.warn(`[WS Security] Race ID mismatch: auth=${authRaceId}, message=${message.raceId}`);
      ws.send(JSON.stringify({ type: "error", message: "Invalid race ID" }));
      return false;
    }
    
    return true;
  }

  private async handleMessage(ws: WebSocket, message: any) {
    // SECURITY: Validate authentication before processing
    if (!this.validateAuthenticatedMessage(ws, message)) {
      return;
    }
    
    // Update lastActivity on ANY message to keep connection alive
    const authRaceId = (ws as any).authenticatedRaceId;
    const authParticipantId = (ws as any).authenticatedParticipantId;
    if (authRaceId && authParticipantId) {
      const raceRoom = this.races.get(authRaceId);
      if (raceRoom) {
        const client = raceRoom.clients.get(authParticipantId);
        if (client) {
          client.lastActivity = Date.now();
        }
      }
    }
    
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
      case "timed_finish":
        await this.handleTimedFinish(message);
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
      case "ready_toggle":
        await this.handleReadyToggle(ws, message);
        break;
      case "kick_player":
        await this.handleKickPlayer(ws, message);
        break;
      case "lock_room":
        await this.handleLockRoom(ws, message);
        break;
      case "rematch":
        await this.handleRematch(ws, message);
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

    // SECURITY: Verify participant exists and belongs to this race
    const participant = participants.find(p => p.id === participantId);
    if (!participant) {
      console.warn(`[WS Security] Join rejected: participant ${participantId} not found in race ${raceId}`);
      ws.send(JSON.stringify({ type: "error", message: "Invalid participant" }));
      return;
    }

    // SECURITY: Verify username matches (prevents impersonation)
    if (participant.username !== username) {
      console.warn(`[WS Security] Join rejected: username mismatch for participant ${participantId}. Expected: ${participant.username}, Got: ${username}`);
      ws.send(JSON.stringify({ type: "error", message: "Username mismatch" }));
      return;
    }

    // Store authenticated participant ID on the WebSocket for future validation
    (ws as any).authenticatedParticipantId = participantId;
    (ws as any).authenticatedRaceId = raceId;

    let raceRoom = this.races.get(raceId);
    if (!raceRoom) {
      raceRoom = {
        raceId,
        clients: new Map(),
        shardId: this.getShardId(raceId),
        kickedPlayers: new Set(),
      };
      this.races.set(raceId, raceRoom);
    }

    // Check if player was kicked from this room
    if (raceRoom.kickedPlayers.has(participantId)) {
      ws.send(JSON.stringify({ type: "error", message: "You have been kicked from this room" }));
      return;
    }

    // Check if room is locked
    if (raceRoom.isLocked) {
      const existingClient = raceRoom.clients.get(participantId);
      if (!existingClient) {
        ws.send(JSON.stringify({ type: "error", message: "Room is locked - no new players allowed" }));
        return;
      }
    }

    const existingClient = raceRoom.clients.get(participantId);
    const isReconnect = !!existingClient;

    // Set host to first human player to join (not a bot)
    if (!raceRoom.hostParticipantId && participant.isBot !== 1) {
      raceRoom.hostParticipantId = participantId;
      console.log(`[WS] Host set: ${username} (${participantId}) for race ${raceId}`);
    }

    // Host is always ready by default
    const isHost = raceRoom.hostParticipantId === participantId;
    
    const client: RaceClient = { 
      ws, 
      raceId, 
      participantId, 
      username,
      lastActivity: Date.now(),
      isReady: isHost, // Host starts as ready, others must toggle
    };
    raceRoom.clients.set(participantId, client);

    // Re-fetch participant from fresh list if needed
    let currentParticipant = participant;
    if (!currentParticipant) {
      participants = await storage.getRaceParticipants(raceId);
      currentParticipant = participants.find(p => p.id === participantId);
      raceCache.updateParticipants(raceId, participants);
    }
    
    if (!isReconnect) {
      // Broadcast participant_joined to ALL clients so everyone sees the new player
      this.broadcastToRace(raceId, {
        type: "participant_joined",
        participant: currentParticipant,
        participants,
        hostParticipantId: raceRoom.hostParticipantId,
      });
      
      // Also send a full sync to make sure everyone has the latest list
      this.broadcastToRace(raceId, {
        type: "participants_sync",
        participants,
        hostParticipantId: raceRoom.hostParticipantId,
      });
      console.log(`[WS] New join: ${username} (${participantId}) in race ${raceId}`);
    } else {
      ws.send(JSON.stringify({
        type: "participants_sync",
        participants,
        hostParticipantId: raceRoom.hostParticipantId,
      }));
      console.log(`[WS] Reconnect: ${username} (${participantId}) in race ${raceId}`);
    }

    ws.send(JSON.stringify({
      type: "joined",
      race,
      participants,
      hostParticipantId: raceRoom.hostParticipantId,
    }));

    this.updateStats();
    // No automatic bot joining - private rooms are for real human players only
  }

  private async handleReady(message: any) {
    const { raceId, participantId } = message;
    console.log(`[WS] Ready message received for race ${raceId} from participant ${participantId}`);
    
    const raceRoom = this.races.get(raceId);
    if (!raceRoom) {
      console.log(`[WS] No race room found for race ${raceId}`);
      return;
    }

    // Only the host can start the race
    if (raceRoom.hostParticipantId && participantId !== raceRoom.hostParticipantId) {
      console.log(`[WS] Non-host ${participantId} tried to start race ${raceId} (host: ${raceRoom.hostParticipantId})`);
      // Find the client and notify them
      const client = raceRoom.clients.get(participantId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({
          type: "error",
          message: "Only the room host can start the race",
          code: "NOT_HOST"
        }));
      }
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
      participants = await storage.getRaceParticipants(raceId);
      if (race) {
        raceCache.setRace(race, participants);
      }
    }
    
    if (!race || race.status !== "waiting") return;

    // Duration is already set when room was created - no need to update here

    // Use connected clients (not DB participants) for live player count
    // This handles kicked/disconnected players correctly
    const connectedClients = Array.from(raceRoom.clients.values());
    const connectedHumans = connectedClients.filter(c => !c.isBot);
    
    // Minimum 2 human players required for multiplayer race (like TypeRacer)
    const requiredPlayers = 2;
    
    if (connectedHumans.length < requiredPlayers) {
      // Not enough connected human players
      const client = raceRoom.clients.get(participantId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        const needed = requiredPlayers - connectedHumans.length;
        client.ws.send(JSON.stringify({
          type: "error",
          message: `Need ${needed} more player${needed > 1 ? 's' : ''} to start. Share your room code with friends!`,
          code: "NOT_ENOUGH_PLAYERS"
        }));
      }
      return;
    }
    
    // Check if all connected human players are ready
    const allReady = connectedHumans.every(c => c.isReady);
    const notReadyPlayers = connectedHumans.filter(c => !c.isReady).map(c => c.username);
    
    if (!allReady) {
      // Notify the host that not everyone is ready
      const client = raceRoom.clients.get(participantId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({
          type: "error",
          message: `Waiting for players to ready up: ${notReadyPlayers.join(', ')}`,
          code: "PLAYERS_NOT_READY"
        }));
      }
      return;
    }
    
    await this.startCountdown(raceId);
  }

  private async handleReadyToggle(ws: WebSocket, message: any) {
    const { raceId, participantId } = message;
    const raceRoom = this.races.get(raceId);
    if (!raceRoom) return;

    const client = raceRoom.clients.get(participantId);
    if (!client) return;

    // Toggle ready state
    client.isReady = !client.isReady;

    // Collect ready states for all participants
    const readyStates: { participantId: number; isReady: boolean }[] = [];
    const clientEntries = Array.from(raceRoom.clients.entries());
    for (const [pId, c] of clientEntries) {
      readyStates.push({ participantId: pId, isReady: c.isReady });
    }

    // Broadcast ready state update to all clients
    this.broadcastToRace(raceId, {
      type: "ready_state_update",
      participantId,
      isReady: client.isReady,
      readyStates,
    });

    console.log(`[WS] Ready toggle: ${client.username} is now ${client.isReady ? 'ready' : 'not ready'} in race ${raceId}`);
  }

  private async handleKickPlayer(ws: WebSocket, message: any) {
    const { raceId, participantId, targetParticipantId } = message;
    const raceRoom = this.races.get(raceId);
    if (!raceRoom) return;

    // Only host can kick players
    if (raceRoom.hostParticipantId !== participantId) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Only the host can kick players",
        code: "NOT_HOST"
      }));
      return;
    }

    // Cannot kick yourself
    if (targetParticipantId === participantId) {
      ws.send(JSON.stringify({
        type: "error", 
        message: "You cannot kick yourself",
        code: "CANNOT_KICK_SELF"
      }));
      return;
    }

    const targetClient = raceRoom.clients.get(targetParticipantId);
    if (!targetClient) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Player not found",
        code: "PLAYER_NOT_FOUND"
      }));
      return;
    }

    const kickedUsername = targetClient.username;

    // Add to kicked list so they can't rejoin
    raceRoom.kickedPlayers.add(targetParticipantId);

    // Notify the kicked player
    if (targetClient.ws.readyState === WebSocket.OPEN) {
      targetClient.ws.send(JSON.stringify({
        type: "kicked",
        message: "You have been kicked from the room by the host"
      }));
      targetClient.ws.close();
    }

    // Remove from clients
    raceRoom.clients.delete(targetParticipantId);

    // Broadcast player kicked to remaining clients
    this.broadcastToRace(raceId, {
      type: "player_kicked",
      participantId: targetParticipantId,
      username: kickedUsername,
    });

    console.log(`[WS] Player kicked: ${kickedUsername} (${targetParticipantId}) from race ${raceId} by host`);
  }

  private async handleLockRoom(ws: WebSocket, message: any) {
    const { raceId, participantId, locked } = message;
    const raceRoom = this.races.get(raceId);
    if (!raceRoom) return;

    // Only host can lock/unlock room
    if (raceRoom.hostParticipantId !== participantId) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Only the host can lock/unlock the room",
        code: "NOT_HOST"
      }));
      return;
    }

    raceRoom.isLocked = locked;

    // Broadcast lock state to all clients
    this.broadcastToRace(raceId, {
      type: "room_lock_changed",
      isLocked: locked,
    });

    console.log(`[WS] Room ${raceId} ${locked ? 'locked' : 'unlocked'} by host`);
  }

  private async handleRematch(ws: WebSocket, message: any) {
    const { raceId, participantId } = message;
    const raceRoom = this.races.get(raceId);
    
    // Get the original race to copy settings
    let race = raceCache.getRace(raceId)?.race;
    if (!race) {
      race = await storage.getRace(raceId);
    }
    
    if (!race || race.status !== "finished") {
      ws.send(JSON.stringify({
        type: "error",
        message: "Can only request rematch after race is finished",
        code: "RACE_NOT_FINISHED"
      }));
      return;
    }

    // Generate a unique room code for the new race
    const generateRoomCode = (): string => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    const roomCode = generateRoomCode();

    // Create a new race with same settings
    const newRace = await storage.createRace({
      roomCode,
      creatorId: null, // Will be set when host joins
      status: "waiting",
      maxPlayers: race.maxPlayers,
      raceType: race.raceType,
      timeLimitSeconds: race.timeLimitSeconds,
    });

    // Broadcast rematch available to all players in the room
    if (raceRoom) {
      const clientsArray = Array.from(raceRoom.clients.values());
      for (const client of clientsArray) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: "rematch_available",
            newRaceId: newRace.id,
            roomCode: newRace.roomCode,
            createdBy: message.username || "A player",
          }));
        }
      }
    }

    console.log(`[WS] Rematch created: Race ${newRace.id} (${roomCode}) from race ${raceId}`);
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

    raceCache.updateRaceStatus(raceId, "countdown");

    this.broadcastToRace(raceId, {
      type: "countdown_start",
      countdown: 3,
      participants,
    });

    storage.updateRaceStatus(raceId, "countdown").catch(err => 
      console.error(`[WS] Failed to update race status to countdown:`, err)
    );

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
        
        // Store race start time for server-side timer validation
        raceRoom.raceStartTime = Date.now();
        
        this.broadcastToRace(raceId, {
          type: "race_start",
          serverTimestamp: raceRoom.raceStartTime,
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
            (botRaceId, botParticipantId, position) => this.handleBotFinished(botRaceId, botParticipantId, position),
            bot.username,
            freshRace.paragraphContent // Pass the actual paragraph text for character-level simulation
          );
        });

        // Set up server-side timer for timed races
        if (freshRace.raceType === "timed" && freshRace.timeLimitSeconds) {
          const timeLimit = freshRace.timeLimitSeconds * 1000;
          console.log(`[Timed Race] Setting server-side timer for race ${raceId}: ${freshRace.timeLimitSeconds}s`);
          
          raceRoom.timedRaceTimer = setTimeout(async () => {
            console.log(`[Timed Race] Server timer expired for race ${raceId}, force-finishing all participants`);
            await this.forceFinishTimedRace(raceId);
          }, timeLimit + 1000); // Add 1 second buffer for client-server latency
        }
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
      // Mark as finishing to prevent heartbeat cleanup during async operations
      const raceRoom = this.races.get(raceId);
      if (raceRoom) {
        raceRoom.isFinishing = true;
      }
      
      const updatedParticipants = freshParticipants;
      const finishedAt = new Date();
      await storage.updateRaceStatus(raceId, "finished", undefined, finishedAt);
      raceCache.updateRaceStatus(raceId, "finished", undefined, finishedAt);
      
      botService.stopAllBotsInRace(raceId, updatedParticipants);
      this.cleanupExtensionState(raceId);
      
      const sortedResults = updatedParticipants.sort((a, b) => (a.finishPosition || 999) - (b.finishPosition || 999));
      
      const enrichedResults = await this.enrichResultsWithRatings(sortedResults);
      
      console.log(`[Race Finish] Broadcasting race_finished for race ${raceId} with ${enrichedResults.length} results`);
      
      this.broadcastToRace(raceId, {
        type: "race_finished",
        results: enrichedResults,
      });

      this.processRaceCompletion(raceId, sortedResults).catch(err => {
        console.error(`[RaceFinish] Error processing race completion:`, err);
      });
      
      // Clean up race room AFTER broadcasting results
      setTimeout(() => {
        const raceRoom = this.races.get(raceId);
        if (raceRoom) {
          console.log(`[Race Finish] Cleaning up race room ${raceId} after results broadcast`);
          this.races.delete(raceId);
          this.cleanupExtensionState(raceId);
          this.updateStats();
        }
      }, 5000); // 5 second delay to allow reconnecting clients
    }
  }

  private async handleTimedFinish(message: any) {
    const { raceId, participantId, progress, errors } = message;
    
    console.log(`[Timed Finish] Participant ${participantId} finished timed race ${raceId}`);

    const cachedRace = raceCache.getRace(raceId);
    let race = cachedRace?.race;
    
    if (!race) {
      race = await storage.getRace(raceId);
    }

    if (!race || race.status === "finished") {
      return;
    }

    // Get race room for server-side timing validation
    const raceRoom = this.races.get(raceId);
    
    // SERVER-SIDE WPM CALCULATION (don't trust client values)
    // Use the race start time stored on the server
    const elapsedSeconds = raceRoom?.raceStartTime 
      ? (Date.now() - raceRoom.raceStartTime) / 1000
      : race.timeLimitSeconds || 60;
    
    // Calculate WPM based on server-side elapsed time and client progress
    const correctChars = Math.max(0, progress - errors);
    const serverCalculatedWpm = elapsedSeconds > 0 
      ? Math.round((correctChars / 5) / (elapsedSeconds / 60)) 
      : 0;
    
    // Calculate accuracy properly on server side
    const serverCalculatedAccuracy = progress > 0 
      ? Math.round((correctChars / progress) * 100 * 100) / 100
      : 100; // No typing = 100% accuracy (no errors made)
    
    // Validate progress is reasonable (max 15 chars per second is extremely fast)
    const maxReasonableProgress = Math.ceil(elapsedSeconds * 15);
    const validatedProgress = Math.min(progress, maxReasonableProgress);
    
    console.log(`[Timed Finish] Server validation: elapsed=${elapsedSeconds.toFixed(1)}s, progress=${progress}, validated=${validatedProgress}, serverWPM=${serverCalculatedWpm}, accuracy=${serverCalculatedAccuracy}`);

    // Update participant's final stats with SERVER-CALCULATED values
    await storage.updateParticipantProgress(participantId, validatedProgress, serverCalculatedWpm, serverCalculatedAccuracy, errors);
    raceCache.bufferProgress(participantId, validatedProgress, serverCalculatedWpm, serverCalculatedAccuracy, errors);

    // Mark participant as finished
    const { position, isNewFinish } = await storage.finishParticipant(participantId);

    if (!isNewFinish) {
      return;
    }

    raceCache.finishParticipant(raceId, participantId, position);

    this.broadcastToRace(raceId, {
      type: "participant_finished",
      participantId,
      position,
      wpm: serverCalculatedWpm,
      accuracy: serverCalculatedAccuracy,
    });

    // Check if all participants finished
    const freshParticipants = await storage.getRaceParticipants(raceId);
    const allFinished = freshParticipants.every(p => p.isFinished === 1);
    
    console.log(`[Timed Finish] All finished check: ${allFinished}, participants: ${freshParticipants.map(p => `${p.username}:${p.isFinished}`).join(', ')}`);

    if (allFinished) {
      // Clear server-side timed race timer if it exists
      const raceRoom = this.races.get(raceId);
      if (raceRoom) {
        // Mark as finishing BEFORE any async operations to prevent heartbeat cleanup
        raceRoom.isFinishing = true;
        
        if (raceRoom.timedRaceTimer) {
          clearTimeout(raceRoom.timedRaceTimer);
          raceRoom.timedRaceTimer = undefined;
        }
      }
      
      const finishedAt = new Date();
      await storage.updateRaceStatus(raceId, "finished", undefined, finishedAt);
      raceCache.updateRaceStatus(raceId, "finished", undefined, finishedAt);
      
      botService.stopAllBotsInRace(raceId, freshParticipants);
      this.cleanupExtensionState(raceId);
      
      // Sort by WPM for timed races (highest WPM wins)
      const sortedResults = freshParticipants.sort((a, b) => b.wpm - a.wpm);
      
      // Update and persist positions based on WPM ranking for timed races
      for (let i = 0; i < sortedResults.length; i++) {
        sortedResults[i].finishPosition = i + 1;
        await storage.updateParticipantFinishPosition(sortedResults[i].id, i + 1);
      }
      
      const enrichedResults = await this.enrichResultsWithRatings(sortedResults);
      
      console.log(`[Timed Finish] Broadcasting race_finished for race ${raceId} with ${enrichedResults.length} results`);
      
      this.broadcastToRace(raceId, {
        type: "race_finished",
        results: enrichedResults,
        isTimedRace: true,
      });

      this.processRaceCompletion(raceId, sortedResults).catch(err => {
        console.error(`[TimedRaceFinish] Error processing race completion:`, err);
      });
      
      // Clean up race room AFTER broadcasting results
      // Delay cleanup to allow any reconnecting clients to receive the results
      setTimeout(() => {
        const raceRoom = this.races.get(raceId);
        if (raceRoom) {
          console.log(`[Timed Finish] Cleaning up race room ${raceId} after results broadcast`);
          this.races.delete(raceId);
          this.cleanupExtensionState(raceId);
          this.updateStats();
        }
      }, 5000); // 5 second delay to allow reconnecting clients
    }
  }

  // Force finish a timed race when server timer expires (anti-cheat: don't trust client timer)
  private async forceFinishTimedRace(raceId: number) {
    // CRITICAL: Get race room and set isFinishing flag FIRST to prevent race condition with heartbeat
    const raceRoom = this.races.get(raceId);
    if (!raceRoom) {
      console.log(`[Timed Race] No race room found for ${raceId}`);
      return;
    }
    
    // Mark as finishing BEFORE any async operations to prevent heartbeat cleanup
    raceRoom.isFinishing = true;
    
    // Clear the timer
    if (raceRoom.timedRaceTimer) {
      clearTimeout(raceRoom.timedRaceTimer);
      raceRoom.timedRaceTimer = undefined;
    }

    const race = await storage.getRace(raceId);
    if (!race || race.status === "finished") {
      console.log(`[Timed Race] Race ${raceId} already finished, skipping force finish`);
      raceRoom.isFinishing = false;
      return;
    }

    console.log(`[Timed Race] Force finishing race ${raceId}`);

    const participants = await storage.getRaceParticipants(raceId);
    const elapsedSeconds = race.timeLimitSeconds || 60;

    // Finish all unfinished participants with their current progress
    for (const participant of participants) {
      if (participant.isFinished === 0) {
        // Calculate WPM based on their last known progress
        const correctChars = Math.max(0, participant.progress - participant.errors);
        const serverCalculatedWpm = elapsedSeconds > 0 
          ? Math.round((correctChars / 5) / (elapsedSeconds / 60)) 
          : 0;
        
        // Calculate accuracy properly: if no typing, 100% (no errors); otherwise calculate from progress
        const calculatedAccuracy = participant.progress > 0 
          ? Math.round((correctChars / participant.progress) * 100 * 100) / 100
          : 100; // No typing = 100% accuracy (no errors made)
        
        console.log(`[Timed Race] Force finishing participant ${participant.username}: progress=${participant.progress}, calculated WPM=${serverCalculatedWpm}, accuracy=${calculatedAccuracy}`);

        // Update with server-calculated values
        await storage.updateParticipantProgress(
          participant.id,
          participant.progress,
          serverCalculatedWpm,
          calculatedAccuracy,
          participant.errors
        );
        
        await storage.finishParticipant(participant.id);
        participant.wpm = serverCalculatedWpm;
        participant.accuracy = calculatedAccuracy;
        participant.isFinished = 1;
      }
    }

    // Update race status
    const finishedAt = new Date();
    await storage.updateRaceStatus(raceId, "finished", undefined, finishedAt);
    raceCache.updateRaceStatus(raceId, "finished", undefined, finishedAt);

    botService.stopAllBotsInRace(raceId, participants);
    this.cleanupExtensionState(raceId);

    // Sort by WPM for timed races (highest WPM wins)
    const sortedResults = participants.sort((a, b) => b.wpm - a.wpm);

    // Persist WPM-based rankings
    for (let i = 0; i < sortedResults.length; i++) {
      sortedResults[i].finishPosition = i + 1;
      await storage.updateParticipantFinishPosition(sortedResults[i].id, i + 1);
    }

    const enrichedResults = await this.enrichResultsWithRatings(sortedResults);

    console.log(`[Timed Race] Broadcasting race_finished for race ${raceId} with ${enrichedResults.length} results`);
    
    this.broadcastToRace(raceId, {
      type: "race_finished",
      results: enrichedResults,
      isTimedRace: true,
      serverEnforced: true,
    });

    this.processRaceCompletion(raceId, sortedResults).catch(err => {
      console.error(`[TimedRaceFinish] Error processing race completion:`, err);
    });
    
    // Clean up race room AFTER broadcasting results
    // Delay cleanup to allow any reconnecting clients to receive the results
    setTimeout(() => {
      const raceRoom = this.races.get(raceId);
      if (raceRoom) {
        console.log(`[Timed Race] Cleaning up race room ${raceId} after results broadcast`);
        this.races.delete(raceId);
        this.cleanupExtensionState(raceId);
        this.updateStats();
      }
    }, 5000); // 5 second delay to allow reconnecting clients
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
      // Mark as finishing to prevent heartbeat cleanup during async operations
      const raceRoom = this.races.get(raceId);
      if (raceRoom) {
        raceRoom.isFinishing = true;
      }
      
      const finishedAt = new Date();
      await storage.updateRaceStatus(raceId, "finished", undefined, finishedAt);
      raceCache.updateRaceStatus(raceId, "finished", undefined, finishedAt);
      
      botService.stopAllBotsInRace(raceId, freshParticipants);
      this.cleanupExtensionState(raceId);
      
      const sortedResults = freshParticipants.sort((a, b) => (a.finishPosition || 999) - (b.finishPosition || 999));
      
      console.log(`[Bot Finish] Broadcasting race_finished for race ${raceId}`);
      
      const enrichedResults = await this.enrichResultsWithRatings(sortedResults);
      
      this.broadcastToRace(raceId, {
        type: "race_finished",
        results: enrichedResults,
      });
      
      this.processRaceCompletion(raceId, sortedResults).catch(err => {
        console.error(`[RaceFinish] Error processing race completion:`, err);
      });
      
      // Clean up race room AFTER broadcasting results
      setTimeout(() => {
        const raceRoom = this.races.get(raceId);
        if (raceRoom) {
          console.log(`[Bot Finish] Cleaning up race room ${raceId} after results broadcast`);
          this.races.delete(raceId);
          this.cleanupExtensionState(raceId);
          this.updateStats();
        }
      }, 5000); // 5 second delay to allow reconnecting clients
    }
  }

  private async handleLeave(ws: WebSocket, message: any) {
    const { raceId, participantId, isRacing, progress, wpm, accuracy } = message;
    
    const raceRoom = this.races.get(raceId);
    let cachedRace = raceCache.getRace(raceId);
    let race = cachedRace?.race || await storage.getRace(raceId);
    
    // If leaving during an active race (racing or countdown), mark as DNF instead of deleting
    if (race && (race.status === "racing" || race.status === "countdown" || isRacing)) {
      console.log(`[WS Leave] Participant ${participantId} leaving active race ${raceId} - marking as DNF`);
      
      // Get participant info before updating
      const currentParticipants = await storage.getRaceParticipants(raceId);
      const participant = currentParticipants.find(p => p.id === participantId);
      const username = participant?.username || "Unknown";
      
      // Update progress first
      await storage.updateParticipantProgress(
        participantId, 
        progress || 0, 
        wpm || 0, 
        accuracy || 0, 
        0
      );
      
      // Mark as finished with DNF position (999 indicates DNF)
      await storage.updateParticipantFinishPosition(participantId, 999);
      
      // Also mark as finished in the database
      await storage.finishParticipant(participantId, raceId);
      
      // Update cache
      const participants = await storage.getRaceParticipants(raceId);
      raceCache.updateParticipants(raceId, participants);
      
      // Broadcast DNF status to other participants
      if (raceRoom) {
        this.broadcastToRace(raceId, {
          type: "participant_dnf",
          participantId,
          username,
        });
      }
    } else {
      // For waiting or finished races, just delete the participant
      await storage.deleteRaceParticipant(participantId);
      raceCache.removeParticipant(raceId, participantId);
      
      if (raceRoom) {
        this.broadcastToRace(raceId, {
          type: "participant_left",
          participantId,
        });
      }
    }
    
    raceCache.clearProgressBuffer(participantId);
    
    if (raceRoom) {
      raceRoom.clients.delete(participantId);
      
      // Host transfer: If the leaving player was the host, transfer to next available player
      if (raceRoom.hostParticipantId === participantId && raceRoom.clients.size > 0) {
        const nextHostId = Array.from(raceRoom.clients.keys())[0];
        raceRoom.hostParticipantId = nextHostId;
        const newHostClient = raceRoom.clients.get(nextHostId);
        console.log(`[WS] Host transferred to ${newHostClient?.username || nextHostId} for race ${raceId}`);
        
        this.broadcastToRace(raceId, {
          type: "host_changed",
          newHostParticipantId: nextHostId,
          message: `${newHostClient?.username || 'A player'} is now the host`,
        });
      }
      
      if (raceRoom.clients.size === 0) {
        // Don't clean up if race is finishing
        if (raceRoom.isFinishing) {
          console.log(`[WS Leave] Keeping race room ${raceId} alive - race is finishing`);
          this.updateStats();
          return;
        }
        
        // Don't clean up if timed race timer is active
        if (raceRoom.timedRaceTimer) {
          console.log(`[WS Leave] Keeping race room ${raceId} alive - timed race timer active`);
          this.updateStats();
          return;
        }
        
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

  private chatRateLimits: Map<number, number> = new Map(); // participantId -> last message timestamp
  private readonly CHAT_RATE_LIMIT_MS = 2000; // 2 seconds between messages

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

    // Rate limiting: 1 message per 2 seconds
    // Ensure participantId is a number for consistent Map key lookups
    const participantIdNum = typeof participantId === 'string' ? parseInt(participantId, 10) : participantId;
    const now = Date.now();
    const lastMessageTime = this.chatRateLimits.get(participantIdNum) || 0;
    const timeSinceLastMessage = now - lastMessageTime;
    
    if (timeSinceLastMessage < this.CHAT_RATE_LIMIT_MS) {
      const waitTime = Math.ceil((this.CHAT_RATE_LIMIT_MS - timeSinceLastMessage) / 1000);
      ws.send(JSON.stringify({ 
        type: "error", 
        message: `Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before sending another message`,
        code: "CHAT_RATE_LIMITED"
      }));
      return;
    }
    
    // Update last message timestamp
    this.chatRateLimits.set(participantIdNum, now);

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

  private botChatCooldowns: Map<number, number> = new Map(); // per-bot cooldowns
  private raceBurstWindow: Map<number, { count: number; expiresAt: number }> = new Map();
  private readonly BOT_CHAT_COOLDOWN_MS = 6000; // 6 seconds per bot
  private readonly RACE_BURST_LIMIT = 5; // max 5 bot messages per window
  private readonly RACE_BURST_WINDOW_MS = 8000; // 8 second window

  private async triggerBotChatResponses(raceId: number, message: string, senderIsBot: boolean = false, chainDepth: number = 0) {
    try {
      console.log(`[Bot Chat] Triggered for race ${raceId}: "${message.substring(0, 30)}..." (isBot=${senderIsBot}, depth=${chainDepth})`);
      
      const race = await storage.getRace(raceId);
      if (!race) {
        console.log(`[Bot Chat] Race ${raceId} not found`);
        return;
      }

      if (race.status === "finished" || race.status === "abandoned") {
        console.log(`[Bot Chat] Race ${raceId} is ${race.status}`);
        return;
      }

      // Limit chain depth to prevent infinite bot loops
      if (chainDepth >= 2) {
        console.log(`[Bot Chat] Chain depth ${chainDepth} reached, stopping`);
        return;
      }

      // Check race burst limit
      const now = Date.now();
      const burst = this.raceBurstWindow.get(raceId);
      if (burst && now < burst.expiresAt) {
        if (burst.count >= this.RACE_BURST_LIMIT) {
          console.log(`[Bot Chat] Race ${raceId} hit burst limit (${burst.count}/${this.RACE_BURST_LIMIT})`);
          return;
        }
        console.log(`[Bot Chat] Burst window active: ${burst.count}/${this.RACE_BURST_LIMIT}`);
      } else {
        console.log(`[Bot Chat] New burst window started`);
        this.raceBurstWindow.set(raceId, { count: 0, expiresAt: now + this.RACE_BURST_WINDOW_MS });
      }

      const participants = await storage.getRaceParticipants(raceId);
      const botParticipants = participants.filter(p => p.isBot === 1);

      console.log(`[Bot Chat] Found ${botParticipants.length} bots in race`);

      if (botParticipants.length === 0) return;

      // Filter bots by per-bot cooldown
      const eligibleBots = botParticipants.filter(bot => {
        const lastChat = this.botChatCooldowns.get(bot.id) || 0;
        const elapsed = now - lastChat;
        const isEligible = elapsed >= this.BOT_CHAT_COOLDOWN_MS;
        console.log(`[Bot Chat] Bot ${bot.username} (${bot.id}): lastChat=${lastChat}, elapsed=${elapsed}ms, eligible=${isEligible}`);
        return isEligible;
      });

      if (eligibleBots.length === 0) {
        console.log(`[Bot Chat] No eligible bots (all on cooldown)`);
        return;
      }
      
      console.log(`[Bot Chat] ${eligibleBots.length} bots eligible to respond`);

      // Small chance no one responds (like real group chats)
      // 10% chance no one responds
      if (Math.random() < 0.10) {
        console.log(`[Bot Chat] No one responded (realistic silence)`);
        return;
      }
      
      // If sender is bot, 60% chance to skip (bots don't always reply to bots)
      if (senderIsBot && Math.random() < 0.6) {
        console.log(`[Bot Chat] Skipping bot-to-bot response (random)`);
        return;
      }

      // Realistic distribution: 50% chance 1 bot, 35% chance 2 bots, 15% chance 3 bots
      const roll = Math.random();
      let numResponders: number;
      if (roll < 0.50) {
        numResponders = 1;
      } else if (roll < 0.85) {
        numResponders = Math.min(2, eligibleBots.length);
      } else {
        numResponders = Math.min(3, eligibleBots.length);
      }
      
      // For bot chains, max 1-2 responders
      if (senderIsBot) {
        numResponders = Math.min(numResponders, Math.random() < 0.7 ? 1 : 2);
      }

      // Shuffle and select bots
      const shuffled = [...eligibleBots].sort(() => Math.random() - 0.5);
      const respondingBots = shuffled.slice(0, numResponders);

      console.log(`[Bot Chat] ${respondingBots.length} bots will respond to: "${message.substring(0, 30)}..."`);

      // Schedule staggered responses with quick timing
      respondingBots.forEach((bot, index) => {
        // Fast response delays like texting friends
        const typingSpeed = Math.random();
        let delay: number;
        
        if (typingSpeed < 0.5) {
          // Quick responder (50%) - 0.8-1.5s
          delay = 800 + Math.random() * 700;
        } else if (typingSpeed < 0.8) {
          // Normal responder (30%) - 1.5-2.5s
          delay = 1500 + Math.random() * 1000;
        } else {
          // Slower responder (20%) - 2.5-4s
          delay = 2500 + Math.random() * 1500;
        }
        
        // Add stagger for multiple responders (0.5-1s between each)
        delay += index * (500 + Math.random() * 500);

        this.botChatCooldowns.set(bot.id, now);

        setTimeout(async () => {
          await this.sendBotChatMessage(raceId, bot, message, chainDepth);
        }, delay);
      });

      // Update burst counter
      const currentBurst = this.raceBurstWindow.get(raceId)!;
      currentBurst.count += respondingBots.length;

    } catch (error) {
      console.error("[Bot Chat] Error:", error);
    }
  }

  private async sendBotChatMessage(raceId: number, bot: any, userMessage: string, chainDepth: number) {
    try {
      const race = await storage.getRace(raceId);
      if (!race || race.status === "finished" || race.status === "abandoned") return;

      // Try AI first, always fallback to casual response
      let response = await this.generateAIBotResponse(userMessage, bot.username);
      
      if (!response) {
        const intent = this.detectMessageIntent(userMessage);
        response = this.getContextualResponse(intent);
        console.log(`[Bot Chat] Using fallback for ${bot.username}: "${response}"`);
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
        },
      });

      console.log(`[Bot Chat] ${bot.username}: "${response}"`);

      // Trigger bot-to-bot response chain (with reduced probability)
      if (chainDepth < 1 && Math.random() < 0.3) {
        setTimeout(() => {
          this.triggerBotChatResponses(raceId, response!, true, chainDepth + 1);
        }, 2000 + Math.random() * 2000);
      }

    } catch (error) {
      console.error("[Bot Chat] Send error:", error);
    }
  }

  private async generateAIBotResponse(userMessage: string, botName: string): Promise<string | null> {
    // Random personality for this response
    const personalities = [
      { style: "hyped", desc: "super excited and energetic, uses caps sometimes, lots of emojis" },
      { style: "chill", desc: "laid back and cool, minimal words, very casual" },
      { style: "competitive", desc: "playfully trash-talking, confident, wants to win" },
      { style: "friendly", desc: "warm and supportive, encouraging others" },
      { style: "quiet", desc: "few words, observant, occasional short comment" },
      { style: "funny", desc: "jokes around, uses humor, playful teasing" },
    ];
    const personality = personalities[Math.floor(Math.random() * personalities.length)];
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You're ${botName} in a typing race game chat. Personality: ${personality.style} - ${personality.desc}

BE HUMAN - text like you're in a group chat with friends:
- 2-8 words max, super short
- Use: lol, haha, nah, yoo, bet, fr, lowkey, ngl, gg, rip, damn, nice, bruh, yo
- Skip punctuation, lowercase mostly
- Emoji only sometimes (30% of messages)
- Can have small typos occasionally
- React naturally - agree, disagree, joke, ignore parts
- Don't always directly answer - sometimes just react
- Match their energy or contrast it

${personality.style === 'hyped' ? 'Examples: "LETS GOOO", "yooo im ready 🔥", "this is gonna be good"' : ''}
${personality.style === 'chill' ? 'Examples: "yea", "cool", "aight", "we chilling"' : ''}
${personality.style === 'competitive' ? 'Examples: "ez clap", "yall arent ready", "watch me", "too slow 😤"' : ''}
${personality.style === 'friendly' ? 'Examples: "gl everyone!", "u got this", "have fun yall"' : ''}
${personality.style === 'quiet' ? 'Examples: "yo", "hm", "nice", "k"' : ''}
${personality.style === 'funny' ? 'Examples: "lmao", "bro what 😂", "im literally so bad", "rip my fingers"' : ''}

NEVER sound like AI. No "I'd be happy to" or formal language.`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        max_tokens: 20,
        temperature: 1.1,
      });

      const reply = response.choices[0]?.message?.content?.trim();
      if (reply && reply.length > 0 && reply.length < 60) {
        console.log(`[Bot Chat AI] ${botName} (${personality.style}): "${reply}"`);
        return reply;
      }
      return null;
    } catch (error) {
      console.error("[Bot Chat AI] OpenAI error:", error);
      return null;
    }
  }

  private getContextualResponse(intent: string): string {
    const responses: Record<string, string[]> = {
      greetings: [
        "yo", "yoo", "heyyy", "sup", "ayy", "hey", "yooo",
        "yo whats up", "heyy", "wassup", "hi", "ayy whats good",
      ],
      goodLuck: [
        "gl", "u2", "same", "ty", "gl gl", "thanks u too",
        "haha gl", "yea gl", "🍀", "gl everyone",
      ],
      finishing: [
        "gg", "ggs", "gg wp", "good game", "nice race",
        "that was fun", "gg everyone", "wp", "good one",
      ],
      reactions: [
        "fr", "lol", "haha", "nice", "damn", "yea",
        "true", "facts", "ikr", "real", "same", "mood",
      ],
      competitive: [
        "lets go", "ez", "bet", "watch", "im ready",
        "bring it", "too ez", "😤", "we'll see", "ok bet",
      ],
      encouragement: [
        "u got this", "lets get it", "we got this", "go go",
        "cmon", "yea", "lets gooo", "💪",
      ],
      question: [
        "idk", "maybe", "hm", "who knows", "lol idk",
        "not sure", "🤷", "we'll see",
      ],
      casual: [
        "yea", "lol", "haha", "nice", "ok", "bet", "fr",
        "true", "aight", "cool", "k", "ye", "word", "fasho",
      ],
    };

    const categoryResponses = responses[intent] || responses.casual;
    return categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
  }

  private detectMessageIntent(content: string): string {
    const lower = content.toLowerCase();
    
    if (/\b(hi|hello|hey|sup|yo|hola|greetings|what'?s up)\b/.test(lower)) {
      return 'greetings';
    }
    if (/\b(good\s*luck|gl|best of luck|fingers crossed|luck)\b/.test(lower)) {
      return 'goodLuck';
    }
    if (/\b(gg|good\s*game|well\s*played|nice\s*race|great\s*race|congrat)\b/.test(lower)) {
      return 'finishing';
    }
    if (/\b(nice|great|awesome|cool|wow|amazing|impressive|sick|fire)\b/.test(lower)) {
      return 'reactions';
    }
    if (/\b(let'?s\s*go|come\s*on|race|challenge|beat|fast|ready|start|bring)\b/.test(lower)) {
      return 'competitive';
    }
    if (/\b(you\s*can|keep|going|try|practice|effort|hope|wish)\b/.test(lower)) {
      return 'encouragement';
    }
    if (/\?/.test(lower)) {
      return 'question';
    }
    
    return 'casual';
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
          
          // Host transfer: If disconnected player was host, transfer to next available
          if (raceRoom.hostParticipantId === participantId && raceRoom.clients.size > 0) {
            const nextHostId = Array.from(raceRoom.clients.keys())[0];
            raceRoom.hostParticipantId = nextHostId;
            const newHostClient = raceRoom.clients.get(nextHostId);
            console.log(`[WS] Host transferred to ${newHostClient?.username || nextHostId} after disconnect`);
            
            this.broadcastToRace(raceId, {
              type: "host_changed",
              newHostParticipantId: nextHostId,
              message: `${newHostClient?.username || 'A player'} is now the host`,
            });
          }

          if (raceRoom.clients.size === 0) {
            // NEVER clean up a race that is currently finishing - prevents race condition
            if (raceRoom.isFinishing) {
              console.log(`[WS Disconnect] Keeping race room ${raceId} alive - race is finishing`);
              this.updateStats();
              return;
            }
            
            // For timed races that are still racing, DON'T delete the room - let the timer complete
            // This ensures results are broadcast even if all clients disconnect
            if (raceRoom.timedRaceTimer) {
              console.log(`[WS Disconnect] Keeping race room ${raceId} alive - timed race timer active`);
              // Keep the race room and timer alive - it will clean up after broadcasting results
              this.updateStats();
              return;
            }
            
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
    if (!raceRoom) {
      console.log(`[WS Broadcast] No race room for race ${raceId}`);
      return;
    }

    const data = JSON.stringify(message);
    let sentCount = 0;
    raceRoom.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
        sentCount++;
      }
    });
    
    if (message.type === "countdown_start" || message.type === "countdown" || message.type === "race_start") {
      console.log(`[WS Broadcast] Sent ${message.type} to ${sentCount}/${raceRoom.clients.size} clients in race ${raceId}`);
    }
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
