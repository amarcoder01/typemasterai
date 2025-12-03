import { storage } from "./storage";

export interface StressTestValidationResult {
  isValid: boolean;
  errors: string[];
  flags: string[];
  requiresManualReview: boolean;
}

export interface StressTestSubmission {
  userId: string;
  difficulty: string;
  wpm: number;
  accuracy: number;
  stressScore: number;
  completionRate: number;
  duration: number;
  survivalTime: number;
  totalCharacters: number;
  errors: number;
  maxCombo: number;
}

const VALIDATION_CONSTANTS = {
  MAX_WPM: 250,
  MIN_ACCURACY: 50,
  MAX_ACCURACY: 100,
  MIN_COMPLETION_RATE: 0,
  MAX_COMPLETION_RATE: 100,
  PROGRESSION_THRESHOLD_WPM: 50,
  SUSPICIOUS_FIRST_ATTEMPT_WPM: 180,
  HIGH_SCORE_THRESHOLD_WPM: 150,
  MAX_STRESS_SCORE_BY_DIFFICULTY: {
    beginner: 15000,
    intermediate: 12000,
    advanced: 10000,
    expert: 8000,
    nightmare: 6000,
    impossible: 4000,
  } as Record<string, number>,
  MIN_TEST_DURATION_SECONDS: 5,
  MAX_CHARS_PER_SECOND: 15,
};

export async function validateStressTestSubmission(
  submission: StressTestSubmission
): Promise<StressTestValidationResult> {
  const errors: string[] = [];
  const flags: string[] = [];
  let requiresManualReview = false;

  if (submission.wpm > VALIDATION_CONSTANTS.MAX_WPM) {
    errors.push(`WPM (${submission.wpm}) exceeds maximum possible (${VALIDATION_CONSTANTS.MAX_WPM})`);
  }

  if (submission.wpm < 0) {
    errors.push("WPM cannot be negative");
  }

  if (submission.accuracy < VALIDATION_CONSTANTS.MIN_ACCURACY || 
      submission.accuracy > VALIDATION_CONSTANTS.MAX_ACCURACY) {
    errors.push(`Accuracy (${submission.accuracy}) is out of valid range (${VALIDATION_CONSTANTS.MIN_ACCURACY}-${VALIDATION_CONSTANTS.MAX_ACCURACY})`);
  }

  if (submission.completionRate < VALIDATION_CONSTANTS.MIN_COMPLETION_RATE || 
      submission.completionRate > VALIDATION_CONSTANTS.MAX_COMPLETION_RATE) {
    errors.push(`Completion rate (${submission.completionRate}) is out of valid range`);
  }

  if (submission.duration < VALIDATION_CONSTANTS.MIN_TEST_DURATION_SECONDS) {
    errors.push(`Test duration (${submission.duration}s) is too short`);
  }

  if (submission.stressScore < 0) {
    errors.push("Stress score cannot be negative");
  }

  // Session timing validation: Check if duration matches the characters typed
  // Maximum typing speed is about 15 characters per second for elite typists
  if (submission.totalCharacters > 0 && submission.duration > 0) {
    const charsPerSecond = submission.totalCharacters / submission.duration;
    if (charsPerSecond > VALIDATION_CONSTANTS.MAX_CHARS_PER_SECOND) {
      errors.push(`Typing speed (${charsPerSecond.toFixed(1)} chars/sec) exceeds human limits (${VALIDATION_CONSTANTS.MAX_CHARS_PER_SECOND} chars/sec)`);
    }
    
    // Also validate that survivalTime is reasonable relative to duration
    if (submission.survivalTime > submission.duration * 1.1) {
      errors.push(`Survival time (${submission.survivalTime}s) exceeds test duration (${submission.duration}s)`);
    }
  }

  const maxScoreForDifficulty = VALIDATION_CONSTANTS.MAX_STRESS_SCORE_BY_DIFFICULTY[submission.difficulty];
  if (maxScoreForDifficulty && submission.stressScore > maxScoreForDifficulty) {
    flags.push(`stress_score_exceeds_difficulty_max:${submission.stressScore}>${maxScoreForDifficulty}`);
    requiresManualReview = true;
  }

  if (submission.totalCharacters > 0 && submission.duration > 0) {
    const calculatedWpm = Math.round((submission.totalCharacters / 5) / (submission.duration / 60));
    const wpmDifference = Math.abs(calculatedWpm - submission.wpm);
    if (wpmDifference > 20) {
      flags.push(`wpm_mismatch:claimed=${submission.wpm},calculated=${calculatedWpm}`);
    }
  }

  try {
    const userTests = await storage.getUserStressTests(submission.userId, 5);
    
    if (userTests.length === 0) {
      if (submission.wpm > VALIDATION_CONSTANTS.SUSPICIOUS_FIRST_ATTEMPT_WPM) {
        flags.push(`suspicious_first_attempt:${submission.wpm}wpm`);
        requiresManualReview = true;
      }
    } else {
      const recentSameDifficulty = userTests.filter(t => t.difficulty === submission.difficulty);
      if (recentSameDifficulty.length > 0) {
        const avgPreviousWpm = recentSameDifficulty.reduce((sum, t) => sum + t.wpm, 0) / recentSameDifficulty.length;
        const wpmImprovement = submission.wpm - avgPreviousWpm;
        
        if (wpmImprovement > VALIDATION_CONSTANTS.PROGRESSION_THRESHOLD_WPM) {
          flags.push(`sudden_improvement:+${Math.round(wpmImprovement)}wpm`);
          requiresManualReview = true;
        }
      }
    }
  } catch (error) {
    console.error("Error checking user history for anti-cheat:", error);
  }

  if (submission.wpm > VALIDATION_CONSTANTS.HIGH_SCORE_THRESHOLD_WPM) {
    flags.push(`high_wpm_score:${submission.wpm}`);
  }

  if (submission.accuracy === 100 && submission.wpm > 100) {
    flags.push("perfect_accuracy_high_speed");
  }

  return {
    isValid: errors.length === 0,
    errors,
    flags,
    requiresManualReview: requiresManualReview && errors.length === 0,
  };
}

export function formatValidationErrors(result: StressTestValidationResult): string {
  if (result.isValid) return "";
  return result.errors.join("; ");
}

export function logSuspiciousSubmission(
  userId: string,
  submission: StressTestSubmission,
  result: StressTestValidationResult
): void {
  if (result.flags.length > 0 || !result.isValid) {
    console.warn(`[ANTI-CHEAT] Suspicious stress test submission:`, {
      userId,
      difficulty: submission.difficulty,
      wpm: submission.wpm,
      accuracy: submission.accuracy,
      stressScore: submission.stressScore,
      flags: result.flags,
      errors: result.errors,
      requiresManualReview: result.requiresManualReview,
      timestamp: new Date().toISOString(),
    });
  }
}
