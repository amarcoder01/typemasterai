export const PLATFORM_STATS = {
  TOTAL_TESTS: 10_500_000,
  TOTAL_USERS: 125_000,
  TOTAL_LANGUAGES: 23,
} as const;

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M+';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K+';
  }
  return num.toString();
}
