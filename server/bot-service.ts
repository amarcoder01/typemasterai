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

// Human typing characteristics based on keystroke dynamics research
const TYPING_CHARACTERISTICS = {
  // Character difficulty scores (higher = slower to type)
  charDifficulty: new Map<string, number>([
    // Easy keys (home row)
    ['a', 0.8], ['s', 0.8], ['d', 0.8], ['f', 0.8], ['j', 0.8], ['k', 0.8], ['l', 0.8],
    // Medium keys
    ['e', 0.9], ['r', 0.9], ['t', 0.9], ['i', 0.9], ['o', 0.9], ['n', 0.9],
    // Harder keys (require stretch)
    ['q', 1.3], ['z', 1.3], ['x', 1.2], ['p', 1.2], ['b', 1.1], ['v', 1.1],
    // Numbers (top row stretch)
    ['1', 1.4], ['2', 1.3], ['3', 1.2], ['4', 1.2], ['5', 1.3], ['6', 1.3], ['7', 1.2], ['8', 1.2], ['9', 1.3], ['0', 1.4],
    // Symbols (shift required)
    ['!', 1.5], ['@', 1.5], ['#', 1.5], ['$', 1.5], ['%', 1.5], ['^', 1.6], ['&', 1.5], ['*', 1.5],
    ['(', 1.4], [')', 1.4], ['-', 1.3], ['_', 1.5], ['=', 1.3], ['+', 1.5],
    ['[', 1.4], [']', 1.4], ['{', 1.6], ['}', 1.6], ['\\', 1.5], ['|', 1.6],
    [';', 1.1], [':', 1.3], ["'", 1.2], ['"', 1.4], [',', 1.0], ['<', 1.4],
    ['.', 1.0], ['>', 1.4], ['/', 1.1], ['?', 1.4],
  ]),
  
  // Common digraphs (two-letter combinations) that are typed faster
  fastDigraphs: new Set(['th', 'he', 'in', 'er', 'an', 'on', 'at', 'en', 'nd', 'ti', 'es', 'or', 'te', 'of', 'ed', 'is', 'it', 'al', 'ar', 'st', 'to', 'nt', 'ng', 'se', 'ha', 're', 'ou', 'ea', 'le', 'hi', 've', 'co', 'me', 'de', 'ta', 'ne', 'ri', 'ro', 'li']),
  
  // Punctuation that causes extra pause (thinking/shifting)
  punctuationPause: new Set(['.', ',', '!', '?', ';', ':', '-', "'", '"', '(', ')', '[', ']']),
  
  // Word endings that signal a natural pause point
  wordEndings: new Set([' ', '\n', '\t']),
};

// Skill level definitions with realistic WPM ranges
type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'pro';

interface SkillProfile {
  minWPM: number;
  maxWPM: number;
  baseAccuracy: number;
  // How much WPM varies during typing (flow vs struggle)
  wpmVariance: number;
  // Probability of entering "flow state" (faster typing)
  flowStateChance: number;
  // Probability of "struggle" periods (slower typing)
  struggleChance: number;
  // Warmup duration (% of text before reaching peak speed)
  warmupPercent: number;
  // Fatigue threshold (% of text where fatigue starts)
  fatigueThreshold: number;
  // Thinking pause frequency (pauses per 100 chars)
  thinkingPauseRate: number;
  // Error correction behavior
  errorCorrectionDelay: number; // ms to "notice" error
}

