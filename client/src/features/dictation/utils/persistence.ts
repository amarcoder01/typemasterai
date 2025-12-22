import type { 
  StreakData, 
  BookmarkedSentence,
  DictationTestState,
  SessionStats,
  SessionHistoryItem,
  PracticeMode,
  DifficultyLevel,
  AdaptiveDifficultyConfig,
} from '../types';
import { 
  STORAGE_KEYS, 
  INITIAL_TEST_STATE, 
  INITIAL_SESSION_STATS,
  INITIAL_ADAPTIVE_CONFIG,
} from '../types';

// ============================================================================
// STREAK MANAGEMENT
// ============================================================================

export function getStreakData(): StreakData {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.STREAK);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse streak data:', e);
  }
  return { 
    currentStreak: 0, 
    longestStreak: 0, 
    lastPracticeDate: '', 
    totalSessions: 0 
  };
}

export function updateStreak(): StreakData {
  const data = getStreakData();
  const now = new Date();
  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const today = formatLocalDate(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = formatLocalDate(yesterdayDate);

  let newStreak = data.currentStreak;
  // If the last practice was NOT today (i.e., this is the first practice of the day)
  if (data.lastPracticeDate !== today) {
    // If the last practice was yesterday, increment streak
    if (data.lastPracticeDate === yesterday) {
      newStreak = data.currentStreak + 1;
    } else {
      // Otherwise (missed a day or more), reset to 1
      newStreak = 1;
    }
  }
  // If last practice WAS today, keep streak as is (don't increment twice in one day)

  const newData: StreakData = {
    currentStreak: newStreak,
    longestStreak: Math.max(data.longestStreak, newStreak),
    lastPracticeDate: today,
    totalSessions: data.totalSessions + 1,
  };

  localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(newData));
  return newData;
}

// ============================================================================
// BOOKMARK MANAGEMENT
// ============================================================================

export function getBookmarks(): BookmarkedSentence[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse bookmarks:', e);
  }
  return [];
}

export function saveBookmark(sentence: BookmarkedSentence): BookmarkedSentence[] {
  const bookmarks = getBookmarks();
  const existing = bookmarks.findIndex(b => b.id === sentence.id);
  if (existing >= 0) {
    bookmarks[existing] = sentence;
  } else {
    bookmarks.push(sentence);
  }
  localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  return bookmarks;
}

export function removeBookmark(id: number): BookmarkedSentence[] {
  const bookmarks = getBookmarks().filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  return bookmarks;
}

export function isBookmarked(id: number): boolean {
  return getBookmarks().some(b => b.id === id);
}

// ============================================================================
// VOICE PREFERENCES
// ============================================================================

export function getSavedVoice(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.VOICE);
  } catch (e) {
    return null;
  }
}

export function saveVoiceSelection(voiceURI: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.VOICE, voiceURI);
  } catch (e) {
    console.error('Failed to save voice selection:', e);
  }
}

// ============================================================================
// SESSION BACKUP & RECOVERY
// ============================================================================

export interface SessionBackup {
  version: number;
  timestamp: number;
  practiceMode: PracticeMode;
  difficulty: DifficultyLevel;
  speedLevel: string;
  category: string;
  sessionLength: number;
  sessionProgress: number;
  sessionStats: SessionStats;
  sessionHistory: SessionHistoryItem[];
  shownSentenceIds: number[];
  adaptiveDifficulty: AdaptiveDifficultyConfig;
  // Current test state (if in progress)
  testState?: {
    sentenceId: number;
    sentence: string;
    typedText: string;
    replayCount: number;
    hintShown: boolean;
  };
}

const SESSION_BACKUP_VERSION = 1;

export function saveSessionBackup(data: Omit<SessionBackup, 'version' | 'timestamp'>): void {
  try {
    const backup: SessionBackup = {
      version: SESSION_BACKUP_VERSION,
      timestamp: Date.now(),
      ...data,
    };
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(backup));
  } catch (e) {
    console.error('Failed to save session backup:', e);
  }
}

export function getSessionBackup(): SessionBackup | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!stored) return null;
    
    const backup: SessionBackup = JSON.parse(stored);
    
    // Version check
    if (backup.version !== SESSION_BACKUP_VERSION) {
      clearSessionBackup();
      return null;
    }
    
    // Check if backup is too old (24 hours)
    const MAX_AGE = 24 * 60 * 60 * 1000;
    if (Date.now() - backup.timestamp > MAX_AGE) {
      clearSessionBackup();
      return null;
    }
    
    return backup;
  } catch (e) {
    console.error('Failed to parse session backup:', e);
    clearSessionBackup();
    return null;
  }
}

export function clearSessionBackup(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch (e) {
    console.error('Failed to clear session backup:', e);
  }
}

export function hasValidSessionBackup(): boolean {
  const backup = getSessionBackup();
  return backup !== null && backup.sessionProgress > 0;
}

// ============================================================================
// SESSION STATE HELPERS
// ============================================================================

export function createInitialTestState(): DictationTestState {
  return { ...INITIAL_TEST_STATE };
}

export function createInitialSessionStats(): SessionStats {
  return { ...INITIAL_SESSION_STATS };
}

export function createInitialAdaptiveConfig(
  currentLevel: DifficultyLevel = 'easy'
): AdaptiveDifficultyConfig {
  return {
    ...INITIAL_ADAPTIVE_CONFIG,
    currentLevel,
  };
}
