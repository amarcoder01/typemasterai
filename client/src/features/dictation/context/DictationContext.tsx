import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useCallback, 
  useRef,
  useEffect,
  useMemo,
  type ReactNode 
} from 'react';
import type { DictationSentence } from '@shared/schema';
import type {
  PracticeMode,
  DifficultyLevel,
  ZenTheme,
  DictationTestState,
  DictationTestResult,
  SessionStats,
  SessionHistoryItem,
  AdaptiveDifficultyConfig,
  StreakData,
  BookmarkedSentence,
  CoachingTip,
  ErrorCategory,
} from '../types';
import {
  PRACTICE_MODES,
  INITIAL_TEST_STATE,
  INITIAL_SESSION_STATS,
  INITIAL_ADAPTIVE_CONFIG,
  ADAPTIVE_THRESHOLDS,
  getNextDifficulty,
} from '../types';
import {
  getStreakData,
  updateStreak,
  getBookmarks,
  saveBookmark,
  removeBookmark,
  saveSessionBackup,
  clearSessionBackup,
  getSessionBackup,
} from '../utils/persistence';
import { categorizeErrors, generateCoachingTip } from '../utils/scoring';
import { calculateDictationAccuracy, calculateDictationWPM } from '@shared/dictation-utils';

// ============================================================================
// STATE TYPES
// ============================================================================

interface DictationState {
  // Mode & Settings
  practiceMode: PracticeMode;
  showModeSelector: boolean;
  isWaitingToStart: boolean;
  
  // Test Settings
  difficulty: DifficultyLevel;
  speedLevel: string;
  category: string;
  sessionLength: number;
  
  // Session Progress
  sessionProgress: number;
  sessionComplete: boolean;
  sessionStats: SessionStats;
  sessionHistory: SessionHistoryItem[];
  shownSentenceIds: number[];
  
  // Test State
  testState: DictationTestState;
  elapsedTime: number;
  
  // Adaptive Difficulty
  adaptiveDifficulty: AdaptiveDifficultyConfig;
  difficultyJustChanged: { from: string; to: string; direction: 'up' | 'down' } | null;
  
  // Coaching
  currentCoachingTip: CoachingTip | null;
  
  // Streak & Bookmarks
  streakData: StreakData;
  bookmarks: BookmarkedSentence[];
  
  // UI State
  showHistory: boolean;
  showAnalytics: boolean;
  showBookmarks: boolean;
  showSettings: boolean;
  
  // Zen Mode
  isZenMode: boolean;
  zenTheme: ZenTheme;
  currentEncouragement: string;
  
  // Loading & Errors
  isLoading: boolean;
  error: string | null;
  
