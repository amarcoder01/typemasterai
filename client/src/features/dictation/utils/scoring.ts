import type { CharacterDiff } from '@shared/dictation-utils';
import type { 
  ErrorCategory, 
  CoachingTip, 
  Achievement, 
  SessionHistoryItem,
  SessionStats 
} from '../types';

/**
 * Categorizes errors from character diff into meaningful categories
 */
export function categorizeErrors(characterDiff: CharacterDiff[]): ErrorCategory[] {
  const categories: Map<string, ErrorCategory> = new Map();

  const addError = (type: ErrorCategory['type'], example: string) => {
    const existing = categories.get(type);
    if (existing) {
      existing.count++;
      if (existing.examples.length < 3) existing.examples.push(example);
    } else {
      categories.set(type, { type, count: 1, examples: [example] });
    }
  };

  for (const diff of characterDiff) {
    if (diff.status === 'incorrect') {
      const origChar = diff.char;
      const typedChar = diff.typedChar || '';

      if (/[.,!?;:'"-]/.test(origChar) || /[.,!?;:'"-]/.test(typedChar)) {
        addError('punctuation', `'${origChar}' → '${typedChar}'`);
      } else if (origChar.toLowerCase() === typedChar.toLowerCase()) {
        addError('capitalization', `'${origChar}' → '${typedChar}'`);
      } else {
        addError('spelling', `'${origChar}' → '${typedChar}'`);
      }
    } else if (diff.status === 'missing') {
      addError('missing', `'${diff.char}' missing`);
    } else if (diff.status === 'extra') {
      addError('extra', `extra '${diff.char}'`);
    }
  }

  return Array.from(categories.values()).sort((a, b) => b.count - a.count);
}

/**
 * Generates contextual coaching tips based on performance
 */
export function generateCoachingTip(
  accuracy: number,
  wpm: number,
  errorCategories: ErrorCategory[],
  sessionStats: SessionStats,
  hintUsed: boolean,
  replayCount: number
): CoachingTip {
  if (accuracy >= 100) {
    return {
      type: 'achievement',
      message: 'Perfect transcription! You have excellent listening skills.',
    };
  }

  if (accuracy >= 95) {
    return {
      type: 'encouragement',
      message: 'Excellent work! Just minor adjustments needed.',
    };
  }

  if (errorCategories.length > 0) {
    const topError = errorCategories[0];
    const tips: Record<string, string> = {
      spelling: 'Focus on letter accuracy. Try listening more carefully to each word.',
      punctuation: 'Pay attention to pauses and tone changes for punctuation cues.',
      capitalization: 'Listen for sentence beginnings and proper nouns for capitals.',
      missing: 'Slow down and make sure you catch every word.',
      extra: 'Double-check before submitting - you may be adding extra characters.',
      word_order: 'Listen to the sentence flow and word sequence carefully.',
    };

    return {
      type: 'improvement',
      message: tips[topError.type] || 'Keep practicing to improve!',
    };
  }

  if (hintUsed) {
    return {
      type: 'improvement',
      message: 'Try completing the next sentence without using hints!',
    };
  }

  if (replayCount > 2) {
    return {
      type: 'improvement',
      message: 'Challenge yourself to use fewer replays next time.',
    };
  }

  return {
    type: 'encouragement',
    message: 'Good effort! Keep practicing to build your skills.',
  };
}

/**
 * Calculates session achievements based on performance
 */
export function calculateAchievements(
  sessionStats: SessionStats,
  sessionHistory: SessionHistoryItem[]
): Achievement[] {
  const avgAccuracy = sessionStats.count > 0 
    ? sessionStats.totalAccuracy / sessionStats.count 
    : 0;
  const avgWpm = sessionStats.count > 0 
    ? sessionStats.totalWpm / sessionStats.count 
    : 0;
  const perfectCount = sessionHistory.filter(h => h.accuracy === 100).length;

  return [
    {
      id: 'speed_demon',
      name: 'Speed Demon',
      description: 'Average 50+ WPM in a session',
      unlocked: avgWpm >= 50,
      progress: Math.min(avgWpm, 50),
      target: 50,
    },
    {
      id: 'perfectionist',
      name: 'Perfectionist',
      description: 'Get 3 perfect scores in one session',
      unlocked: perfectCount >= 3,
      progress: perfectCount,
      target: 3,
    },
    {
      id: 'accuracy_ace',
      name: 'Accuracy Ace',
      description: 'Maintain 95%+ average accuracy',
      unlocked: avgAccuracy >= 95 && sessionStats.count >= 3,
      progress: Math.min(avgAccuracy, 95),
      target: 95,
    },
    {
      id: 'marathon',
      name: 'Marathon Runner',
      description: 'Complete 10+ sentences in one session',
      unlocked: sessionStats.count >= 10,
      progress: sessionStats.count,
      target: 10,
    },
  ];
}

/**
 * Aggregates error breakdown from session history
 */
export function getSessionErrorBreakdown(
  sessionHistory: SessionHistoryItem[]
): Record<string, { count: number; examples: string[] }> {
  return sessionHistory.reduce((acc, item) => {
    item.errorCategories.forEach((cat) => {
      if (!acc[cat.type]) {
        acc[cat.type] = { count: 0, examples: [] };
      }
      acc[cat.type].count += cat.count;
      acc[cat.type].examples = Array.from(
        new Set([...acc[cat.type].examples, ...cat.examples])
      ).slice(0, 5);
    });
    return acc;
  }, {} as Record<string, { count: number; examples: string[] }>);
}

/**
 * Gets improvement suggestion based on weakest area
 */
export function getWeakestAreaTip(weakestArea: string): string {
  const tips: Record<string, string> = {
    spelling: 'Practice similar words to improve spelling accuracy.',
    punctuation: 'Pay attention to commas, periods, and other punctuation marks.',
    capitalization: 'Remember to capitalize proper nouns and sentence beginnings.',
    missing: 'Listen more carefully and make sure not to skip words.',
    extra: "Avoid adding words that weren't in the original sentence.",
    word_order: 'Pay attention to the order of words as you hear them.',
  };
  return tips[weakestArea] || 'Keep practicing to improve!';
}
