import OpenAI from "openai";
import { storage } from "./storage";
import type { RaceParticipant } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
}

class BotService {
  private activeBots: Map<number, NodeJS.Timeout> = new Map();
  private botProfiles: Map<number, BotProfile> = new Map();

  async generateUniqueBotNames(count: number): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a creative username generator. Generate unique, believable usernames for typing test competitors. Mix casual gamers, professionals, and creative names. Make them feel authentic and diverse.",
          },
          {
            role: "user",
            content: `Generate ${count} unique, creative usernames for typing race competitors. Each should be 8-15 characters, memorable, and feel like real people. Include variety: some professional (like DevMaster, CodeNinja), some casual (like QuickFingers, TypeKing), some playful (like KeyboardWarrior, SwiftTyper). Return ONLY the usernames, one per line, no numbering or extra text.`,
          },
        ],
        temperature: 1.2,
        max_tokens: 200,
      });

      const names = response.choices[0].message.content
        ?.trim()
        .split("\n")
        .map(name => name.trim())
        .filter(name => name.length >= 3 && name.length <= 20)
        .slice(0, count) || [];

      if (names.length < count) {
        const fallbackNames = this.generateFallbackNames(count - names.length);
        return [...names, ...fallbackNames];
      }

      return names;
    } catch (error) {
      console.error("Error generating bot names with OpenAI:", error);
      return this.generateFallbackNames(count);
    }
  }

  private generateFallbackNames(count: number): string[] {
    const prefixes = ["Speed", "Quick", "Fast", "Swift", "Rapid", "Turbo", "Pro", "Elite", "Master", "Expert"];
    const suffixes = ["Typer", "Fingers", "Keys", "Racer", "Champion", "Wizard", "Ninja", "Ace", "Star", "Legend"];
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      const number = Math.floor(Math.random() * 999);
      names.push(`${prefix}${suffix}${number > 99 ? number : ""}`);
    }

    return names;
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
      { targetWPM: 35, accuracy: 92 },
      { targetWPM: 50, accuracy: 94 },
      { targetWPM: 65, accuracy: 96 },
      { targetWPM: 80, accuracy: 97 },
      { targetWPM: 95, accuracy: 98 },
      { targetWPM: 110, accuracy: 98.5 },
      { targetWPM: 130, accuracy: 99 },
    ];

    const skill = skillLevels[Math.floor(Math.random() * skillLevels.length)];
    
    const wpmVariation = Math.random() * 15 - 7.5;
    const accuracyVariation = Math.random() * 3 - 1.5;

    return {
      username,
      avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
      targetWPM: Math.max(30, Math.round(skill.targetWPM + wpmVariation)),
      accuracy: Math.max(88, Math.min(100, skill.accuracy + accuracyVariation)),
    };
  }

  startBotTyping(
    participantId: number,
    raceId: number,
    paragraphLength: number,
    broadcastCallback: (data: any) => void
  ) {
    const profile = this.botProfiles.get(participantId);
    if (!profile) return;

    const baseDelay = 60000 / (profile.targetWPM * 5);
    
    let currentProgress = 0;
    let currentErrors = 0;
    let startTime = Date.now();

    const simulate = async () => {
      if (!this.botProfiles.has(participantId)) {
        return;
      }

      if (currentProgress >= paragraphLength) {
        this.stopBotTyping(participantId);
        
        const { position, isNewFinish } = await storage.finishParticipant(participantId);
        
        if (!isNewFinish) {
          return;
        }

        broadcastCallback({
          type: "progress_update",
          participantId,
          progress: paragraphLength,
          wpm: profile.targetWPM,
          accuracy: profile.accuracy,
          errors: currentErrors,
        });

        broadcastCallback({
          type: "participant_finished",
          participantId,
          position,
        });
        
        return;
      }

      const burstSize = Math.floor(Math.random() * 4) + 1;
      currentProgress = Math.min(paragraphLength, currentProgress + burstSize);

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
  }

  stopAllBotsInRace(raceId: number, participants: RaceParticipant[]) {
    participants.forEach(p => {
      if (p.isBot === 1) {
        this.stopBotTyping(p.id);
      }
    });
  }
}

export const botService = new BotService();
