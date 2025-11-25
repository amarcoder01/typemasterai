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

export interface DictationAccuracyResult {
  accuracy: number;
  errors: number;
  normalizedTyped: string;
  normalizedActual: string;
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
  
  return {
    accuracy: Math.max(0, Math.min(100, accuracy)),
    errors: distance,
    normalizedTyped,
    normalizedActual,
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
  
  return rates[speedLevel] || 1.0;
}

export function getSpeedLevelName(rate: number): string {
  if (rate <= 0.8) return 'Slow';
  if (rate <= 1.2) return 'Medium';
  return 'Fast';
}
