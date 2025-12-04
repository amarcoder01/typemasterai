import { storage } from "./storage";
import type { RaceParticipant } from "@shared/schema";
import { botNamePool } from "./bot-name-pool";

const avatarColors = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-cyan-500",
];

interface BotProfile {
  username: string;
  avatarColor: string;
  targetWPM: number;
  accuracy: number;
  personality: 'friendly' | 'competitive' | 'casual' | 'encouraging';
  lastChatTime: number;
}

const BOT_CHAT_RESPONSES = {
  greetings: [
    "yoo 👋",
    "heyyy",
    "yo whats up",
    "heyy ready to go?",
    "sup!",
    "ayy whats good",
  ],
  encouragement: [
    "we got this",
    "lets get it!",
    "keep going 💪",
    "u got it",
    "nice nice",
  ],
  competitive: [
    "lets gooo 💪",
    "oh its on",
    "bet 🏁",
    "bring it lol",
    "we'll see about that 😤",
    "im ready",
  ],
  casual: [
    "haha yea",
    "fr",
    "lol",
    "true",
    "bet",
    "nice 🚀",
  ],
  reactions: [
    "fr fr 😄",
    "haha ikr",
    "lol yea",
    "haha yess",
    "facts 🔥",
  ],
  goodLuck: [
    "gl to u too 🍀",
    "haha thanks u2",
    "same to u!",
    "ty lets gooo 🔥",
    "gl gl",
  ],
  finishing: [
    "gg that was fun",
    "gg everyone!",
    "gg wp 👏",
    "good race fr",
    "lol that was intense",
  ],
};

const BOT_PERSONALITIES = ['friendly', 'competitive', 'casual', 'encouraging'] as const;

class BotService {
  private activeBots: Map<number, NodeJS.Timeout> = new Map();
  private botProfiles: Map<number, BotProfile> = new Map();
  private botParagraphLengths: Map<number, number> = new Map();

  async generateUniqueBotNames(count: number): Promise<string[]> {
    return botNamePool.getRandomNames(count);
  }

  async addBotsToRace(raceId: number, botCount: number): Promise<RaceParticipant[]> {
    const botNames = await this.generateUniqueBotNames(botCount);
    const bots: RaceParticipant[] = [];

    for (const name of botNames) {
      const profile = this.createBotProfile(name);
      
      const bot = await storage.createRaceParticipant({
        raceId,
        username: name,
        avatarColor: profile.avatarColor,
        isBot: 1,
        progress: 0,
        wpm: 0,
        accuracy: 0,
        errors: 0,
        isFinished: 0,
      });

      this.botProfiles.set(bot.id, profile);
      bots.push(bot);
    }

    return bots;
  }

