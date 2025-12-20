/**
 * Production Constants
 * Centralized configuration for typing test modes
 */

// Performance thresholds
export const PERFORMANCE = {
  /** Maximum realistic WPM - world record is ~212 WPM sustained */
  MAX_WPM: 300,
  /** Minimum WPM value */
  MIN_WPM: 0,
  /** Maximum accuracy percentage */
  MAX_ACCURACY: 100,
  /** Minimum accuracy percentage */
  MIN_ACCURACY: 0,
  /** Minimum time elapsed for valid test (seconds) */
  MIN_TEST_DURATION: 1,
  /** Maximum test duration (seconds) - 60 minutes */
  MAX_TEST_DURATION: 3600,
} as const;

// Request timeouts (milliseconds)
export const TIMEOUTS = {
  /** Default API request timeout */
  API_REQUEST: 15000,
  /** AI generation timeout (longer for complex operations) */
  AI_GENERATION: 30000,
  /** WebSocket reconnection timeout */
  WEBSOCKET_RECONNECT: 5000,
  /** Toast auto-dismiss duration */
  TOAST_DURATION: 5000,
  /** Debounce delay for input validation */
  INPUT_DEBOUNCE: 50,
  /** Throttle delay for stats updates during typing */
  STATS_THROTTLE: 80,
} as const;

// Rate limiting (client-side)
export const RATE_LIMITS = {
  /** Minimum time between toast notifications of same type */
  TOAST_DEBOUNCE_MS: 2000,
  /** Maximum retries for failed API requests */
  MAX_RETRIES: 3,
  /** Retry delay multiplier (exponential backoff) */
  RETRY_DELAY_BASE: 1000,
} as const;

// Typing test modes
export const TEST_MODES = {
  TIME_PRESETS: [15, 30, 45, 60, 90, 120, 180] as const,
  DEFAULT_TIME: 60,
  DIFFICULTIES: ['easy', 'medium', 'hard'] as const,
  DEFAULT_DIFFICULTY: 'easy' as const,
} as const;

// Code mode languages
export const CODE_LANGUAGES = {
  POPULAR: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'swift', 'ruby'],
  DEFAULT: 'javascript',
} as const;

// Stress test difficulty multipliers
export const STRESS_MULTIPLIERS = {
  beginner: 1,
  intermediate: 2,
  expert: 3,
  nightmare: 4,
  impossible: 5,
} as const;

// Dictation test options
export const DICTATION = {
  SESSION_LENGTHS: [3, 5, 10, 15, 20, 25, 30, 50, 75, 100] as const,
  DEFAULT_SESSION_LENGTH: 5,
  SPEED_LEVELS: ['0.5', '0.6', '0.7', '0.8', '0.9', '1.0', '1.1', '1.2', '1.3', '1.4', '1.5'] as const,
  DEFAULT_SPEED: '1.0',
} as const;

// Anti-cheat thresholds
export const ANTI_CHEAT = {
  /** Minimum keystroke interval considered suspicious (ms) */
  MIN_KEYSTROKE_INTERVAL: 20,
  /** Maximum WPM before flagging for review */
  SUSPICIOUS_WPM: 200,
  /** Minimum accuracy for very high WPM scores */
  MIN_ACCURACY_FOR_HIGH_WPM: 90,
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  SMOOTH_CARET: 'smoothCaret',
  CARET_SPEED: 'caretSpeed',
  QUICK_RESTART: 'quickRestart',
  ZEN_MODE: 'zenMode',
  DICTATION_STREAK: 'dictation_streak',
  DICTATION_BOOKMARKS: 'dictation_bookmarks',
  DICTATION_VOICE: 'dictation_voice',
  BOOK_TOPICS_CACHE: 'book_topics_cache',
  BOOK_PARAGRAPH_CACHE: 'book_paragraph_cache',
} as const;

// Cache TTLs (milliseconds)
export const CACHE_TTL = {
  TOPICS: 30 * 60 * 1000, // 30 minutes
  PARAGRAPH: 10 * 60 * 1000, // 10 minutes
  LEADERBOARD: 5 * 60 * 1000, // 5 minutes
} as const;

// Accessibility
export const ACCESSIBILITY = {
  /** Reduced motion media query */
  REDUCED_MOTION_QUERY: '(prefers-reduced-motion: reduce)',
  /** High contrast media query */
  HIGH_CONTRAST_QUERY: '(prefers-contrast: more)',
} as const;

