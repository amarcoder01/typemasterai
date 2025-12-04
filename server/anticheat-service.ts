import { storage } from "./storage";
import type { RaceKeystrokes, InsertRaceKeystrokes } from "@shared/schema";

interface Keystroke {
  key: string;
  expected: string;
  timestamp: number;
  correct: boolean;
  position: number;
  isTrusted?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  isFlagged: boolean;
  flagReasons: string[];
  serverCalculatedWpm: number;
  requiresReview: boolean;
  suspiciousPatterns: number;
  metrics: {
    avgInterval: number;
    minInterval: number;
    stdDevInterval: number;
    clientReportedWpm: number;
    wpmDiscrepancy: number;
  };
}

const THRESHOLDS = {
  MIN_KEYSTROKE_INTERVAL_MS: 10,
  SUSPECT_KEYSTROKE_INTERVAL_MS: 25,
  MAX_WPM_WITHOUT_CERTIFICATION: 100,
  WPM_DISCREPANCY_THRESHOLD: 15,
  PERFECT_ACCURACY_WPM_THRESHOLD: 80,
  MIN_KEYSTROKES_FOR_ANALYSIS: 20,
  MAX_CONSISTENT_INTERVAL_VARIANCE: 5,
  BURST_DETECTION_WINDOW: 10,
  BURST_THRESHOLD_RATIO: 0.8,
} as const;

export class AntiCheatService {
  private calculateIntervals(keystrokes: Keystroke[]): number[] {
    const intervals: number[] = [];
    for (let i = 1; i < keystrokes.length; i++) {
      intervals.push(keystrokes[i].timestamp - keystrokes[i - 1].timestamp);
    }
    return intervals;
  }

  private calculateStats(intervals: number[]): { avg: number; min: number; stdDev: number } {
    if (intervals.length === 0) {
      return { avg: 0, min: 0, stdDev: 0 };
    }

    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const min = Math.min(...intervals);
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    return { avg, min, stdDev };
  }

  private calculateServerWpm(keystrokes: Keystroke[]): number {
    if (keystrokes.length < 2) return 0;

    const totalTime = keystrokes[keystrokes.length - 1].timestamp - keystrokes[0].timestamp;
    if (totalTime === 0) return 0;

    const correctChars = keystrokes.filter(k => k.correct).length;
    const minutes = totalTime / 60000;
    const words = correctChars / 5;

    return Math.round(words / minutes);
  }

  private detectBurstTyping(keystrokes: Keystroke[]): boolean {
    if (keystrokes.length < THRESHOLDS.BURST_DETECTION_WINDOW * 2) return false;

    const intervals = this.calculateIntervals(keystrokes);
    const windowSize = THRESHOLDS.BURST_DETECTION_WINDOW;
    
    for (let i = 0; i <= intervals.length - windowSize; i++) {
      const window = intervals.slice(i, i + windowSize);
      const fastKeystrokes = window.filter(int => int < THRESHOLDS.SUSPECT_KEYSTROKE_INTERVAL_MS).length;
      
      if (fastKeystrokes / windowSize >= THRESHOLDS.BURST_THRESHOLD_RATIO) {
        return true;
      }
    }

    return false;
  }

  private detectProgrammaticPatterns(keystrokes: Keystroke[]): boolean {
    const intervals = this.calculateIntervals(keystrokes);
    if (intervals.length < 10) return false;

    let consistentCount = 0;
    for (let i = 1; i < intervals.length; i++) {
      const diff = Math.abs(intervals[i] - intervals[i - 1]);
      if (diff < THRESHOLDS.MAX_CONSISTENT_INTERVAL_VARIANCE) {
        consistentCount++;
      }
    }

    const consistencyRatio = consistentCount / intervals.length;
    return consistencyRatio > 0.9;
  }

  private detectUntrustedEvents(keystrokes: Keystroke[]): boolean {
    const untrustedCount = keystrokes.filter(k => k.isTrusted === false).length;
    return untrustedCount > keystrokes.length * 0.1;
  }