const SKILL_PROFILES: Record<SkillLevel, SkillProfile> = {
  beginner: {
    minWPM: 20,
    maxWPM: 40,
    baseAccuracy: 88,
    wpmVariance: 0.35, // 35% variance - very inconsistent
    flowStateChance: 0.05,
    struggleChance: 0.25,
    warmupPercent: 0.15,
    fatigueThreshold: 0.70,
    thinkingPauseRate: 8, // More frequent pauses
    errorCorrectionDelay: 400,
  },
  intermediate: {
    minWPM: 40,
    maxWPM: 65,
    baseAccuracy: 92,
    wpmVariance: 0.25,
    flowStateChance: 0.15,
    struggleChance: 0.15,
    warmupPercent: 0.10,
    fatigueThreshold: 0.80,
    thinkingPauseRate: 5,
    errorCorrectionDelay: 300,
  },
  advanced: {
    minWPM: 65,
    maxWPM: 90,
    baseAccuracy: 95,
    wpmVariance: 0.18,
    flowStateChance: 0.25,
    struggleChance: 0.08,
    warmupPercent: 0.08,
    fatigueThreshold: 0.85,
    thinkingPauseRate: 3,
    errorCorrectionDelay: 200,
  },
  expert: {
    minWPM: 90,
    maxWPM: 120,
    baseAccuracy: 97,
    wpmVariance: 0.12,
    flowStateChance: 0.35,
    struggleChance: 0.05,
    warmupPercent: 0.05,
    fatigueThreshold: 0.90,
    thinkingPauseRate: 2,
    errorCorrectionDelay: 150,
  },
  pro: {
    minWPM: 120,
    maxWPM: 150,
    baseAccuracy: 98.5,
    wpmVariance: 0.08,
    flowStateChance: 0.45,
    struggleChance: 0.02,
    warmupPercent: 0.03,
    fatigueThreshold: 0.95,
    thinkingPauseRate: 1,
    errorCorrectionDelay: 100,
  },
};

interface BotProfile {
  username: string;
  avatarColor: string;
  targetWPM: number;
  accuracy: number;
  personality: 'friendly' | 'competitive' | 'casual' | 'encouraging';
  lastChatTime: number;
  // Advanced typing behavior
  skillLevel: SkillLevel;
  skillProfile: SkillProfile;
  // Dynamic state during race
  isInFlowState: boolean;
  flowStateEndChar: number;
  isStruggling: boolean;
  struggleEndChar: number;
  lastCharacter: string;
  currentMomentumWPM: number; // Smoothed WPM for realistic variance
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
    // Weighted skill level distribution (more intermediate/advanced, fewer beginners/pros)
    const skillDistribution: { level: SkillLevel; weight: number }[] = [
      { level: 'beginner', weight: 1.5 },
      { level: 'intermediate', weight: 4 },
      { level: 'advanced', weight: 4 },
      { level: 'expert', weight: 2 },
      { level: 'pro', weight: 0.5 },
    ];

    const totalWeight = skillDistribution.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedLevel: SkillLevel = 'intermediate';
    
    for (const dist of skillDistribution) {
      random -= dist.weight;
      if (random <= 0) {
        selectedLevel = dist.level;
        break;
      }
    }
    
    const skillProfile = SKILL_PROFILES[selectedLevel];
    
    // Generate target WPM within the skill level's range with some Gaussian-like distribution
    // This creates more realistic clustering around the middle of the range
    const rangeSize = skillProfile.maxWPM - skillProfile.minWPM;
    const normalizedRandom = (Math.random() + Math.random() + Math.random()) / 3; // Pseudo-Gaussian
    const targetWPM = Math.round(skillProfile.minWPM + (rangeSize * normalizedRandom));
    
    // Accuracy based on skill with small variance
    const accuracyVariation = (Math.random() - 0.5) * 3;
    const accuracy = Math.max(85, Math.min(99.5, skillProfile.baseAccuracy + accuracyVariation));
    
    const personality = BOT_PERSONALITIES[Math.floor(Math.random() * BOT_PERSONALITIES.length)];

    console.log(`[Bot Profile] Created ${username}: ${selectedLevel} level, target ${targetWPM} WPM, ${accuracy.toFixed(1)}% accuracy`);

