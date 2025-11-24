import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { botService } from "./bot-service";
import type { Server } from "http";

interface RaceClient {
  ws: WebSocket;
  raceId: number;
  participantId: number;
  username: string;
}

interface RaceRoom {
  raceId: number;
  clients: Map<number, RaceClient>;
  countdownTimer?: NodeJS.Timeout;
}

class RaceWebSocketServer {
  private wss: WebSocketServer | null = null;
  private races: Map<number, RaceRoom> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws/race" });

    this.wss.on("connection", (ws: WebSocket) => {
      console.log("New WebSocket connection");

      ws.on("message", async (data: string) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error("WebSocket message error:", error);
          ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
        }
      });

      ws.on("close", () => {
        this.handleDisconnect(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });

    console.log("WebSocket server initialized");
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

    const race = await storage.getRace(raceId);
    if (!race) {
      ws.send(JSON.stringify({ type: "error", message: "Race not found" }));
      return;
    }

    let raceRoom = this.races.get(raceId);
    if (!raceRoom) {
      raceRoom = {
        raceId,
        clients: new Map(),
      };
      this.races.set(raceId, raceRoom);
    }

    const client: RaceClient = { ws, raceId, participantId, username };
    raceRoom.clients.set(participantId, client);

    let participants = await storage.getRaceParticipants(raceId);
    let participant = participants.find(p => p.id === participantId);
    
    // If not found, refetch to handle reactivation timing issue
    if (!participant) {
      participants = await storage.getRaceParticipants(raceId);
      participant = participants.find(p => p.id === participantId);
    }
    
    this.broadcastToRace(raceId, {
      type: "participant_joined",
      participant,
      participants,
    });

    ws.send(JSON.stringify({
      type: "joined",
      race,
      participants,
    }));
  }

  private async handleReady(message: any) {
    const { raceId } = message;
    const raceRoom = this.races.get(raceId);
    if (!raceRoom) return;

    const participants = await storage.getRaceParticipants(raceId);
    const race = await storage.getRace(raceId);
    
    if (!race || race.status !== "waiting") return;

    const requiredPlayers = Math.min(2, race.maxPlayers);
    
    if (participants.length >= requiredPlayers) {
      await this.startCountdown(raceId);
    }
  }

  private async startCountdown(raceId: number) {
    const raceRoom = this.races.get(raceId);
    if (!raceRoom) return;

    const race = await storage.getRace(raceId);
    if (!race) return;

    let participants = await storage.getRaceParticipants(raceId);
    const humanCount = participants.filter(p => p.isBot === 0).length;
    
    if (humanCount > 0 && participants.length < race.maxPlayers) {
      const botsNeeded = Math.min(
        race.maxPlayers - participants.length,
        Math.max(1, race.maxPlayers - humanCount - 1)
      );
      
      if (botsNeeded > 0) {
        const bots = await botService.addBotsToRace(raceId, botsNeeded);
        
        this.broadcastToRace(raceId, {
          type: "bots_added",
          bots,
        });
        
        participants = await storage.getRaceParticipants(raceId);
      }
    }

    await storage.updateRaceStatus(raceId, "countdown");

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
        await storage.updateRaceStatus(raceId, "racing", new Date());
        
        this.broadcastToRace(raceId, {
          type: "race_start",
        });

        const allParticipants = await storage.getRaceParticipants(raceId);
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

    await storage.updateParticipantProgress(participantId, progress, wpm, accuracy, errors);

    const raceId = this.findRaceIdByParticipant(participantId);
    if (raceId) {
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

    const race = await storage.getRace(raceId);
    if (!race || race.status === "finished") {
      return;
    }

    const participants = await storage.getRaceParticipants(raceId);
    const participant = participants.find(p => p.id === participantId);
    
    if (!participant) {
      return;
    }

    const { position, isNewFinish } = await storage.finishParticipant(participantId);

    if (!isNewFinish) {
      return;
    }

    this.broadcastToRace(raceId, {
      type: "participant_finished",
      participantId,
      position,
    });

    const updatedParticipants = await storage.getRaceParticipants(raceId);
    const allFinished = updatedParticipants.every(p => p.isFinished === 1);

    if (allFinished) {
      await storage.updateRaceStatus(raceId, "finished", undefined, new Date());
      
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
}

export const raceWebSocket = new RaceWebSocketServer();