  private createBotProfile(username: string): BotProfile {
    const skillLevels = [
      { targetWPM: 35, accuracy: 88, weight: 2 },
      { targetWPM: 45, accuracy: 90, weight: 3 },
      { targetWPM: 55, accuracy: 92, weight: 4 },
      { targetWPM: 65, accuracy: 94, weight: 4 },
      { targetWPM: 75, accuracy: 95, weight: 3 },
      { targetWPM: 85, accuracy: 96, weight: 2 },
      { targetWPM: 95, accuracy: 97, weight: 2 },
      { targetWPM: 110, accuracy: 98, weight: 1 },
      { targetWPM: 125, accuracy: 98.5, weight: 1 },
    ];

    const totalWeight = skillLevels.reduce((sum, level) => sum + level.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedSkill = skillLevels[0];
    
    for (const level of skillLevels) {
      random -= level.weight;
      if (random <= 0) {
        selectedSkill = level;
        break;
      }
    }
    
    const wpmVariation = Math.random() * 20 - 10;
    const accuracyVariation = Math.random() * 4 - 2;
    const personality = BOT_PERSONALITIES[Math.floor(Math.random() * BOT_PERSONALITIES.length)];

    return {
      username,
      avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
      targetWPM: Math.max(25, Math.round(selectedSkill.targetWPM + wpmVariation)),
      accuracy: Math.max(85, Math.min(99.5, selectedSkill.accuracy + accuracyVariation)),
      personality,
      lastChatTime: 0,
    };
  }

  startBotTyping(
    participantId: number,
    raceId: number,
    paragraphLength: number,
    broadcastCallback: (data: any) => void,
    onBotFinished?: (raceId: number, participantId: number, position: number) => void,
    botUsername?: string
  ) {
    let profile = this.botProfiles.get(participantId);
    if (!profile) {
      if (botUsername) {
        console.log(`[Bot Typing] Recreating profile for bot ${participantId} (${botUsername})`);
        profile = this.createBotProfile(botUsername);
        this.botProfiles.set(participantId, profile);
      } else {
        console.error(`[Bot Typing] No profile found for bot ${participantId} and no username provided. Known profiles: ${Array.from(this.botProfiles.keys()).join(', ')}`);
        return;
      }
    }
    console.log(`[Bot Typing] Bot ${profile.username} (${participantId}) starting with target ${profile.targetWPM} WPM, paragraph length ${paragraphLength}`);

    this.botParagraphLengths.set(participantId, paragraphLength);
    const baseDelay = 60000 / (profile.targetWPM * 5);
    
    let currentProgress = 0;
    let currentErrors = 0;
    let startTime = Date.now();

    const simulate = async () => {
      if (!this.botProfiles.has(participantId)) {
        console.log(`[Bot Typing] Bot ${participantId} profile removed, stopping simulation`);
        return;
      }

      const currentParagraphLength = this.botParagraphLengths.get(participantId) || paragraphLength;

      if (currentProgress >= currentParagraphLength) {
        this.stopBotTyping(participantId);
        
        const { position, isNewFinish } = await storage.finishParticipant(participantId);
        
        if (!isNewFinish) {
          return;
        }

        broadcastCallback({
          type: "progress_update",
          participantId,
          progress: currentParagraphLength,
          wpm: profile.targetWPM,
          accuracy: profile.accuracy,
          errors: currentErrors,
        });

        broadcastCallback({
          type: "participant_finished",
          participantId,
          position,
        });
        
        // Notify the race system that a bot finished so it can check if all participants are done
        if (onBotFinished) {
          onBotFinished(raceId, participantId, position);
        }
        
        return;
      }

      const burstSize = Math.floor(Math.random() * 4) + 1;
      currentProgress = Math.min(currentParagraphLength, currentProgress + burstSize);

      if (Math.random() * 100 > profile.accuracy) {
        currentErrors++;
      }

      const elapsed = (Date.now() - startTime) / 60000;
      const currentWPM = Math.round((currentProgress / 5) / elapsed);
      
      const wpmWithVariance = Math.max(
        profile.targetWPM - 15,
        Math.min(profile.targetWPM + 15, currentWPM)
      );

      const currentAccuracy = ((currentProgress - currentErrors) / currentProgress) * 100;

      await storage.updateParticipantProgress(
        participantId,
        currentProgress,
        Math.round(wpmWithVariance),
        Math.round(currentAccuracy * 100) / 100,
        currentErrors
      );

      broadcastCallback({
        type: "progress_update",
        participantId,
        progress: currentProgress,
        wpm: Math.round(wpmWithVariance),
        accuracy: Math.round(currentAccuracy * 100) / 100,
        errors: currentErrors,
      });

      const humanDelay = baseDelay * (0.7 + Math.random() * 0.6);
      const pauseChance = Math.random();
      let nextDelay = humanDelay;

      if (pauseChance < 0.05) {
        nextDelay = humanDelay * (3 + Math.random() * 5);
      } else if (pauseChance < 0.15) {
        nextDelay = humanDelay * (1.5 + Math.random() * 1.5);
      }

      const timer = setTimeout(simulate, nextDelay);
      this.activeBots.set(participantId, timer);
    };

    const initialDelay = Math.random() * 500 + 200;
    const timer = setTimeout(simulate, initialDelay);
    this.activeBots.set(participantId, timer);
  }

  stopBotTyping(participantId: number) {
    const timer = this.activeBots.get(participantId);
    if (timer) {
      clearTimeout(timer);
      this.activeBots.delete(participantId);
    }
    this.botProfiles.delete(participantId);
    this.botParagraphLengths.delete(participantId);
  }

  stopAllBotsInRace(raceId: number, participants: RaceParticipant[]) {
    participants.forEach(p => {
      if (p.isBot === 1) {
        this.stopBotTyping(p.id);
      }
    });
  }

  updateParagraphLength(participantId: number, newLength: number): void {
    if (this.botProfiles.has(participantId)) {
      this.botParagraphLengths.set(participantId, newLength);
      console.log(`[Bot Typing] Updated paragraph length for bot ${participantId} to ${newLength}`);
    }
  }

  private getRandomResponse(category: keyof typeof BOT_CHAT_RESPONSES): string {
    const responses = BOT_CHAT_RESPONSES[category];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private detectMessageIntent(content: string): keyof typeof BOT_CHAT_RESPONSES {
    const lower = content.toLowerCase();
    
    if (/\b(hi|hello|hey|sup|yo|hola|greetings)\b/.test(lower)) {
      return 'greetings';
    }
    if (/\b(good\s*luck|gl|best of luck|fingers crossed)\b/.test(lower)) {
      return 'goodLuck';
    }
    if (/\b(gg|good\s*game|well\s*played|nice\s*race|great\s*race)\b/.test(lower)) {
      return 'finishing';
    }
    if (/\b(nice|great|awesome|cool|wow|amazing|impressive)\b/.test(lower)) {
      return 'reactions';
    }
    if (/\b(let'?s\s*go|come\s*on|race|challenge|beat|fast)\b/.test(lower)) {
      return 'competitive';
    }
    if (/\b(you\s*can|keep|going|try|practice|effort)\b/.test(lower)) {
      return 'encouragement';
    }
    
    return 'casual';
  }

  generateBotChatResponse(
    participantId: number,
    incomingContent: string,
    raceStatus: string
  ): { shouldRespond: boolean; response?: string; botUsername?: string } {
    const profile = this.botProfiles.get(participantId);
    if (!profile) {
      return { shouldRespond: false };
    }

    const now = Date.now();
    const timeSinceLastChat = now - profile.lastChatTime;
    const MIN_CHAT_INTERVAL = 15000;
    
    if (timeSinceLastChat < MIN_CHAT_INTERVAL) {
      return { shouldRespond: false };
    }

    // 95% response rate for more reliable chat experience
    const responseChance = 0.95;

    if (Math.random() > responseChance) {
      return { shouldRespond: false };
    }

    let responseCategory = this.detectMessageIntent(incomingContent);
    
    if (profile.personality === 'competitive' && Math.random() > 0.5) {
      responseCategory = 'competitive';
    } else if (profile.personality === 'encouraging' && Math.random() > 0.5) {
      responseCategory = 'encouragement';
    }

    profile.lastChatTime = now;

    return {
      shouldRespond: true,
      response: this.getRandomResponse(responseCategory),
      botUsername: profile.username,
    };
  }

  getBotsInRace(participantIds: number[]): { participantId: number; username: string }[] {
    const bots: { participantId: number; username: string }[] = [];
    for (const id of participantIds) {
      const profile = this.botProfiles.get(id);
      if (profile) {
        bots.push({ participantId: id, username: profile.username });
      }
    }
    return bots;
  }

  isBot(participantId: number): boolean {
    return this.botProfiles.has(participantId);
  }

  getBotProfile(participantId: number): BotProfile | undefined {
    return this.botProfiles.get(participantId);
  }
}

export const botService = new BotService();