    return {
      username,
      avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
      targetWPM,
      accuracy,
      personality,
      lastChatTime: 0,
      // Advanced typing behavior
      skillLevel: selectedLevel,
      skillProfile,
      // Dynamic state (initialized at race start)
      isInFlowState: false,
      flowStateEndChar: 0,
      isStruggling: false,
      struggleEndChar: 0,
      lastCharacter: '',
      currentMomentumWPM: targetWPM,
    };
  }

  /**
   * Gaussian random number generator using Box-Muller transform
   * Returns a value with mean 0 and standard deviation 1
   */
  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Calculate the delay for typing a single character based on human-like patterns
   */
  private calculateCharacterDelay(
    profile: BotProfile,
    currentChar: string,
    nextChar: string | null,
    progressPercent: number,
    paragraphText: string,
    charIndex: number
  ): number {
    const skillProfile = profile.skillProfile;
    
    // Base delay from current momentum WPM (characters per minute / 60000 for ms)
    // Average word = 5 chars, so chars per minute = WPM * 5
    let baseDelayMs = 60000 / (profile.currentMomentumWPM * 5);
    
    // === SPEED CURVE: Warmup -> Peak -> Fatigue ===
    let speedMultiplier = 1.0;
    
    // Warmup phase: slower at the start
    if (progressPercent < skillProfile.warmupPercent) {
      const warmupProgress = progressPercent / skillProfile.warmupPercent;
      // Start at 60-80% speed, ramp up to 100%
      speedMultiplier = 0.6 + (0.4 * warmupProgress);
    }
    // Fatigue phase: slower near the end
    else if (progressPercent > skillProfile.fatigueThreshold) {
      const fatigueProgress = (progressPercent - skillProfile.fatigueThreshold) / (1 - skillProfile.fatigueThreshold);
      // Slow down by 5-15% based on skill (beginners fatigue more)
      const fatigueAmount = skillProfile.struggleChance * 0.3;
      speedMultiplier = 1.0 - (fatigueAmount * fatigueProgress);
    }
    
    // === FLOW STATE / STRUGGLE STATE ===
    // Clear expired states first
    if (charIndex >= profile.flowStateEndChar) profile.isInFlowState = false;
    if (charIndex >= profile.struggleEndChar) profile.isStruggling = false;
    
    if (profile.isInFlowState) {
      // In flow: 15-25% faster
      speedMultiplier *= 0.75 + (Math.random() * 0.1);
    } else if (profile.isStruggling) {
      // Struggling: 20-40% slower
      speedMultiplier *= 1.2 + (Math.random() * 0.2);
    } else {
      // Check for entering new states
      // Probabilities are fractions (0.05-0.45), divide by 5 since we check every character
      // This gives realistic per-word (~5 chars) activation rates
      if (Math.random() < skillProfile.flowStateChance / 5) {
        profile.isInFlowState = true;
        profile.isStruggling = false;
        // Flow lasts 10-30 characters
        profile.flowStateEndChar = charIndex + 10 + Math.floor(Math.random() * 20);
      } else if (Math.random() < skillProfile.struggleChance / 5) {
        profile.isStruggling = true;
        profile.isInFlowState = false;
        // Struggle lasts 5-15 characters
        profile.struggleEndChar = charIndex + 5 + Math.floor(Math.random() * 10);
      }
    }
    
    // === CHARACTER DIFFICULTY ===
    const charLower = currentChar.toLowerCase();
    const charDifficulty = TYPING_CHARACTERISTICS.charDifficulty.get(charLower) || 1.0;
    // Upper case requires shift, add slight penalty
    const caseMultiplier = currentChar !== charLower ? 1.15 : 1.0;
    
    // === DIGRAPH SPEED BONUS ===
    let digraphMultiplier = 1.0;
    if (profile.lastCharacter) {
      const digraph = (profile.lastCharacter + charLower).toLowerCase();
      if (TYPING_CHARACTERISTICS.fastDigraphs.has(digraph)) {
        // Common digraphs are 15-25% faster
        digraphMultiplier = 0.75 + (Math.random() * 0.1);
      }
    }
    
    // === PUNCTUATION PAUSE ===
    let punctuationDelay = 0;
    if (TYPING_CHARACTERISTICS.punctuationPause.has(currentChar)) {
      // Punctuation adds 50-150% extra time (thinking + shift key)
      punctuationDelay = baseDelayMs * (0.5 + Math.random());
    }
    
    // === WORD BOUNDARY PAUSE ===
    let wordBoundaryDelay = 0;
    if (TYPING_CHARACTERISTICS.wordEndings.has(currentChar)) {
      // Space between words: 80-180% extra time (next word thinking)
      wordBoundaryDelay = baseDelayMs * (0.8 + Math.random());
    }
    
    // === GAUSSIAN NOISE (Human variance) ===
    // Add ±15-35% random variance based on skill level
    const noiseAmount = skillProfile.wpmVariance;
    const noise = 1 + (this.gaussianRandom() * noiseAmount * 0.5);
    // Clamp noise to reasonable range (0.5x to 2x)
    const clampedNoise = Math.max(0.5, Math.min(2.0, noise));
    
    // === THINKING PAUSE (Random longer pauses) ===
    let thinkingPause = 0;
    const pauseChance = skillProfile.thinkingPauseRate / 100;
    if (Math.random() < pauseChance) {
      // Random thinking pause: 200-800ms based on skill
      const minPause = 150 + (5 - Object.keys(SKILL_PROFILES).indexOf(profile.skillLevel)) * 50;
      const maxPause = 400 + (5 - Object.keys(SKILL_PROFILES).indexOf(profile.skillLevel)) * 100;
      thinkingPause = minPause + (Math.random() * (maxPause - minPause));
    }
    
    // === COMBINE ALL FACTORS ===
    const finalDelay = (baseDelayMs * speedMultiplier * charDifficulty * caseMultiplier * digraphMultiplier * clampedNoise) 
      + punctuationDelay + wordBoundaryDelay + thinkingPause;
    
    // Store current char for next digraph calculation
    profile.lastCharacter = currentChar;
    
    // Update momentum WPM with smoothing (exponential moving average)
    const instantWPM = 60000 / (finalDelay * 5);
    profile.currentMomentumWPM = profile.currentMomentumWPM * 0.85 + instantWPM * 0.15;
    
    // Minimum delay to prevent impossibly fast typing
    return Math.max(20, finalDelay);
  }

  startBotTyping(
    participantId: number,
    raceId: number,
    paragraphLength: number,
    broadcastCallback: (data: any) => void,
    onBotFinished?: (raceId: number, participantId: number, position: number) => void,
    botUsername?: string,
    paragraphText?: string
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
    
    // Reset dynamic state for new race
    profile.isInFlowState = false;
    profile.flowStateEndChar = 0;
    profile.isStruggling = false;
    profile.struggleEndChar = 0;
    profile.lastCharacter = '';
    profile.currentMomentumWPM = profile.targetWPM;
    
    console.log(`[Bot Typing] Bot ${profile.username} (${participantId}) starting: ${profile.skillLevel} level, target ${profile.targetWPM} WPM, paragraph ${paragraphLength} chars`);

    this.botParagraphLengths.set(participantId, paragraphLength);
    const text = paragraphText || ' '.repeat(paragraphLength);
    
    let currentProgress = 0;
    let currentErrors = 0;
    let startTime = Date.now();
    let accumulatedDelay = 0;
    let lastBroadcastTime = Date.now();
    const BROADCAST_INTERVAL = 150; // Broadcast updates every 150ms for smooth UI

    const simulate = async () => {
      const currentProfile = this.botProfiles.get(participantId);
      if (!currentProfile) {
        console.log(`[Bot Typing] Bot ${participantId} profile removed, stopping simulation`);
        return;
      }

      const currentParagraphLength = this.botParagraphLengths.get(participantId) || paragraphLength;

      // Check if finished
      if (currentProgress >= currentParagraphLength) {
        this.stopBotTyping(participantId);
        
        const { position, isNewFinish } = await storage.finishParticipant(participantId);
        
        if (!isNewFinish) {
          return;
        }

        // Calculate final WPM
        const totalElapsed = (Date.now() - startTime) / 60000;
        const finalWPM = Math.round((currentParagraphLength / 5) / totalElapsed);
        const finalAccuracy = currentProgress > 0 ? ((currentProgress - currentErrors) / currentProgress) * 100 : 100;

        broadcastCallback({
          type: "progress_update",
          participantId,
          progress: currentParagraphLength,
          wpm: finalWPM,
          accuracy: Math.round(finalAccuracy * 100) / 100,
          errors: currentErrors,
        });

        broadcastCallback({
          type: "participant_finished",
          participantId,
          position,
        });
        
        console.log(`[Bot Typing] Bot ${currentProfile.username} finished at position ${position}, final WPM: ${finalWPM}`);
        
        if (onBotFinished) {
          onBotFinished(raceId, participantId, position);
        }
        
        return;
      }

      // === CHARACTER-BY-CHARACTER SIMULATION ===
      const progressPercent = currentProgress / currentParagraphLength;
      const currentChar = text[currentProgress] || ' ';
      const nextChar = currentProgress + 1 < text.length ? text[currentProgress + 1] : null;
      
      // Calculate human-like delay for this character
      const charDelay = this.calculateCharacterDelay(
        currentProfile,
        currentChar,
        nextChar,
        progressPercent,
        text,
        currentProgress
      );
      
      // Simulate error injection based on accuracy
      const errorChance = (100 - currentProfile.accuracy) / 100;
      if (Math.random() < errorChance) {
        currentErrors++;
        // Error adds slight extra delay (noticing and mentally correcting)
        accumulatedDelay += currentProfile.skillProfile.errorCorrectionDelay * 0.3;
      }
      
      // Advance progress
      currentProgress++;
      accumulatedDelay += charDelay;
      
      // Calculate current stats
      const elapsed = (Date.now() - startTime) / 60000;
      const currentWPM = elapsed > 0 ? Math.round((currentProgress / 5) / elapsed) : currentProfile.targetWPM;
      const currentAccuracy = currentProgress > 0 ? ((currentProgress - currentErrors) / currentProgress) * 100 : 100;
      
      // Broadcast updates at intervals for smooth UI (not every character)
      const now = Date.now();
      if (now - lastBroadcastTime >= BROADCAST_INTERVAL || currentProgress >= currentParagraphLength) {
        lastBroadcastTime = now;
        
        await storage.updateParticipantProgress(
          participantId,
          currentProgress,
          currentWPM,
          Math.round(currentAccuracy * 100) / 100,
          currentErrors
        );

        broadcastCallback({
          type: "progress_update",
          participantId,
          progress: currentProgress,
          wpm: currentWPM,
          accuracy: Math.round(currentAccuracy * 100) / 100,
          errors: currentErrors,
        });
      }

      // Schedule next character
      const timer = setTimeout(simulate, charDelay);
      this.activeBots.set(participantId, timer);
    };

    // Initial reaction delay (human reaction time to race start)
    // Skill-based: pros react faster (200-400ms), beginners slower (400-800ms)
    const skillIndex = Object.keys(SKILL_PROFILES).indexOf(profile.skillLevel);
    const minReaction = 200 + (4 - skillIndex) * 80;
    const maxReaction = 400 + (4 - skillIndex) * 120;
    const initialDelay = minReaction + Math.random() * (maxReaction - minReaction);
    
    console.log(`[Bot Typing] Bot ${profile.username} starting in ${Math.round(initialDelay)}ms (${profile.skillLevel} reaction time)`);
    
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
