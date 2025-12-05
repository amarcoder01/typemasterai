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
  
  // Awkward digraphs that are slow to type (awkward stretches, not common combos)
  slowDigraphs: new Set(['zx', 'xz', 'qz', 'zq', 'az', 'za', 'sx', 'xs', 'vf', 'fv', 'bg', 'gb', 'nh', 'hn', 'mj', 'jm', 'aq', 'qa', 'xc', 'cx', 'zc', 'cz', 'bv', 'vb']),
  
  // Same-finger key pairs (consecutive keys typed with the same finger are slower)
  // Based on standard touch typing finger assignments
  sameFingerPairs: new Set([
    // Left pinky: q, a, z, 1
    'qa', 'aq', 'az', 'za', 'qz', 'zq', '1q', 'q1', '1a', 'a1', '1z', 'z1',
    // Left ring: w, s, x, 2
    'ws', 'sw', 'sx', 'xs', 'wx', 'xw', '2w', 'w2', '2s', 's2', '2x', 'x2',
    // Left middle: e, d, c, 3
    'ed', 'de', 'dc', 'cd', 'ec', 'ce', '3e', 'e3', '3d', 'd3', '3c', 'c3',
    // Left index: r, f, v, t, g, b, 4, 5
    'rf', 'fr', 'fv', 'vf', 'rv', 'vr', 'tg', 'gt', 'gb', 'bg', 'tb', 'bt', '4r', 'r4', '4f', 'f4', '5t', 't5', '5g', 'g5',
    // Right index: y, h, n, u, j, m, 6, 7
    'yh', 'hy', 'yn', 'ny', 'uj', 'ju', 'jm', 'mj', 'hn', 'nh', 'um', 'mu', 'jn', 'nj', '6y', 'y6', '7u', 'u7',
    // Right middle: i, k, comma, 8
    'ik', 'ki', 'k,', ',k', 'i,', ',i', '8i', 'i8', '8k', 'k8',
    // Right ring: o, l, period, 9
    'ol', 'lo', 'o.', '.o', 'l9', '9l', '9o', 'o9',
    // Right pinky: p, semicolon, slash, 0, minus, bracket
    'p;', ';p', 'p/', '/p', ';/', '/;', '0p', 'p0', '-p', 'p-',
  ]),
  
  // Hand assignment for keys (left = true, right = false)
  leftHandKeys: new Set(['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g', 'z', 'x', 'c', 'v', 'b', '1', '2', '3', '4', '5', '!', '@', '#', '$', '%', '`', '~']),
  
  // Punctuation that causes extra pause (thinking/shifting)
  punctuationPause: new Set(['.', ',', '!', '?', ';', ':', '-', "'", '"', '(', ')', '[', ']']),
  
  // Sentence endings - longer pause for reading/comprehending next sentence
  sentenceEndings: new Set(['.', '!', '?']),
  
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
   * PRODUCTION-READY: Optimized for realistic but consistent timing
   */
  private calculateCharacterDelay(
    profile: BotProfile,
    currentChar: string,
    nextChar: string | null,
    progressPercent: number,
    paragraphText: string,
    charIndex: number
  ): number {
    // Base delay from target WPM (chars per minute / 60000 for ms)
    // Average word = 5 chars, so chars per minute = WPM * 5
    const baseDelayMs = 60000 / (profile.targetWPM * 5);
    
    // === SIMPLE SPEED VARIANCE ===
    // Small random variance (±15%) to feel human but stay near target WPM
    const variance = 0.85 + (Math.random() * 0.3); // 0.85 to 1.15
    
    // === WARMUP (first 10%): slightly slower start ===
    let speedMultiplier = 1.0;
    if (progressPercent < 0.1) {
      speedMultiplier = 0.85 + (progressPercent * 1.5); // 0.85 -> 1.0
    }
    
    // === FLOW/STRUGGLE STATES (simplified) ===
    if (charIndex >= profile.flowStateEndChar) profile.isInFlowState = false;
    if (charIndex >= profile.struggleEndChar) profile.isStruggling = false;
    
    if (profile.isInFlowState) {
      speedMultiplier *= 0.88; // 12% faster in flow
    } else if (profile.isStruggling) {
      speedMultiplier *= 1.15; // 15% slower when struggling
    } else if (Math.random() < 0.02) { // 2% chance per char to enter state
      if (Math.random() < 0.6) {
        profile.isInFlowState = true;
        profile.flowStateEndChar = charIndex + 15 + Math.floor(Math.random() * 15);
      } else {
        profile.isStruggling = true;
        profile.struggleEndChar = charIndex + 8 + Math.floor(Math.random() * 8);
      }
    }
    
    // === SMALL PAUSES ===
    let extraDelay = 0;
    
    // Word boundaries: small pause (20% of base delay)
    if (currentChar === ' ') {
      extraDelay = baseDelayMs * 0.2;
    }
    
    // Sentence endings: brief reading pause (30-80ms)
    if (profile.lastCharacter && TYPING_CHARACTERISTICS.sentenceEndings.has(profile.lastCharacter)) {
      extraDelay = 30 + Math.random() * 50;
    }
    
    // Store for digraph tracking
    profile.lastCharacter = currentChar;
    
    // === FINAL CALCULATION ===
    const finalDelay = (baseDelayMs * speedMultiplier * variance) + extraDelay;
    
    // Clamp to reasonable range (minimum 30ms, maximum 3x base)
    return Math.max(30, Math.min(baseDelayMs * 3, finalDelay));
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
    profile.currentMomentumWPM = 0; // Start at 0, will build up during warmup
    
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
      
      // Calculate current stats with realistic warmup
      const elapsedMs = Date.now() - startTime;
      const elapsedMinutes = elapsedMs / 60000;
      
      // Calculate raw WPM based on actual progress
      let currentWPM = 0;
      if (elapsedMinutes > 0.01) { // At least 0.6 seconds elapsed
        const rawWPM = Math.round((currentProgress / 5) / elapsedMinutes);
        
        // Apply warmup ramp: 0-8 seconds = gradual increase, then full speed
        const warmupDuration = 8000; // 8 seconds warmup
        const warmupProgress = Math.min(1, elapsedMs / warmupDuration);
        // Use ease-in curve for natural acceleration
        const warmupFactor = warmupProgress * warmupProgress; // Quadratic ease-in
        
        // Clamp to target WPM range to avoid spikes
        const maxWPM = currentProfile.targetWPM * 1.15;
        currentWPM = Math.round(Math.min(rawWPM * warmupFactor, maxWPM));
      }
      
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
