export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[‒–—―]/g, '-');
}

export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  
  return dp[m][n];
}

export interface CharacterDiff {
  char: string;
  status: 'correct' | 'incorrect' | 'missing' | 'extra';
  position: number;
}

export function getCharacterDiff(typed: string, actual: string): CharacterDiff[] {
  const normalizedTyped = normalizeText(typed);
  const normalizedActual = normalizeText(actual);
  const diff: CharacterDiff[] = [];
  
  const maxLen = Math.max(normalizedTyped.length, normalizedActual.length);
  
  for (let i = 0; i < maxLen; i++) {
    const typedChar = normalizedTyped[i] || '';
    const actualChar = normalizedActual[i] || '';
    
    if (typedChar === actualChar) {
      diff.push({ char: actualChar, status: 'correct', position: i });
    } else if (!typedChar && actualChar) {
      diff.push({ char: actualChar, status: 'missing', position: i });
    } else if (typedChar && !actualChar) {
      diff.push({ char: typedChar, status: 'extra', position: i });
    } else {
      diff.push({ char: actualChar, status: 'incorrect', position: i });
    }
  }
  
  return diff;
}

export interface DictationAccuracyResult {
  accuracy: number;
  errors: number;
  normalizedTyped: string;
  normalizedActual: string;
  characterDiff: CharacterDiff[];
  correctChars: number;
  totalChars: number;
}

export function calculateDictationAccuracy(
  typedText: string,
  actualSentence: string
): DictationAccuracyResult {
  const normalizedTyped = normalizeText(typedText);
  const normalizedActual = normalizeText(actualSentence);
  
  const distance = levenshteinDistance(normalizedTyped, normalizedActual);
  const maxLength = Math.max(normalizedTyped.length, normalizedActual.length);
  
  const accuracy = maxLength === 0 ? 100 : 
    Math.round(((maxLength - distance) / maxLength) * 100);
  
  const characterDiff = getCharacterDiff(typedText, actualSentence);
  const correctChars = characterDiff.filter(d => d.status === 'correct').length;
  
  return {
    accuracy: Math.max(0, Math.min(100, accuracy)),
    errors: distance,
    normalizedTyped,
    normalizedActual,
    characterDiff,
    correctChars,
    totalChars: maxLength,
  };
}

export function calculateDictationWPM(
  typedCharacters: number,
  durationSeconds: number
): number {
  if (durationSeconds === 0) return 0;
  
  const words = typedCharacters / 5;
  const minutes = durationSeconds / 60;
  
  return Math.round(words / minutes);
}

export function getSpeedRate(speedLevel: string): number {
  const rates: Record<string, number> = {
    slow: 0.7,
    medium: 1.0,
    fast: 1.5,
  };
  
  if (speedLevel === 'random') {
    const levels = ['slow', 'medium', 'fast'];
    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
    return rates[randomLevel];
  }
  
  const numericRate = parseFloat(speedLevel);
  if (!isNaN(numericRate) && numericRate >= 0.5 && numericRate <= 2.0) {
    return numericRate;
  }
  
  return rates[speedLevel] || 1.0;
}

export function getSpeedLevelName(rate: number): string {
  if (rate <= 0.8) return 'Slow';
  if (rate <= 1.2) return 'Medium';
  return 'Fast';
}

export function getAccuracyGrade(accuracy: number): {
  grade: string;
  color: string;
  message: string;
} {
  if (accuracy >= 98) {
    return {
      grade: 'S',
      color: 'text-purple-600',
      message: 'Perfect! Outstanding accuracy!',
    };
  } else if (accuracy >= 95) {
    return {
      grade: 'A+',
      color: 'text-green-600',
      message: 'Excellent! Nearly perfect!',
    };
  } else if (accuracy >= 90) {
    return {
      grade: 'A',
      color: 'text-green-600',
      message: 'Great job! Very accurate!',
    };
  } else if (accuracy >= 85) {
    return {
      grade: 'B+',
      color: 'text-blue-600',
      message: 'Good work! Keep it up!',
    };
  } else if (accuracy >= 80) {
    return {
      grade: 'B',
      color: 'text-blue-600',
      message: 'Nice! Room for improvement!',
    };
  } else if (accuracy >= 70) {
    return {
      grade: 'C',
      color: 'text-yellow-600',
      message: 'Keep practicing!',
    };
  } else {
    return {
      grade: 'D',
      color: 'text-orange-600',
      message: 'Try replaying and using hints!',
    };
  }
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
