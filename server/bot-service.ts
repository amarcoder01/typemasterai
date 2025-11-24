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
            content: "You are a creative username generator. Generate realistic usernames that real people would actually use online. Mix different styles: professional usernames, casual nicknames, gaming handles, and creative names. Make them sound like REAL HUMANS, not obviously bots.",
          },
          {
            role: "user",
            content: `Generate ${count} unique, realistic usernames for online typing competitors. These should feel like REAL PEOPLE'S actual usernames. Include variety:
- Professional: alex_codes, sarah_dev, mike_writes
- Casual: jenny123, tomsmith, chris_j
- Gaming style: NightRacer, ShadowKeys, StarTyper
- Creative: pixel_master, code_wizard, fast_fingers_99
- International: yuki_fast, maria_type, raj_speed

Mix styles randomly. Keep them 6-16 characters. Make them feel authentic like real users from around the world. Return ONLY the usernames, one per line, no numbering or extra text.`,
          },
        ],
        temperature: 1.3,
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

    return {
      username,
      avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
      targetWPM: Math.max(25, Math.round(selectedSkill.targetWPM + wpmVariation)),
      accuracy: Math.max(85, Math.min(99.5, selectedSkill.accuracy + accuracyVariation)),
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