  // Last saved test ID
  lastTestResultId: number | null;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

type DictationAction =
  | { type: 'SET_PRACTICE_MODE'; payload: PracticeMode }
  | { type: 'SET_SHOW_MODE_SELECTOR'; payload: boolean }
  | { type: 'SET_IS_WAITING_TO_START'; payload: boolean }
  | { type: 'SET_DIFFICULTY'; payload: DifficultyLevel }
  | { type: 'SET_SPEED_LEVEL'; payload: string }
  | { type: 'SET_CATEGORY'; payload: string }
  | { type: 'SET_SESSION_LENGTH'; payload: number }
  | { type: 'SET_SESSION_PROGRESS'; payload: number }
  | { type: 'INCREMENT_SESSION_PROGRESS' }
  | { type: 'SET_SESSION_COMPLETE'; payload: boolean }
  | { type: 'SET_SESSION_STATS'; payload: SessionStats }
  | { type: 'UPDATE_SESSION_STATS'; payload: Partial<SessionStats> }
  | { type: 'ADD_SESSION_HISTORY'; payload: SessionHistoryItem }
  | { type: 'CLEAR_SESSION_HISTORY' }
  | { type: 'ADD_SHOWN_SENTENCE_ID'; payload: number }
  | { type: 'CLEAR_SHOWN_SENTENCE_IDS' }
  | { type: 'SET_TEST_STATE'; payload: Partial<DictationTestState> }
  | { type: 'RESET_TEST_STATE' }
  | { type: 'SET_ELAPSED_TIME'; payload: number }
  | { type: 'INCREMENT_ELAPSED_TIME' }
  | { type: 'SET_ADAPTIVE_DIFFICULTY'; payload: Partial<AdaptiveDifficultyConfig> }
  | { type: 'SET_DIFFICULTY_JUST_CHANGED'; payload: DictationState['difficultyJustChanged'] }
  | { type: 'SET_COACHING_TIP'; payload: CoachingTip | null }
  | { type: 'SET_STREAK_DATA'; payload: StreakData }
  | { type: 'SET_BOOKMARKS'; payload: BookmarkedSentence[] }
  | { type: 'TOGGLE_BOOKMARK'; payload: BookmarkedSentence }
  | { type: 'REMOVE_BOOKMARK'; payload: number }
  | { type: 'SET_SHOW_HISTORY'; payload: boolean }
  | { type: 'SET_SHOW_ANALYTICS'; payload: boolean }
  | { type: 'SET_SHOW_BOOKMARKS'; payload: boolean }
  | { type: 'SET_SHOW_SETTINGS'; payload: boolean }
  | { type: 'SET_IS_ZEN_MODE'; payload: boolean }
  | { type: 'SET_ZEN_THEME'; payload: ZenTheme }
  | { type: 'SET_CURRENT_ENCOURAGEMENT'; payload: string }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LAST_TEST_RESULT_ID'; payload: number | null }
  | { type: 'RESET_SESSION' }
  | { type: 'RESTORE_SESSION'; payload: Partial<DictationState> };

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: DictationState = {
  practiceMode: 'quick',
  showModeSelector: true,
  isWaitingToStart: false,
  difficulty: 'easy',
  speedLevel: '1.0',
  category: 'all',
  sessionLength: 5,
  sessionProgress: 0,
  sessionComplete: false,
  sessionStats: { ...INITIAL_SESSION_STATS },
  sessionHistory: [],
  shownSentenceIds: [],
  testState: { ...INITIAL_TEST_STATE },
  elapsedTime: 0,
  adaptiveDifficulty: { ...INITIAL_ADAPTIVE_CONFIG },
  difficultyJustChanged: null,
  currentCoachingTip: null,
  streakData: getStreakData(),
  bookmarks: getBookmarks(),
  showHistory: false,
  showAnalytics: false,
  showBookmarks: false,
  showSettings: false,
  isZenMode: false,
  zenTheme: 'ocean',
  currentEncouragement: '',
  isLoading: false,
  error: null,
  lastTestResultId: null,
};

// ============================================================================
// REDUCER
// ============================================================================

function dictationReducer(state: DictationState, action: DictationAction): DictationState {
  switch (action.type) {
    case 'SET_PRACTICE_MODE':
      return { ...state, practiceMode: action.payload };
    case 'SET_SHOW_MODE_SELECTOR':
      return { ...state, showModeSelector: action.payload };
    case 'SET_IS_WAITING_TO_START':
      return { ...state, isWaitingToStart: action.payload };
    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.payload };
    case 'SET_SPEED_LEVEL':
      return { ...state, speedLevel: action.payload };
    case 'SET_CATEGORY':
      return { ...state, category: action.payload };
    case 'SET_SESSION_LENGTH':
      return { ...state, sessionLength: action.payload };
    case 'SET_SESSION_PROGRESS':
      return { ...state, sessionProgress: action.payload };
    case 'INCREMENT_SESSION_PROGRESS':
      return { ...state, sessionProgress: state.sessionProgress + 1 };
    case 'SET_SESSION_COMPLETE':
      return { ...state, sessionComplete: action.payload };
    case 'SET_SESSION_STATS':
      return { ...state, sessionStats: action.payload };
    case 'UPDATE_SESSION_STATS':
      return { ...state, sessionStats: { ...state.sessionStats, ...action.payload } };
    case 'ADD_SESSION_HISTORY':
      return { ...state, sessionHistory: [...state.sessionHistory, action.payload] };
    case 'CLEAR_SESSION_HISTORY':
      return { ...state, sessionHistory: [] };
    case 'ADD_SHOWN_SENTENCE_ID':
      return { ...state, shownSentenceIds: [...state.shownSentenceIds, action.payload] };
    case 'CLEAR_SHOWN_SENTENCE_IDS':
      return { ...state, shownSentenceIds: [] };
    case 'SET_TEST_STATE':
      return { ...state, testState: { ...state.testState, ...action.payload } };
    case 'RESET_TEST_STATE':
      return { ...state, testState: { ...INITIAL_TEST_STATE } };
    case 'SET_ELAPSED_TIME':
      return { ...state, elapsedTime: action.payload };
    case 'INCREMENT_ELAPSED_TIME':
      return { ...state, elapsedTime: state.elapsedTime + 1 };
    case 'SET_ADAPTIVE_DIFFICULTY':
      return { ...state, adaptiveDifficulty: { ...state.adaptiveDifficulty, ...action.payload } };
    case 'SET_DIFFICULTY_JUST_CHANGED':
      return { ...state, difficultyJustChanged: action.payload };
    case 'SET_COACHING_TIP':
      return { ...state, currentCoachingTip: action.payload };
    case 'SET_STREAK_DATA':
      return { ...state, streakData: action.payload };
    case 'SET_BOOKMARKS':
      return { ...state, bookmarks: action.payload };
    case 'TOGGLE_BOOKMARK': {
      const exists = state.bookmarks.some(b => b.id === action.payload.id);
      if (exists) {
        const newBookmarks = removeBookmark(action.payload.id);
        return { ...state, bookmarks: newBookmarks };
      } else {
        const newBookmarks = saveBookmark(action.payload);
        return { ...state, bookmarks: newBookmarks };
      }
    }
    case 'REMOVE_BOOKMARK': {
      const newBookmarks = removeBookmark(action.payload);
      return { ...state, bookmarks: newBookmarks };
    }
    case 'SET_SHOW_HISTORY':
      return { ...state, showHistory: action.payload };
    case 'SET_SHOW_ANALYTICS':
      return { ...state, showAnalytics: action.payload };
    case 'SET_SHOW_BOOKMARKS':
      return { ...state, showBookmarks: action.payload };
    case 'SET_SHOW_SETTINGS':
      return { ...state, showSettings: action.payload };
    case 'SET_IS_ZEN_MODE':
      return { ...state, isZenMode: action.payload };
    case 'SET_ZEN_THEME':
      return { ...state, zenTheme: action.payload };
    case 'SET_CURRENT_ENCOURAGEMENT':
      return { ...state, currentEncouragement: action.payload };
    case 'SET_IS_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LAST_TEST_RESULT_ID':
      return { ...state, lastTestResultId: action.payload };
    case 'RESET_SESSION':
      clearSessionBackup();
      return {
        ...state,
        sessionProgress: 0,
        sessionComplete: false,
        sessionStats: { ...INITIAL_SESSION_STATS },
        sessionHistory: [],
        shownSentenceIds: [],
        testState: { ...INITIAL_TEST_STATE },
        elapsedTime: 0,
        currentCoachingTip: null,
        showModeSelector: true,
        isWaitingToStart: false,
        lastTestResultId: null,
      };
    case 'RESTORE_SESSION':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface DictationContextValue {
  state: DictationState;
  dispatch: React.Dispatch<DictationAction>;
  
  // Convenience actions
  actions: {
    startPracticeMode: (mode: PracticeMode) => void;
    beginSession: () => void;
    resetSession: () => void;
    restartCurrentSession: () => void;
    setTypedText: (text: string) => void;
    incrementReplayCount: () => void;
    toggleHint: () => void;
    toggleBookmark: () => void;
    handleTestComplete: (result: DictationTestResult, duration: number) => void;
    enterZenMode: () => void;
    exitZenMode: () => void;
    saveProgress: () => void;
    checkForSessionRecovery: () => boolean;
    recoverSession: () => void;
  };
}

const DictationContext = createContext<DictationContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface DictationProviderProps {
  children: ReactNode;
}

export function DictationProvider({ children }: DictationProviderProps) {
  const [state, dispatch] = useReducer(dictationReducer, initialState);
  
  // Clear difficulty changed notification after timeout
  useEffect(() => {
    if (state.difficultyJustChanged) {
      const timer = setTimeout(() => {
        dispatch({ type: 'SET_DIFFICULTY_JUST_CHANGED', payload: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.difficultyJustChanged]);
  
  // Convenience actions
  const startPracticeMode = useCallback((mode: PracticeMode) => {
    const config = PRACTICE_MODES[mode];
    dispatch({ type: 'SET_PRACTICE_MODE', payload: mode });
    dispatch({ type: 'SET_DIFFICULTY', payload: config.defaultDifficulty });
    dispatch({ type: 'SET_SPEED_LEVEL', payload: '0.8' });
    dispatch({ type: 'SET_SESSION_LENGTH', payload: 1 });
    dispatch({ type: 'CLEAR_SHOWN_SENTENCE_IDS' });
    dispatch({ type: 'RESET_TEST_STATE' });
    dispatch({ type: 'SET_SHOW_MODE_SELECTOR', payload: false });
    dispatch({ type: 'SET_IS_WAITING_TO_START', payload: true });
  }, []);
  
  const beginSession = useCallback(() => {
    dispatch({ type: 'SET_IS_WAITING_TO_START', payload: false });
  }, []);
  
  const resetSession = useCallback(() => {
    dispatch({ type: 'RESET_SESSION' });
  }, []);
  
  const restartCurrentSession = useCallback(() => {
    dispatch({ type: 'SET_SESSION_PROGRESS', payload: 0 });
    dispatch({ type: 'SET_SESSION_COMPLETE', payload: false });
    dispatch({ type: 'SET_SESSION_STATS', payload: { ...INITIAL_SESSION_STATS } });
    dispatch({ type: 'CLEAR_SESSION_HISTORY' });
    dispatch({ type: 'SET_COACHING_TIP', payload: null });
    dispatch({ type: 'SET_ELAPSED_TIME', payload: 0 });
    dispatch({ type: 'CLEAR_SHOWN_SENTENCE_IDS' });
    dispatch({ type: 'RESET_TEST_STATE' });
  }, []);
  
  const setTypedText = useCallback((text: string) => {
    dispatch({ type: 'SET_TEST_STATE', payload: { typedText: text } });
  }, []);
  
  const incrementReplayCount = useCallback(() => {
    dispatch({ 
      type: 'SET_TEST_STATE', 
      payload: { replayCount: state.testState.replayCount + 1 } 
    });
  }, [state.testState.replayCount]);
  
  const toggleHint = useCallback(() => {
    const newShowHint = !state.testState.showHint;
    dispatch({
      type: 'SET_TEST_STATE',
      payload: {
        showHint: newShowHint,
        hintShown: newShowHint ? true : state.testState.hintShown,
      },
    });
  }, [state.testState.showHint, state.testState.hintShown]);
  
  const toggleBookmark = useCallback(() => {
    const { sentence, result } = state.testState;
    if (!sentence) return;
    
    const bookmark: BookmarkedSentence = {
      id: sentence.id,
      sentence: sentence.sentence,
      category: sentence.category || 'general',
      difficulty: sentence.difficulty,
      bookmarkedAt: Date.now(),
      lastAccuracy: result?.accuracy,
    };
    
    dispatch({ type: 'TOGGLE_BOOKMARK', payload: bookmark });
  }, [state.testState]);
  
  const handleTestComplete = useCallback((
    result: DictationTestResult,
    duration: number
  ) => {
    const { sentence, hintShown, replayCount } = state.testState;
    if (!sentence) return;
    
    // Update test state
    dispatch({
      type: 'SET_TEST_STATE',
      payload: {
        endTime: Date.now(),
        isComplete: true,
        result,
      },
    });
    
    // Create history item
    const errorCategories = categorizeErrors(result.characterDiff);
    const historyItem: SessionHistoryItem = {
      sentence: sentence.sentence,
      typedText: state.testState.typedText,
      accuracy: result.accuracy,
      wpm: result.wpm,
      errors: result.errors,
      timestamp: Date.now(),
      errorCategories,
    };
    dispatch({ type: 'ADD_SESSION_HISTORY', payload: historyItem });
    
    // Update session stats
    const newStats: SessionStats = {
      totalWpm: state.sessionStats.totalWpm + result.wpm,
      totalAccuracy: state.sessionStats.totalAccuracy + result.accuracy,
      totalErrors: state.sessionStats.totalErrors + result.errors,
      count: state.sessionStats.count + 1,
    };
    dispatch({ type: 'SET_SESSION_STATS', payload: newStats });
    
    // Generate coaching tip
    const tip = generateCoachingTip(
      result.accuracy,
      result.wpm,
      errorCategories,
      newStats,
      hintShown,
      replayCount
    );
    dispatch({ type: 'SET_COACHING_TIP', payload: tip });
    
    // Update progress
    dispatch({ type: 'INCREMENT_SESSION_PROGRESS' });
    
    // Update streak
    const newStreakData = updateStreak();
    dispatch({ type: 'SET_STREAK_DATA', payload: newStreakData });
    
    // Handle adaptive difficulty
    if (state.adaptiveDifficulty.enabled) {
      const isHighScore = result.accuracy >= ADAPTIVE_THRESHOLDS.upgradeAccuracy && 
                          result.wpm >= ADAPTIVE_THRESHOLDS.upgradeWpm;
      const isLowScore = result.accuracy < ADAPTIVE_THRESHOLDS.downgradeAccuracy;
      
      const newRecentScores = [
        ...state.adaptiveDifficulty.recentScores,
        { accuracy: result.accuracy, wpm: result.wpm }
      ].slice(-ADAPTIVE_THRESHOLDS.maxRecentScores);
      
      let newConsecutiveHigh = isHighScore 
        ? state.adaptiveDifficulty.consecutiveHighScores + 1 
        : 0;
      let newConsecutiveLow = isLowScore 
        ? state.adaptiveDifficulty.consecutiveLowScores + 1 
        : 0;
      let newLevel = state.adaptiveDifficulty.currentLevel;
      
      if (newConsecutiveHigh >= ADAPTIVE_THRESHOLDS.upgradeConsecutive && 
          state.adaptiveDifficulty.currentLevel !== 'hard') {
        newLevel = getNextDifficulty(state.adaptiveDifficulty.currentLevel, 'up');
        dispatch({ type: 'SET_DIFFICULTY', payload: newLevel });
        dispatch({
          type: 'SET_DIFFICULTY_JUST_CHANGED',
          payload: { 
            from: state.adaptiveDifficulty.currentLevel, 
            to: newLevel, 
            direction: 'up' 
          },
        });
        newConsecutiveHigh = 0;
        newConsecutiveLow = 0;
      } else if (newConsecutiveLow >= ADAPTIVE_THRESHOLDS.downgradeConsecutive && 
                 state.adaptiveDifficulty.currentLevel !== 'easy') {
        newLevel = getNextDifficulty(state.adaptiveDifficulty.currentLevel, 'down');
        dispatch({ type: 'SET_DIFFICULTY', payload: newLevel });
        dispatch({
          type: 'SET_DIFFICULTY_JUST_CHANGED',
          payload: { 
            from: state.adaptiveDifficulty.currentLevel, 
            to: newLevel, 
            direction: 'down' 
          },
        });
        newConsecutiveHigh = 0;
        newConsecutiveLow = 0;
      }
      
      dispatch({
        type: 'SET_ADAPTIVE_DIFFICULTY',
        payload: {
          currentLevel: newLevel,
          consecutiveHighScores: newConsecutiveHigh,
          consecutiveLowScores: newConsecutiveLow,
          recentScores: newRecentScores,
        },
      });
    }
    
    // Check if session is complete
    if (state.sessionProgress + 1 >= state.sessionLength) {
      dispatch({ type: 'SET_SESSION_COMPLETE', payload: true });
      clearSessionBackup();
    }
  }, [state]);
  
  const enterZenMode = useCallback(() => {
    dispatch({ type: 'SET_IS_ZEN_MODE', payload: true });
  }, []);
  
  const exitZenMode = useCallback(() => {
    dispatch({ type: 'SET_IS_ZEN_MODE', payload: false });
  }, []);
  
  const saveProgress = useCallback(() => {
    if (state.sessionProgress === 0) return;
    
    const backup: Parameters<typeof saveSessionBackup>[0] = {
      practiceMode: state.practiceMode,
      difficulty: state.difficulty,
      speedLevel: state.speedLevel,
      category: state.category,
      sessionLength: state.sessionLength,
      sessionProgress: state.sessionProgress,
      sessionStats: state.sessionStats,
      sessionHistory: state.sessionHistory,
      shownSentenceIds: state.shownSentenceIds,
      adaptiveDifficulty: state.adaptiveDifficulty,
    };
    
    if (state.testState.sentence && !state.testState.isComplete) {
      backup.testState = {
        sentenceId: state.testState.sentence.id,
        sentence: state.testState.sentence.sentence,
        typedText: state.testState.typedText,
        replayCount: state.testState.replayCount,
        hintShown: state.testState.hintShown,
      };
    }
    
    saveSessionBackup(backup);
  }, [state]);
  
  const checkForSessionRecovery = useCallback((): boolean => {
    const backup = getSessionBackup();
    return backup !== null && backup.sessionProgress > 0;
  }, []);
  
  const recoverSession = useCallback(() => {
    const backup = getSessionBackup();
    if (!backup) return;
    
    dispatch({
      type: 'RESTORE_SESSION',
      payload: {
        practiceMode: backup.practiceMode,
        difficulty: backup.difficulty,
        speedLevel: backup.speedLevel,
        category: backup.category,
        sessionLength: backup.sessionLength,
        sessionProgress: backup.sessionProgress,
        sessionStats: backup.sessionStats,
        sessionHistory: backup.sessionHistory,
        shownSentenceIds: backup.shownSentenceIds,
        adaptiveDifficulty: backup.adaptiveDifficulty,
        showModeSelector: false,
        isWaitingToStart: false,
      },
    });
  }, []);
  
  const actions = useMemo(() => ({
    startPracticeMode,
    beginSession,
    resetSession,
    restartCurrentSession,
    setTypedText,
    incrementReplayCount,
    toggleHint,
    toggleBookmark,
    handleTestComplete,
    enterZenMode,
    exitZenMode,
    saveProgress,
    checkForSessionRecovery,
    recoverSession,
  }), [
    startPracticeMode,
    beginSession,
    resetSession,
    restartCurrentSession,
    setTypedText,
    incrementReplayCount,
    toggleHint,
    toggleBookmark,
    handleTestComplete,
    enterZenMode,
    exitZenMode,
    saveProgress,
    checkForSessionRecovery,
    recoverSession,
  ]);
  
  const value = useMemo(() => ({
    state,
    dispatch,
    actions,
  }), [state, actions]);
  
  return (
    <DictationContext.Provider value={value}>
      {children}
    </DictationContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useDictation() {
  const context = useContext(DictationContext);
  if (!context) {
    throw new Error('useDictation must be used within a DictationProvider');
  }
  return context;
}

export function useDictationState() {
  const { state } = useDictation();
  return state;
}

export function useDictationActions() {
  const { actions, dispatch } = useDictation();
  return { actions, dispatch };
}