  async validateKeystrokes(
    raceId: number,
    participantId: number,
    keystrokes: Keystroke[],
    clientReportedWpm: number,
    userId?: string
  ): Promise<ValidationResult> {
    const flagReasons: string[] = [];
    let suspiciousPatterns = 0;
    let requiresReview = false;

    if (keystrokes.length < THRESHOLDS.MIN_KEYSTROKES_FOR_ANALYSIS) {
      return {
        isValid: true,
        isFlagged: false,
        flagReasons: [],
        serverCalculatedWpm: clientReportedWpm,
        requiresReview: false,
        suspiciousPatterns: 0,
        metrics: {
          avgInterval: 0,
          minInterval: 0,
          stdDevInterval: 0,
          clientReportedWpm,
          wpmDiscrepancy: 0,
        },
      };
    }

    const intervals = this.calculateIntervals(keystrokes);
    const stats = this.calculateStats(intervals);
    const serverWpm = this.calculateServerWpm(keystrokes);
    const wpmDiscrepancy = Math.abs(serverWpm - clientReportedWpm);

    if (stats.min < THRESHOLDS.MIN_KEYSTROKE_INTERVAL_MS) {
      flagReasons.push("inhuman_speed");
      suspiciousPatterns++;
      requiresReview = true;
    }

    if (wpmDiscrepancy > THRESHOLDS.WPM_DISCREPANCY_THRESHOLD) {
      flagReasons.push("wpm_discrepancy");
      suspiciousPatterns++;
      requiresReview = true;
    }

    if (this.detectBurstTyping(keystrokes)) {
      flagReasons.push("burst_typing");
      suspiciousPatterns++;
    }

    if (this.detectProgrammaticPatterns(keystrokes)) {
      flagReasons.push("programmatic_pattern");
      suspiciousPatterns++;
      requiresReview = true;
    }

    if (this.detectUntrustedEvents(keystrokes)) {
      flagReasons.push("untrusted_events");
      suspiciousPatterns++;
      requiresReview = true;
    }

    const correctCount = keystrokes.filter(k => k.correct).length;
    const accuracy = (correctCount / keystrokes.length) * 100;
    if (accuracy === 100 && serverWpm > THRESHOLDS.PERFECT_ACCURACY_WPM_THRESHOLD) {
      flagReasons.push("perfect_accuracy_high_wpm");
      suspiciousPatterns++;
    }

    if (serverWpm > THRESHOLDS.MAX_WPM_WITHOUT_CERTIFICATION && userId) {
      const certification = await storage.getUserCertification(userId);
      if (!certification || (certification.certifiedWpm && serverWpm > certification.certifiedWpm * 1.25)) {
        flagReasons.push("requires_certification");
        requiresReview = true;
      }
    }

    const isFlagged = flagReasons.length > 0;
    const isValid = suspiciousPatterns < 3 && !flagReasons.includes("inhuman_speed");

    const keystrokeData: InsertRaceKeystrokes = {
      raceId,
      participantId,
      keystrokes: keystrokes as any,
      avgInterval: stats.avg,
      minInterval: stats.min,
      stdDevInterval: stats.stdDev,
      suspiciousPatterns,
      serverCalculatedWpm: serverWpm,
      clientReportedWpm,
      wpmDiscrepancy,
      isFlagged,
      flagReasons: flagReasons.length > 0 ? flagReasons : null,
      requiresReview,
    };

    try {
      await storage.saveRaceKeystrokes(keystrokeData);
    } catch (error) {
      console.error("[AntiCheat] Failed to save keystroke data:", error);
    }

    return {
      isValid,
      isFlagged,
      flagReasons,
      serverCalculatedWpm: serverWpm,
      requiresReview,
      suspiciousPatterns,
      metrics: {
        avgInterval: stats.avg,
        minInterval: stats.min,
        stdDevInterval: stats.stdDev,
        clientReportedWpm,
        wpmDiscrepancy,
      },
    };
  }

  async triggerVerificationChallenge(userId: string, triggeredWpm: number): Promise<string> {
    const challengeTexts = [
      "The quick brown fox jumps over the lazy dog near the river bank.",
      "Pack my box with five dozen liquor jugs and bring them to the store.",
      "How vexingly quick daft zebras jump across the open field today.",
      "The five boxing wizards jump quickly through the morning fog now.",
    ];

    const challengeText = challengeTexts[Math.floor(Math.random() * challengeTexts.length)];

    await storage.createAntiCheatChallenge({
      userId,
      challengeText,
      challengeType: "typing",
      triggered: true,
      triggeredWpm,
    });

    return challengeText;
  }

  async verifyChallenge(
    challengeId: number,
    keystrokes: Keystroke[],
    clientWpm: number
  ): Promise<{ passed: boolean; reason?: string }> {
    if (keystrokes.length < 10) {
      return { passed: false, reason: "Not enough keystrokes recorded" };
    }

    const intervals = this.calculateIntervals(keystrokes);
    const stats = this.calculateStats(intervals);
    const serverWpm = this.calculateServerWpm(keystrokes);

    if (stats.min < THRESHOLDS.MIN_KEYSTROKE_INTERVAL_MS) {
      return { passed: false, reason: "Inhuman typing speed detected" };
    }

    if (this.detectProgrammaticPatterns(keystrokes)) {
      return { passed: false, reason: "Suspicious typing pattern detected" };
    }

    const wpmDiscrepancy = Math.abs(serverWpm - clientWpm);
    if (wpmDiscrepancy > THRESHOLDS.WPM_DISCREPANCY_THRESHOLD * 2) {
      return { passed: false, reason: "WPM mismatch detected" };
    }

    const certifiedWpm = Math.round(serverWpm * 1.25);
    await storage.updateChallengePassed(challengeId, true, serverWpm, certifiedWpm);

    return { passed: true };
  }

  generateChallengeText(): string {
    const phrases = [
      "The quick brown fox jumps over the lazy dog near the river bank.",
      "Pack my box with five dozen liquor jugs and bring them to the store.",
      "How vexingly quick daft zebras jump across the open field today.",
      "The five boxing wizards jump quickly through the morning fog now.",
      "Sphinx of black quartz judge my vow while sitting by the campfire.",
      "Two driven jocks help fax my big quiz about swimming techniques.",
      "The job requires extra pluck and zeal from every young wage earner.",
      "Crazy Frederick bought many very exquisite opal jewels for the auction.",
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
}

export const antiCheatService = new AntiCheatService();
