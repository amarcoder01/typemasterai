import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Volume2, RotateCcw, Eye, EyeOff, Check, ChevronRight, Mic, Share2, HelpCircle, Flame, Trophy, Target, Zap, Clock, History, TrendingUp, Award, Sparkles, AlertCircle, Lightbulb, X, ChevronDown, ChevronUp, BarChart3, Bookmark, BookmarkCheck, Calendar, Star, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { calculateDictationAccuracy, calculateDictationWPM, getSpeedRate, getSpeedLevelName, getAccuracyGrade, type CharacterDiff } from '@shared/dictation-utils';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { DictationSentence } from '@shared/schema';
import { ShareModal } from '@/components/ShareModal';

type PracticeMode = 'quick' | 'focus' | 'challenge';

interface PracticeModeConfig {
  name: string;
  description: string;
  icon: React.ReactNode;
  autoAdvance: boolean;
  hintsAllowed: boolean;
  timerPressure: boolean;
  defaultSpeed: string;
  defaultDifficulty: string;
}

const PRACTICE_MODES: Record<PracticeMode, PracticeModeConfig> = {
  quick: {
    name: 'Quick Practice',
    description: 'Fast-paced sessions with auto-advance',
    icon: <Zap className="w-5 h-5" />,
    autoAdvance: true,
    hintsAllowed: true,
    timerPressure: false,
    defaultSpeed: '1.0',
    defaultDifficulty: 'easy',
  },
  focus: {
    name: 'Focus Mode',
    description: 'Distraction-free practice at your pace',
    icon: <Target className="w-5 h-5" />,
    autoAdvance: false,
    hintsAllowed: true,
    timerPressure: false,
    defaultSpeed: '0.8',
    defaultDifficulty: 'easy',
  },
  challenge: {
    name: 'Challenge Mode',
    description: 'No hints, harder difficulty, prove your skills',
    icon: <Trophy className="w-5 h-5" />,
    autoAdvance: true,
    hintsAllowed: false,
    timerPressure: true,
    defaultSpeed: '1.3',
    defaultDifficulty: 'easy',
  },
};

interface ErrorCategory {
  type: 'spelling' | 'punctuation' | 'capitalization' | 'missing' | 'extra' | 'word_order';
  count: number;
  examples: string[];
}

interface SessionHistoryItem {
  sentence: string;
  typedText: string;
  accuracy: number;
  wpm: number;
  errors: number;
  timestamp: number;
  errorCategories: ErrorCategory[];
}

interface CoachingTip {
  type: 'encouragement' | 'improvement' | 'warning' | 'achievement';
  message: string;
  icon: React.ReactNode;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

interface DictationTestState {
  sentence: DictationSentence | null;
  typedText: string;
  startTime: number | null;
  endTime: number | null;
  replayCount: number;
  hintShown: boolean;
  showHint: boolean;
  isComplete: boolean;
  result: {
    accuracy: number;
    wpm: number;
    errors: number;
    duration: number;
    characterDiff: CharacterDiff[];
    correctChars: number;
    totalChars: number;
  } | null;
}

const SESSION_LENGTH_OPTIONS = [
  { value: 3, label: '3 sentences (Warm-up)' },
  { value: 5, label: '5 sentences (Quick)' },
  { value: 10, label: '10 sentences (Standard)' },
  { value: 15, label: '15 sentences (Extended)' },
  { value: 20, label: '20 sentences (Long)' },
  { value: 25, label: '25 sentences (Marathon)' },
  { value: 30, label: '30 sentences (Endurance)' },
  { value: 50, label: '50 sentences (Challenge)' },
  { value: 75, label: '75 sentences (Ultra)' },
  { value: 100, label: '100 sentences (Master)' },
  { value: 0, label: 'Custom...' },
];

const CATEGORIES = [
  { value: 'all', label: 'All Topics' },
  { value: 'general', label: 'General' },
  { value: 'business', label: 'Business' },
  { value: 'technology', label: 'Technology' },
  { value: 'science', label: 'Science' },
  { value: 'culture', label: 'Culture' },
  { value: 'environment', label: 'Environment' },
  { value: 'health', label: 'Health' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'education', label: 'Education' },
];

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string;
  totalSessions: number;
}

interface AdaptiveDifficultyConfig {
  enabled: boolean;
  currentLevel: 'easy' | 'medium' | 'hard';
  consecutiveHighScores: number;
  consecutiveLowScores: number;
  recentScores: { accuracy: number; wpm: number }[];
}

const ADAPTIVE_THRESHOLDS = {
  upgradeAccuracy: 90,
  upgradeWpm: 30,
  upgradeConsecutive: 3,
  downgradeAccuracy: 70,
  downgradeConsecutive: 2,
  maxRecentScores: 5,
};

const DIFFICULTY_ORDER: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];

function getNextDifficulty(current: 'easy' | 'medium' | 'hard', direction: 'up' | 'down'): 'easy' | 'medium' | 'hard' {
  const currentIndex = DIFFICULTY_ORDER.indexOf(current);
  if (direction === 'up') {
    return DIFFICULTY_ORDER[Math.min(currentIndex + 1, DIFFICULTY_ORDER.length - 1)];
  } else {
    return DIFFICULTY_ORDER[Math.max(currentIndex - 1, 0)];
  }
}

function getDifficultyEmoji(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return '🟢';
    case 'medium': return '🟡';
    case 'hard': return '🔴';
    default: return '';
  }
}

interface BookmarkedSentence {
  id: number;
  sentence: string;
  category: string;
  difficulty: string;
  bookmarkedAt: number;
  lastAccuracy?: number;
}

const STREAK_STORAGE_KEY = 'dictation_streak';
const BOOKMARKS_STORAGE_KEY = 'dictation_bookmarks';
const VOICE_STORAGE_KEY = 'dictation_voice';

function getStreakData(): StreakData {
  try {
    const stored = localStorage.getItem(STREAK_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse streak data:', e);
  }
  return { currentStreak: 0, longestStreak: 0, lastPracticeDate: '', totalSessions: 0 };
}

function updateStreak(): StreakData {
  const data = getStreakData();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  let newStreak = data.currentStreak;
  
  if (data.lastPracticeDate !== today) {
    if (data.lastPracticeDate === yesterday) {
      newStreak = data.currentStreak + 1;
    } else {
      newStreak = 1;
    }
  }
  
  const newData: StreakData = {
    currentStreak: newStreak,
    longestStreak: Math.max(data.longestStreak, newStreak),
    lastPracticeDate: today,
    totalSessions: data.totalSessions + 1,
  };
  
  localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(newData));
  return newData;
}

function getSavedVoice(): string | null {
  try {
    return localStorage.getItem(VOICE_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

function saveVoiceSelection(voiceURI: string): void {
  try {
    localStorage.setItem(VOICE_STORAGE_KEY, voiceURI);
  } catch (e) {
    console.error('Failed to save voice selection:', e);
  }
}

function getBookmarks(): BookmarkedSentence[] {
  try {
    const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse bookmarks:', e);
  }
  return [];
}

function saveBookmark(sentence: BookmarkedSentence): BookmarkedSentence[] {
  const bookmarks = getBookmarks();
  const existing = bookmarks.findIndex(b => b.id === sentence.id);
  if (existing >= 0) {
    bookmarks[existing] = sentence;
  } else {
    bookmarks.push(sentence);
  }
  localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
  return bookmarks;
}

function removeBookmark(id: number): BookmarkedSentence[] {
  const bookmarks = getBookmarks().filter(b => b.id !== id);
  localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
  return bookmarks;
}

function isBookmarked(id: number): boolean {
  return getBookmarks().some(b => b.id === id);
}

function categorizeErrors(characterDiff: CharacterDiff[], original: string, typed: string): ErrorCategory[] {
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

  let lastType: 'correct' | 'incorrect' | 'missing' | 'extra' | null = null;
  let buffer = '';
  
  for (let i = 0; i < characterDiff.length; i++) {
    const diff = characterDiff[i];
    
    if (diff.status === 'incorrect') {
      const origChar = original[i] || '';
      const typedChar = typed[i] || '';
      
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

function generateCoachingTip(
  accuracy: number,
  wpm: number,
  errorCategories: ErrorCategory[],
  sessionStats: { count: number; totalAccuracy: number; totalWpm: number },
  hintUsed: boolean,
  replayCount: number
): CoachingTip {
  if (accuracy >= 100) {
    return {
      type: 'achievement',
      message: 'Perfect transcription! You have excellent listening skills.',
      icon: <Sparkles className="w-5 h-5 text-yellow-500" />,
    };
  }
  
  if (accuracy >= 95) {
    return {
      type: 'encouragement',
      message: 'Excellent work! Just minor adjustments needed.',
      icon: <Award className="w-5 h-5 text-green-500" />,
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
      icon: <Lightbulb className="w-5 h-5 text-blue-500" />,
    };
  }

  if (hintUsed) {
    return {
      type: 'improvement',
      message: 'Try completing the next sentence without using hints!',
      icon: <Target className="w-5 h-5 text-orange-500" />,
    };
  }

  if (replayCount > 2) {
    return {
      type: 'improvement',
      message: 'Challenge yourself to use fewer replays next time.',
      icon: <TrendingUp className="w-5 h-5 text-purple-500" />,
    };
  }

  return {
    type: 'encouragement',
    message: 'Good effort! Keep practicing to build your skills.',
    icon: <Flame className="w-5 h-5 text-orange-500" />,
  };
}

function calculateAchievements(
  sessionStats: { count: number; totalAccuracy: number; totalWpm: number; totalErrors: number },
  sessionHistory: SessionHistoryItem[]
): Achievement[] {
  const avgAccuracy = sessionStats.count > 0 ? sessionStats.totalAccuracy / sessionStats.count : 0;
  const avgWpm = sessionStats.count > 0 ? sessionStats.totalWpm / sessionStats.count : 0;
  const perfectCount = sessionHistory.filter(h => h.accuracy === 100).length;

  return [
    {
      id: 'speed_demon',
      name: 'Speed Demon',
      description: 'Average 50+ WPM in a session',
      icon: <Zap className="w-4 h-4" />,
      unlocked: avgWpm >= 50,
      progress: Math.min(avgWpm, 50),
      target: 50,
    },
    {
      id: 'perfectionist',
      name: 'Perfectionist',
      description: 'Get 3 perfect scores in one session',
      icon: <Trophy className="w-4 h-4" />,
      unlocked: perfectCount >= 3,
      progress: perfectCount,
      target: 3,
    },
    {
      id: 'accuracy_ace',
      name: 'Accuracy Ace',
      description: 'Maintain 95%+ average accuracy',
      icon: <Target className="w-4 h-4" />,
      unlocked: avgAccuracy >= 95 && sessionStats.count >= 3,
      progress: Math.min(avgAccuracy, 95),
      target: 95,
    },
    {
      id: 'marathon',
      name: 'Marathon Runner',
      description: 'Complete 10+ sentences in one session',
      icon: <Flame className="w-4 h-4" />,
      unlocked: sessionStats.count >= 10,
      progress: sessionStats.count,
      target: 10,
    },
  ];
}

export default function DictationTest() {
  const { toast } = useToast();
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('quick');
  const [showModeSelector, setShowModeSelector] = useState(true);
  const [difficulty, setDifficulty] = useState<string>('easy');
  const [speedLevel, setSpeedLevel] = useState<string>('1.0');
  const [category, setCategory] = useState<string>('all');
  const [sessionLength, setSessionLength] = useState<number>(5);
  const [showCustomLength, setShowCustomLength] = useState(false);
  const [customLengthInput, setCustomLengthInput] = useState<string>('');
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [currentCoachingTip, setCurrentCoachingTip] = useState<CoachingTip | null>(null);
  const [testState, setTestState] = useState<DictationTestState>({
    sentence: null,
    typedText: '',
    startTime: null,
    endTime: null,
    replayCount: 0,
    hintShown: false,
    showHint: false,
    isComplete: false,
    result: null,
  });
  const [sessionProgress, setSessionProgress] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState<{
    totalWpm: number;
    totalAccuracy: number;
    totalErrors: number;
    count: number;
  }>({
    totalWpm: 0,
    totalAccuracy: 0,
    totalErrors: 0,
    count: 0,
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const [showKeyboardGuide, setShowKeyboardGuide] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [lastTestResultId, setLastTestResultId] = useState<number | null>(null);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [streakData, setStreakData] = useState<StreakData>(() => getStreakData());
  const [bookmarks, setBookmarks] = useState<BookmarkedSentence[]>(() => getBookmarks());
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isWaitingToStart, setIsWaitingToStart] = useState(false);
  
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState<AdaptiveDifficultyConfig>({
    enabled: false,
    currentLevel: 'easy',
    consecutiveHighScores: 0,
    consecutiveLowScores: 0,
    recentScores: [],
  });
  const [difficultyJustChanged, setDifficultyJustChanged] = useState<{
    from: string;
    to: string;
    direction: 'up' | 'down';
  } | null>(null);

  useEffect(() => {
    if (difficultyJustChanged) {
      const timer = setTimeout(() => {
        setDifficultyJustChanged(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [difficultyJustChanged]);
  
  const currentRate = getSpeedRate(speedLevel);
  const { speak, cancel, isSpeaking, isSupported, error: speechError, voices, setVoice, currentVoice } = useSpeechSynthesis({
    rate: currentRate,
    lang: 'en-US',
  });

  const englishVoices = voices.filter(v => v.lang.startsWith('en'));

  const handleVoiceChange = (voiceUri: string) => {
    const selectedVoice = voices.find(v => v.voiceURI === voiceUri);
    if (selectedVoice) {
      setVoice(selectedVoice);
      saveVoiceSelection(voiceUri);
    }
  };

  useEffect(() => {
    if (voices.length > 0) {
      const savedVoiceURI = getSavedVoice();
      if (savedVoiceURI) {
        const savedVoice = voices.find(v => v.voiceURI === savedVoiceURI);
        if (savedVoice) {
          setVoice(savedVoice);
        }
      }
    }
  }, [voices, setVoice]);

  const handleSessionLengthChange = (value: string) => {
    const numValue = parseInt(value);
    if (numValue === 0) {
      setShowCustomLength(true);
    } else {
      setSessionLength(numValue);
      setShowCustomLength(false);
    }
  };

  const handleCustomLengthSubmit = () => {
    const value = parseInt(customLengthInput);
    if (value >= 1 && value <= 500) {
      setSessionLength(value);
      setShowCustomLength(false);
      setCustomLengthInput('');
    } else {
      toast({
        title: 'Invalid session length',
        description: 'Please enter a number between 1 and 500',
        variant: 'destructive',
      });
    }
  };

  const toggleBookmark = useCallback(() => {
    if (!testState.sentence) return;
    
    const sentenceId = testState.sentence.id;
    const isCurrentlyBookmarked = bookmarks.some(b => b.id === sentenceId);
    
    if (isCurrentlyBookmarked) {
      const newBookmarks = removeBookmark(sentenceId);
      setBookmarks(newBookmarks);
      toast({
        title: 'Bookmark removed',
        description: 'Sentence removed from your bookmarks',
      });
    } else {
      const newBookmark: BookmarkedSentence = {
        id: sentenceId,
        sentence: testState.sentence.sentence,
        category: testState.sentence.category || 'general',
        difficulty: testState.sentence.difficulty,
        bookmarkedAt: Date.now(),
        lastAccuracy: testState.result?.accuracy,
      };
      const newBookmarks = saveBookmark(newBookmark);
      setBookmarks(newBookmarks);
      toast({
        title: 'Sentence bookmarked',
        description: 'Added to your practice list for later review',
      });
    }
  }, [testState.sentence, testState.result, bookmarks, toast]);

  const practiceBookmarkedSentence = useCallback((bookmark: BookmarkedSentence) => {
    const words = bookmark.sentence.split(/\s+/).length;
    setTestState({
      sentence: {
        id: bookmark.id,
        sentence: bookmark.sentence,
        difficulty: bookmark.difficulty,
        category: bookmark.category,
        wordCount: words,
        characterCount: bookmark.sentence.length,
        createdAt: new Date(),
      },
      typedText: '',
      startTime: null,
      endTime: null,
      replayCount: 0,
      hintShown: false,
      showHint: false,
      isComplete: false,
      result: null,
    });
    setShowBookmarks(false);
    setTimeout(() => {
      speak(bookmark.sentence);
    }, 500);
  }, [speak]);

  const { refetch: fetchNewSentence, isLoading } = useQuery({
    queryKey: ['dictation-sentence', difficulty, category],
    queryFn: async () => {
      const categoryParam = category !== 'all' ? `&category=${category}` : '';
      const res = await fetch(`/api/dictation/sentence?difficulty=${difficulty}${categoryParam}`);
      if (!res.ok) throw new Error('Failed to fetch sentence');
      const data = await res.json();
      return data.sentence as DictationSentence;
    },
    enabled: false,
  });

  const saveTestMutation = useMutation({
    mutationFn: async (testData: {
      sentenceId: number;
      speedLevel: string;
      actualSpeed: number;
      actualSentence: string;
      typedText: string;
      wpm: number;
      accuracy: number;
      errors: number;
      replayCount: number;
      hintUsed: number;
      duration: number;
    }) => {
      const res = await fetch('/api/dictation/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(testData),
      });
      if (!res.ok) {
        if (res.status === 401) {
          toast({
            title: 'Please log in',
            description: 'You need to be logged in to save your progress',
            variant: 'destructive',
          });
          return null;
        }
        throw new Error('Failed to save test');
      }
      return res.json();
    },
  });

  const startNewTest = useCallback(async (forceStart: boolean = false) => {
    if (!forceStart && sessionProgress >= sessionLength) {
      setSessionComplete(true);
      return;
    }

    cancel();
    setAutoAdvanceCountdown(null);
    setElapsedTime(0);
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    
    try {
      const result = await fetchNewSentence();
      if (result.data) {
        setTestState({
          sentence: result.data,
          typedText: '',
          startTime: null,
          endTime: null,
          replayCount: 0,
          hintShown: false,
          showHint: false,
          isComplete: false,
          result: null,
        });
        
        setTimeout(() => {
          speak(result.data.sentence);
        }, 800);
      } else {
        toast({
          title: 'Failed to load sentence',
          description: 'Could not fetch a new sentence. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching sentence:', error);
      toast({
        title: 'Error',
        description: 'Failed to load next sentence. Please refresh the page.',
        variant: 'destructive',
      });
    }
  }, [cancel, fetchNewSentence, speak, sessionProgress, sessionLength, toast]);

  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'TEXTAREA' || 
                       activeElement?.tagName === 'INPUT' ||
                       activeElement?.getAttribute('contenteditable') === 'true';
      
      const key = e.key.toLowerCase();
      
      if (testState.isComplete && key === 'n' && !isTyping) {
        e.preventDefault();
        handleNextManual();
        return;
      }
      
      if (testState.isComplete || !testState.sentence) return;
      
      if (isTyping) return;
      
      if (key === 'r' && !isSpeaking && testState.sentence) {
        e.preventDefault();
        cancel();
        setTestState(prev => ({ ...prev, replayCount: prev.replayCount + 1 }));
        setTimeout(() => {
          if (testState.sentence) {
            speak(testState.sentence.sentence);
          }
        }, 200);
      }
      
      if (key === 'h' && !isSpeaking && testState.sentence && PRACTICE_MODES[practiceMode].hintsAllowed) {
        e.preventDefault();
        setTestState(prev => ({
          ...prev,
          showHint: !prev.showHint,
          hintShown: !prev.showHint ? true : prev.hintShown,
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [testState.isComplete, testState.sentence, isSpeaking, cancel, speak, practiceMode]);

  useEffect(() => {
    if (!isSpeaking && testState.sentence && !testState.startTime && !testState.isComplete) {
      setTestState(prev => ({ ...prev, startTime: Date.now() }));
      setElapsedTime(0);
      
      elapsedIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
    
    return () => {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
    };
  }, [isSpeaking, testState.sentence, testState.startTime, testState.isComplete]);

  const handleReplay = () => {
    if (testState.sentence && !isSpeaking) {
      cancel();
      setTestState(prev => ({ ...prev, replayCount: prev.replayCount + 1 }));
      setTimeout(() => {
        speak(testState.sentence!.sentence);
      }, 200);
    }
  };

  const toggleHint = () => {
    setTestState(prev => {
      const newShowHint = !prev.showHint;
      return {
        ...prev,
        showHint: newShowHint,
        hintShown: newShowHint ? true : prev.hintShown,
      };
    });
  };

  const handleSubmit = async () => {
    if (!testState.sentence || !testState.startTime || testState.isComplete || !testState.typedText.trim()) return;

    const currentSentence = testState.sentence;
    const currentTypedText = testState.typedText;
    const currentReplayCount = testState.replayCount;
    const currentHintShown = testState.hintShown;
    const currentStartTime = testState.startTime;
    
    const endTime = Date.now();
    // Use raw seconds for WPM calculation, rounded for display/storage
    const elapsedSeconds = (endTime - currentStartTime) / 1000;
    const duration = Math.round(elapsedSeconds);
    
    if (elapsedSeconds < 1) {
      toast({
        title: 'Too fast!',
        description: 'Please take your time to type the sentence.',
      });
      return;
    }
    
    const accuracyResult = calculateDictationAccuracy(
      currentTypedText,
      currentSentence.sentence
    );
    
    const wpm = calculateDictationWPM(
      currentTypedText.length,
      elapsedSeconds
    );

    const result = {
      accuracy: accuracyResult.accuracy,
      wpm,
      errors: accuracyResult.errors,
      duration,
      characterDiff: accuracyResult.characterDiff,
      correctChars: accuracyResult.correctChars,
      totalChars: accuracyResult.totalChars,
    };

    setTestState(prev => ({
      ...prev,
      endTime,
      isComplete: true,
      result,
    }));

    const errorCategories = categorizeErrors(
      accuracyResult.characterDiff,
      currentSentence.sentence,
      currentTypedText
    );

    setSessionHistory(prev => [...prev, {
      sentence: currentSentence.sentence,
      typedText: currentTypedText,
      accuracy: result.accuracy,
      wpm: result.wpm,
      errors: result.errors,
      timestamp: Date.now(),
      errorCategories,
    }]);

    const newSessionStats = {
      totalWpm: sessionStats.totalWpm + result.wpm,
      totalAccuracy: sessionStats.totalAccuracy + result.accuracy,
      totalErrors: sessionStats.totalErrors + result.errors,
      count: sessionStats.count + 1,
    };

    setSessionStats(newSessionStats);

    if (adaptiveDifficulty.enabled) {
      const isHighScore = result.accuracy >= ADAPTIVE_THRESHOLDS.upgradeAccuracy && 
                          result.wpm >= ADAPTIVE_THRESHOLDS.upgradeWpm;
      const isLowScore = result.accuracy < ADAPTIVE_THRESHOLDS.downgradeAccuracy;
      
      setAdaptiveDifficulty(prev => {
        const newRecentScores = [...prev.recentScores, { accuracy: result.accuracy, wpm: result.wpm }]
          .slice(-ADAPTIVE_THRESHOLDS.maxRecentScores);
        
        let newConsecutiveHigh = isHighScore ? prev.consecutiveHighScores + 1 : 0;
        let newConsecutiveLow = isLowScore ? prev.consecutiveLowScores + 1 : 0;
        let newLevel = prev.currentLevel;
        
        if (newConsecutiveHigh >= ADAPTIVE_THRESHOLDS.upgradeConsecutive && prev.currentLevel !== 'hard') {
          const nextLevel = getNextDifficulty(prev.currentLevel, 'up');
          setDifficulty(nextLevel);
          setDifficultyJustChanged({ from: prev.currentLevel, to: nextLevel, direction: 'up' });
          toast({
            title: `${getDifficultyEmoji(nextLevel)} Difficulty Increased!`,
            description: `Great job! Moving to ${nextLevel} difficulty.`,
          });
          newLevel = nextLevel;
          newConsecutiveHigh = 0;
          newConsecutiveLow = 0;
        } else if (newConsecutiveLow >= ADAPTIVE_THRESHOLDS.downgradeConsecutive && prev.currentLevel !== 'easy') {
          const nextLevel = getNextDifficulty(prev.currentLevel, 'down');
          setDifficulty(nextLevel);
          setDifficultyJustChanged({ from: prev.currentLevel, to: nextLevel, direction: 'down' });
          toast({
            title: `${getDifficultyEmoji(nextLevel)} Difficulty Adjusted`,
            description: `Switching to ${nextLevel} for better practice.`,
          });
          newLevel = nextLevel;
          newConsecutiveHigh = 0;
          newConsecutiveLow = 0;
        }
        
        return {
          ...prev,
          currentLevel: newLevel,
          consecutiveHighScores: newConsecutiveHigh,
          consecutiveLowScores: newConsecutiveLow,
          recentScores: newRecentScores,
        };
      });
    }

    const tip = generateCoachingTip(
      result.accuracy,
      result.wpm,
      errorCategories,
      newSessionStats,
      currentHintShown,
      currentReplayCount
    );
    setCurrentCoachingTip(tip);

    setSessionProgress(prev => prev + 1);
    
    const newStreakData = updateStreak();
    setStreakData(newStreakData);

    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }

    try {
      const saveResult = await saveTestMutation.mutateAsync({
        sentenceId: currentSentence.id,
        speedLevel,
        actualSpeed: currentRate,
        actualSentence: currentSentence.sentence,
        typedText: currentTypedText,
        wpm: result.wpm,
        accuracy: result.accuracy,
        errors: result.errors,
        replayCount: currentReplayCount,
        hintUsed: currentHintShown ? 1 : 0,
        duration: result.duration,
      });
      
      if (saveResult && saveResult.result && saveResult.result.id) {
        setLastTestResultId(saveResult.result.id);
      }
    } catch (error) {
      console.error('Failed to save test:', error);
      toast({
        title: 'Warning',
        description: 'Could not save your test result. Your progress may not be saved.',
      });
    }

    const modeConfig = PRACTICE_MODES[practiceMode];
    if (modeConfig.autoAdvance) {
      const AUTO_ADVANCE_SECONDS = modeConfig.timerPressure ? 2 : 3;
      setAutoAdvanceCountdown(AUTO_ADVANCE_SECONDS);
      
      countdownIntervalRef.current = setInterval(() => {
        setAutoAdvanceCountdown(prev => {
          if (prev === null || prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            startNewTest();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleNextManual = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAutoAdvanceCountdown(null);
    startNewTest();
  };

  const resetSession = () => {
    setSessionProgress(0);
    setSessionComplete(false);
    setSessionStats({
      totalWpm: 0,
      totalAccuracy: 0,
      totalErrors: 0,
      count: 0,
    });
    setSessionHistory([]);
    setCurrentCoachingTip(null);
    setShowModeSelector(true);
    setIsWaitingToStart(false);
  };

  const restartCurrentSession = () => {
    cancel();
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    setSessionProgress(0);
    setSessionComplete(false);
    setSessionStats({
      totalWpm: 0,
      totalAccuracy: 0,
      totalErrors: 0,
      count: 0,
    });
    setSessionHistory([]);
    setCurrentCoachingTip(null);
    setAutoAdvanceCountdown(null);
    setElapsedTime(0);
    setTestState({
      sentence: null,
      typedText: '',
      startTime: null,
      endTime: null,
      replayCount: 0,
      hintShown: false,
      showHint: false,
      isComplete: false,
      result: null,
    });
    setTimeout(() => {
      startNewTest(true);
    }, 100);
  };

  const startPracticeMode = (mode: PracticeMode) => {
    const config = PRACTICE_MODES[mode];
    setPracticeMode(mode);
    setDifficulty(config.defaultDifficulty);
    setSpeedLevel(config.defaultSpeed);
    setTestState({
      sentence: null,
      typedText: '',
      startTime: null,
      endTime: null,
      replayCount: 0,
      hintShown: false,
      showHint: false,
      isComplete: false,
      result: null,
    });
    setShowModeSelector(false);
    setIsWaitingToStart(true);
  };

  const beginSession = () => {
    setIsWaitingToStart(false);
    startNewTest();
  };

  const achievements = useMemo(() => 
    calculateAchievements(sessionStats, sessionHistory),
    [sessionStats, sessionHistory]
  );

  if (!isSupported) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">Browser Not Supported</h2>
            <p className="text-muted-foreground">
              Your browser doesn't support speech synthesis. Please use a modern browser like Chrome, Edge, or Safari to use Dictation Mode.
            </p>
            <Link href="/">
              <Button className="mt-4" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionComplete) {
    const avgWpm = sessionStats.count > 0 ? Math.round(sessionStats.totalWpm / sessionStats.count) : 0;
    const avgAccuracy = sessionStats.count > 0 ? Math.round(sessionStats.totalAccuracy / sessionStats.count) : 0;

    return (
      <TooltipProvider delayDuration={300}>
        <div className="container max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/">
                  <Button variant="ghost" size="sm" data-testid="button-back">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Return to home page</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="text-center mb-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h2 
                      className="text-3xl font-bold mb-2 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg px-2 inline-block"
                      tabIndex={0}
                      role="heading"
                      aria-label="Session complete - congratulations"
                    >
                      Session Complete! 🎉
                    </h2>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Congratulations! You've finished all {sessionLength} dictation exercises</p>
                  </TooltipContent>
                </Tooltip>
                <p className="text-muted-foreground">You've completed {sessionLength} dictation tests</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="text-center p-4 bg-primary/10 rounded-lg cursor-help transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      tabIndex={0}
                      role="group"
                      aria-label="Average words per minute statistic"
                    >
                      <div className="text-3xl font-bold text-primary" data-testid="text-session-avg-wpm">{avgWpm}</div>
                      <div className="text-sm text-muted-foreground">Avg WPM</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-1">Average Words Per Minute</p>
                    <p className="text-xs opacity-90">Your average typing speed across all {sessionStats.count} sentences. Higher is better!</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="text-center p-4 bg-green-500/10 rounded-lg cursor-help transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                      tabIndex={0}
                      role="group"
                      aria-label="Average accuracy statistic"
                    >
                      <div className="text-3xl font-bold text-green-600" data-testid="text-session-avg-accuracy">{avgAccuracy}%</div>
                      <div className="text-sm text-muted-foreground">Avg Accuracy</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-1">Average Accuracy Score</p>
                    <p className="text-xs opacity-90">How closely your typing matched the spoken sentences. 100% means perfect transcription.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="text-center p-4 bg-orange-500/10 rounded-lg cursor-help transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      tabIndex={0}
                      role="group"
                      aria-label="Total errors statistic"
                    >
                      <div className="text-3xl font-bold text-orange-600" data-testid="text-session-total-errors">{sessionStats.totalErrors}</div>
                      <div className="text-sm text-muted-foreground">Total Errors</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-1">Total Character Errors</p>
                    <p className="text-xs opacity-90">Sum of all incorrect, missing, or extra characters across the session. Lower is better!</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {achievements.filter(a => a.unlocked).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-3 text-center flex items-center justify-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500" />
                    Achievements Unlocked!
                  </h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {achievements.filter(a => a.unlocked).map((achievement) => (
                      <Tooltip key={achievement.id}>
                        <TooltipTrigger asChild>
                          <Badge variant="default" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/50 px-3 py-1.5">
                            <span className="mr-1">{achievement.icon}</span>
                            {achievement.name}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{achievement.name}</p>
                          <p className="text-xs opacity-90">{achievement.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}

              {achievements.filter(a => !a.unlocked).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-3 text-center text-muted-foreground">Almost there...</h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {achievements.filter(a => !a.unlocked).map((achievement) => (
                      <Tooltip key={achievement.id}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full text-sm text-muted-foreground">
                            <span className="opacity-50">{achievement.icon}</span>
                            <span>{achievement.name}</span>
                            {achievement.progress !== undefined && achievement.target && (
                              <span className="text-xs">({Math.round(achievement.progress)}/{achievement.target})</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{achievement.name}</p>
                          <p className="text-xs opacity-90">{achievement.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-center items-center mb-4 flex-wrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Session Length:</span>
                      {showCustomLength ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={customLengthInput}
                            onChange={(e) => setCustomLengthInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCustomLengthSubmit()}
                            placeholder="1-500"
                            className="w-20 px-3 py-2 text-sm border rounded-md bg-background"
                            data-testid="input-custom-session-length"
                            autoFocus
                          />
                          <Button size="sm" onClick={handleCustomLengthSubmit} data-testid="button-confirm-custom-length">
                            Set
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowCustomLength(false)} data-testid="button-cancel-custom-length">
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Select 
                          value={SESSION_LENGTH_OPTIONS.find(o => o.value === sessionLength) ? sessionLength.toString() : '0'} 
                          onValueChange={handleSessionLengthChange}
                        >
                          <SelectTrigger className="w-[200px]" data-testid="select-session-length">
                            <SelectValue>
                              {SESSION_LENGTH_OPTIONS.find(o => o.value === sessionLength)?.label || `${sessionLength} sentences (Custom)`}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {SESSION_LENGTH_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value.toString()}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Choose how many sentences to practice in your next session (1-500)</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex gap-3 justify-center flex-wrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={resetSession} size="lg" data-testid="button-new-session">
                      Start New Session
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Begin a fresh session with {sessionLength} new sentences</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => setShowShareModal(true)} 
                      variant="secondary" 
                      size="lg"
                      data-testid="button-share-result"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Result
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Share your session results with friends or on social media</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/">
                      <Button variant="outline" size="lg" data-testid="button-home">
                        Back to Home
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Return to the main menu</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }

  if (showModeSelector) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="container max-w-4xl mx-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/">
                  <Button variant="ghost" size="sm" data-testid="button-back">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Return to home page</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <h1 
                  className="text-3xl font-bold cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg px-2"
                  tabIndex={0}
                  role="heading"
                  aria-label="Choose your practice mode"
                >
                  Dictation Mode 🎧
                </h1>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Select how you want to practice today</p>
              </TooltipContent>
            </Tooltip>
            <div className="w-20" />
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-center">Choose Your Practice Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Object.entries(PRACTICE_MODES) as [PracticeMode, PracticeModeConfig][]).map(([mode, config]) => (
                  <Tooltip key={mode}>
                    <TooltipTrigger asChild>
                      <Card 
                        className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 ${
                          practiceMode === mode ? 'border-primary' : 'border-transparent'
                        }`}
                        onClick={() => startPracticeMode(mode)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Select ${config.name}`}
                        onKeyDown={(e) => e.key === 'Enter' && startPracticeMode(mode)}
                        data-testid={`button-mode-${mode}`}
                      >
                        <CardContent className="pt-6 text-center">
                          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                            mode === 'quick' ? 'bg-blue-500/10 text-blue-500' :
                            mode === 'focus' ? 'bg-green-500/10 text-green-500' :
                            'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {config.icon}
                          </div>
                          <h3 className="font-semibold text-lg mb-2">{config.name}</h3>
                          <p className="text-sm text-muted-foreground mb-4">{config.description}</p>
                          <div className="flex flex-wrap gap-1 justify-center">
                            {config.autoAdvance && (
                              <Badge variant="secondary" className="text-xs">Auto-advance</Badge>
                            )}
                            {!config.hintsAllowed && (
                              <Badge variant="secondary" className="text-xs">No hints</Badge>
                            )}
                            {config.timerPressure && (
                              <Badge variant="secondary" className="text-xs">Timed</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium mb-1">{config.name}</p>
                      <p className="text-xs opacity-90">{config.description}</p>
                      <p className="text-xs mt-1">Default: {config.defaultDifficulty} difficulty, {config.defaultSpeed} speed</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Session Settings
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Session Length</label>
                    {showCustomLength ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={customLengthInput}
                          onChange={(e) => setCustomLengthInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCustomLengthSubmit()}
                          placeholder="1-500"
                          className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
                          data-testid="input-custom-session-length-mode"
                          autoFocus
                        />
                        <Button size="sm" onClick={handleCustomLengthSubmit} data-testid="button-confirm-custom-length-mode">
                          Set
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowCustomLength(false)} data-testid="button-cancel-custom-length-mode">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Select 
                        value={SESSION_LENGTH_OPTIONS.find(o => o.value === sessionLength) ? sessionLength.toString() : '0'} 
                        onValueChange={handleSessionLengthChange}
                      >
                        <SelectTrigger data-testid="select-session-length-mode">
                          <SelectValue>
                            {SESSION_LENGTH_OPTIONS.find(o => o.value === sessionLength)?.label || `${sessionLength} sentences (Custom)`}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {SESSION_LENGTH_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value.toString()}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Topic</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger data-testid="select-category-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }

  if (isWaitingToStart) {
    const modeConfig = PRACTICE_MODES[practiceMode];
    return (
      <TooltipProvider delayDuration={300}>
        <div className="container max-w-4xl mx-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowModeSelector(true);
                    setIsWaitingToStart(false);
                  }}
                  data-testid="button-back-to-modes"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Modes
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Choose a different practice mode</p>
              </TooltipContent>
            </Tooltip>
            <h1 className="text-2xl font-bold">{modeConfig.name}</h1>
            <div className="w-24" />
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  practiceMode === 'quick' ? 'bg-blue-500/10 text-blue-500' :
                  practiceMode === 'focus' ? 'bg-green-500/10 text-green-500' :
                  'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {modeConfig.icon}
                </div>
                <div>
                  <p className="text-muted-foreground">{modeConfig.description}</p>
                  <div className="flex gap-2 mt-2">
                    {modeConfig.autoAdvance && (
                      <Badge variant="secondary" className="text-xs">Auto-advance</Badge>
                    )}
                    {!modeConfig.hintsAllowed && (
                      <Badge variant="secondary" className="text-xs">No hints</Badge>
                    )}
                    {modeConfig.timerPressure && (
                      <Badge variant="secondary" className="text-xs">Timed</Badge>
                    )}
                  </div>
                </div>
              </div>

              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Session Settings
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Session Length</label>
                  {showCustomLength ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={customLengthInput}
                        onChange={(e) => setCustomLengthInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomLengthSubmit()}
                        placeholder="1-500"
                        className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
                        data-testid="input-custom-session-length-ready"
                        autoFocus
                      />
                      <Button size="sm" onClick={handleCustomLengthSubmit}>Set</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowCustomLength(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Select 
                      value={SESSION_LENGTH_OPTIONS.find(o => o.value === sessionLength) ? sessionLength.toString() : '0'} 
                      onValueChange={handleSessionLengthChange}
                    >
                      <SelectTrigger data-testid="select-session-length-ready">
                        <SelectValue>
                          {SESSION_LENGTH_OPTIONS.find(o => o.value === sessionLength)?.label || `${sessionLength} sentences (Custom)`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {SESSION_LENGTH_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value.toString()}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Topic</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger data-testid="select-category-ready">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Difficulty</label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger data-testid="select-difficulty-ready">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Speech Speed: {getSpeedLevelName(parseFloat(speedLevel))}
                  </label>
                  <Slider
                    value={[parseFloat(speedLevel)]}
                    onValueChange={([val]) => setSpeedLevel(val.toString())}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    className="mt-2"
                    data-testid="slider-speed-ready"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0.5x</span>
                    <span>2.0x</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t">
                <div className="flex flex-col items-center gap-4">
                  <Button 
                    size="lg" 
                    onClick={beginSession}
                    className="px-12 py-6 text-lg w-full sm:w-auto"
                    data-testid="button-start-session"
                  >
                    <Volume2 className="w-5 h-5 mr-2" />
                    Start Session
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Configure your settings above, then press Start when ready
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="container max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/">
                  <Button variant="ghost" size="sm" data-testid="button-back">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Return to home page</p>
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2">
              {streakData.currentStreak > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-500 rounded-full text-sm font-medium">
                      <Flame className="w-4 h-4 animate-pulse" />
                      <span>{streakData.currentStreak}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{streakData.currentStreak} day streak!</p>
                    <p className="text-xs opacity-80">Best: {streakData.longestStreak} days | Total: {streakData.totalSessions} sessions</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={showHistory ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                    data-testid="button-toggle-history"
                    className="gap-2"
                  >
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">History</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View session history ({sessionHistory.length} items)</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={showAnalytics ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    data-testid="button-toggle-analytics"
                    className="gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Stats</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View session analytics</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={showBookmarks ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowBookmarks(!showBookmarks)}
                    data-testid="button-toggle-bookmarks"
                    className="gap-2"
                  >
                    <Bookmark className="w-4 h-4" />
                    {bookmarks.length > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                        {bookmarks.length}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View bookmarked sentences ({bookmarks.length})</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={showSettings ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                    data-testid="button-toggle-settings"
                  >
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Voice & display settings</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Dictation Mode
              </h1>
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {PRACTICE_MODES[practiceMode].icon}
              <span className="ml-2">{PRACTICE_MODES[practiceMode].name}</span>
            </Badge>
          </div>
        </div>

        {showHistory && (
          <Card className="mb-6 animate-in slide-in-from-top-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Session History
                  {sessionHistory.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {sessionHistory.length} completed
                    </Badge>
                  )}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto">
              {sessionHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <History className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h4 className="font-medium text-muted-foreground mb-2">No History Yet</h4>
                  <p className="text-sm text-muted-foreground/70 max-w-xs mx-auto">
                    Complete a dictation test to see your history here. Your performance for each sentence will be tracked.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessionHistory.map((item, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Sentence {index + 1}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={item.accuracy >= 95 ? 'default' : item.accuracy >= 80 ? 'secondary' : 'destructive'}>
                            {item.accuracy}%
                          </Badge>
                          <span className="text-xs text-muted-foreground">{item.wpm} WPM</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{item.sentence}</p>
                      {item.errorCategories.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {item.errorCategories.slice(0, 3).map((cat, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {cat.type}: {cat.count}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {showAnalytics && (
          <Card className="mb-6 animate-in slide-in-from-top-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Session Analytics
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAnalytics(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sessionStats.count === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h4 className="font-medium text-muted-foreground mb-2">No Stats Yet</h4>
                  <p className="text-sm text-muted-foreground/70 max-w-xs mx-auto">
                    Complete dictation tests to see your analytics. Track your WPM, accuracy, and achievements here.
                  </p>
                  
                  <div className="mt-6">
                    <h5 className="text-sm font-medium mb-3">Available Achievements</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {achievements.map((achievement) => (
                        <Tooltip key={achievement.id}>
                          <TooltipTrigger asChild>
                            <div className="p-2 rounded-lg text-center bg-muted/30 opacity-60">
                              <div className="mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-1 bg-muted">
                                {achievement.icon}
                              </div>
                              <p className="text-xs font-medium truncate">{achievement.name}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{achievement.name}</p>
                            <p className="text-xs opacity-90">{achievement.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {Math.round(sessionStats.totalWpm / sessionStats.count)}
                      </div>
                      <div className="text-xs text-muted-foreground">Avg WPM</div>
                    </div>
                    <div className="text-center p-3 bg-green-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(sessionStats.totalAccuracy / sessionStats.count)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Accuracy</div>
                    </div>
                    <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {sessionStats.totalErrors}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Errors</div>
                    </div>
                    <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {sessionHistory.filter(h => h.accuracy === 100).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Perfect Scores</div>
                    </div>
                  </div>

                  {(() => {
                    const errorBreakdown = sessionHistory.reduce((acc, item) => {
                      item.errorCategories.forEach(cat => {
                        if (!acc[cat.type]) {
                          acc[cat.type] = { count: 0, examples: [] };
                        }
                        acc[cat.type].count += cat.count;
                        acc[cat.type].examples = Array.from(new Set([...acc[cat.type].examples, ...cat.examples])).slice(0, 5);
                      });
                      return acc;
                    }, {} as Record<string, { count: number; examples: string[] }>);

                    const sortedErrors = Object.entries(errorBreakdown).sort((a, b) => b[1].count - a[1].count);
                    const weakestArea = sortedErrors[0];

                    if (sortedErrors.length > 0) {
                      return (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            Error Breakdown
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                            {sortedErrors.map(([type, data]) => (
                              <Tooltip key={type}>
                                <TooltipTrigger asChild>
                                  <div className={`p-2 rounded-lg text-center cursor-help ${
                                    type === weakestArea?.[0] ? 'bg-red-500/20 border border-red-500/30' : 'bg-muted/50'
                                  }`}>
                                    <div className={`text-lg font-bold ${type === weakestArea?.[0] ? 'text-red-500' : 'text-foreground'}`}>
                                      {data.count}
                                    </div>
                                    <div className="text-xs text-muted-foreground capitalize">
                                      {type.replace('_', ' ')}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="font-medium capitalize mb-1">{type.replace('_', ' ')} Errors</p>
                                  {data.examples.length > 0 && (
                                    <p className="text-xs opacity-90">Examples: {data.examples.join(', ')}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                          {weakestArea && (
                            <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Lightbulb className="w-4 h-4 text-orange-500" />
                                  <span className="text-sm">
                                    <span className="font-medium">Focus area:</span>{' '}
                                    <span className="capitalize">{weakestArea[0].replace('_', ' ')}</span>
                                    <span className="text-muted-foreground"> ({weakestArea[1].count} errors)</span>
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {weakestArea[0] === 'spelling' && 'Practice similar words to improve spelling accuracy.'}
                                {weakestArea[0] === 'punctuation' && 'Pay attention to commas, periods, and other punctuation marks.'}
                                {weakestArea[0] === 'capitalization' && 'Remember to capitalize proper nouns and sentence beginnings.'}
                                {weakestArea[0] === 'missing' && 'Listen more carefully and make sure not to skip words.'}
                                {weakestArea[0] === 'extra' && 'Avoid adding words that weren\'t in the original sentence.'}
                                {weakestArea[0] === 'word_order' && 'Pay attention to the order of words as you hear them.'}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <h4 className="text-sm font-medium mb-3">Achievements</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {achievements.map((achievement) => (
                      <Tooltip key={achievement.id}>
                        <TooltipTrigger asChild>
                          <div className={`p-2 rounded-lg text-center transition-all ${
                            achievement.unlocked 
                              ? 'bg-yellow-500/20 border border-yellow-500/50' 
                              : 'bg-muted/50 opacity-50'
                          }`}>
                            <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                              achievement.unlocked ? 'bg-yellow-500/30' : 'bg-muted'
                            }`}>
                              {achievement.icon}
                            </div>
                            <p className="text-xs font-medium truncate">{achievement.name}</p>
                            {achievement.progress !== undefined && achievement.target && (
                              <Progress 
                                value={(achievement.progress / achievement.target) * 100} 
                                className="h-1 mt-1"
                              />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{achievement.name}</p>
                          <p className="text-xs opacity-90">{achievement.description}</p>
                          {achievement.progress !== undefined && achievement.target && (
                            <p className="text-xs mt-1">Progress: {Math.round(achievement.progress)}/{achievement.target}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {showBookmarks && (
          <Card className="mb-6 animate-in slide-in-from-top-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bookmark className="w-5 h-5" />
                  Bookmarked Sentences
                  {bookmarks.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {bookmarks.length} saved
                    </Badge>
                  )}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowBookmarks(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto">
              {bookmarks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Bookmark className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h4 className="font-medium text-muted-foreground mb-2">No Bookmarks Yet</h4>
                  <p className="text-sm text-muted-foreground/70 max-w-xs mx-auto">
                    Bookmark sentences you want to practice again later. Click the bookmark icon after completing a test.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookmarks.map((bookmark) => (
                    <div key={bookmark.id} className="p-3 bg-muted/50 rounded-lg group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {bookmark.difficulty}
                          </Badge>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {bookmark.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => practiceBookmarkedSentence(bookmark)}
                                className="h-7 px-2"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Practice this sentence</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setBookmarks(removeBookmark(bookmark.id))}
                                className="h-7 px-2 text-destructive hover:text-destructive"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove bookmark</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{bookmark.sentence}</p>
                      {bookmark.lastAccuracy !== undefined && (
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Last accuracy: {bookmark.lastAccuracy}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {showSettings && (
          <Card className="mb-6 animate-in slide-in-from-top-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  Settings
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Voice Selection</label>
                  <Select 
                    value={currentVoice?.voiceURI || ''} 
                    onValueChange={handleVoiceChange}
                  >
                    <SelectTrigger data-testid="select-voice">
                      <SelectValue placeholder="Select a voice">
                        {currentVoice?.name || 'Default Voice'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {englishVoices.length > 0 ? (
                        englishVoices.map((voice) => (
                          <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name} ({voice.lang})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No voices available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose from {englishVoices.length} available English voices
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Adaptive Difficulty
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Automatically adjust difficulty based on your performance
                      </p>
                    </div>
                    <Button
                      variant={adaptiveDifficulty.enabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setAdaptiveDifficulty(prev => ({
                          ...prev,
                          enabled: !prev.enabled,
                          currentLevel: difficulty as 'easy' | 'medium' | 'hard',
                          consecutiveHighScores: 0,
                          consecutiveLowScores: 0,
                          recentScores: [],
                        }));
                        toast({
                          title: adaptiveDifficulty.enabled ? 'Adaptive Difficulty Disabled' : 'Adaptive Difficulty Enabled',
                          description: adaptiveDifficulty.enabled 
                            ? 'Difficulty will stay at your selected level.' 
                            : 'Difficulty will adjust based on your accuracy and speed.',
                        });
                      }}
                      data-testid="button-toggle-adaptive"
                    >
                      {adaptiveDifficulty.enabled ? 'On' : 'Off'}
                    </Button>
                  </div>
                  {adaptiveDifficulty.enabled && (
                    <div className="mt-3 p-3 bg-primary/5 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Current Level:</span>
                        <span className="font-medium flex items-center gap-1">
                          {getDifficultyEmoji(adaptiveDifficulty.currentLevel)} 
                          {adaptiveDifficulty.currentLevel.charAt(0).toUpperCase() + adaptiveDifficulty.currentLevel.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Progress to upgrade:</span>
                        <span className="font-medium">
                          {adaptiveDifficulty.consecutiveHighScores}/{ADAPTIVE_THRESHOLDS.upgradeConsecutive} high scores
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Score 90%+ accuracy with 30+ WPM {ADAPTIVE_THRESHOLDS.upgradeConsecutive}x to level up
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    Streak Stats
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                      <div className="text-xl font-bold text-orange-500">{streakData.currentStreak}</div>
                      <div className="text-xs text-muted-foreground">Current</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                      <div className="text-xl font-bold text-yellow-600">{streakData.longestStreak}</div>
                      <div className="text-xs text-muted-foreground">Best</div>
                    </div>
                    <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                      <div className="text-xl font-bold text-blue-500">{streakData.totalSessions}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Keyboard Shortcuts</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">R</kbd>
                      <span className="text-muted-foreground">Replay audio</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">H</kbd>
                      <span className="text-muted-foreground">Toggle hint</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">N</kbd>
                      <span className="text-muted-foreground">Next sentence</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+Enter</kbd>
                      <span className="text-muted-foreground">Submit</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-1">
                Progress
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex cursor-help focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full"
                      tabIndex={0}
                      role="button"
                      aria-label="Progress information"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Complete {sessionLength} dictation tests to finish the session</p>
                  </TooltipContent>
                </Tooltip>
              </span>
              <span className="text-sm text-muted-foreground" data-testid="text-progress">
                {sessionProgress} / {sessionLength}
              </span>
            </div>
            <Progress value={(sessionProgress / sessionLength) * 100} className="h-2" />
          </CardContent>
        </Card>

      {!testState.isComplete ? (
        <>
          <Card className="mb-6 bg-muted/30">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Settings
                </h3>
                <Badge variant="outline" className="text-xs">
                  {testState.replayCount} replays
                </Badge>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                      Speech Speed
                    </span>
                    <Badge variant="secondary" className="font-mono text-base px-3 py-1">
                      {currentRate.toFixed(1)}x
                    </Badge>
                  </div>
                  <Slider
                    value={[parseFloat(speedLevel) || 1.0]}
                    onValueChange={(value) => setSpeedLevel(value[0].toString())}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    disabled={isLoading || isSpeaking}
                    className="w-full"
                    data-testid="slider-speed"
                    aria-label="Adjust speech speed from 0.5x to 2.0x"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground px-1">
                    <span>Slower</span>
                    <span>Normal</span>
                    <span>Faster</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          Difficulty
                          {adaptiveDifficulty.enabled && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-full font-medium">
                              AUTO
                            </span>
                          )}
                        </label>
                        <Select 
                          value={difficulty} 
                          onValueChange={(val) => {
                            setDifficulty(val);
                            if (adaptiveDifficulty.enabled) {
                              setAdaptiveDifficulty(prev => ({
                                ...prev,
                                currentLevel: val as 'easy' | 'medium' | 'hard',
                                consecutiveHighScores: 0,
                                consecutiveLowScores: 0,
                              }));
                            }
                          }} 
                          disabled={isLoading || isSpeaking}
                        >
                          <SelectTrigger data-testid="select-difficulty" className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">{getDifficultyEmoji('easy')} Easy</SelectItem>
                            <SelectItem value="medium">{getDifficultyEmoji('medium')} Medium</SelectItem>
                            <SelectItem value="hard">{getDifficultyEmoji('hard')} Hard</SelectItem>
                          </SelectContent>
                        </Select>
                        {difficultyJustChanged && (
                          <div className={`text-xs mt-1 flex items-center gap-1 ${
                            difficultyJustChanged.direction === 'up' ? 'text-green-500' : 'text-orange-500'
                          }`}>
                            {difficultyJustChanged.direction === 'up' ? '↑' : '↓'}
                            Changed from {difficultyJustChanged.from} to {difficultyJustChanged.to}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Easy: Short sentences • Medium: Standard • Hard: Complex vocabulary</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Voice</label>
                        <Select 
                          value={currentVoice?.voiceURI || ''} 
                          onValueChange={handleVoiceChange}
                          disabled={isLoading || isSpeaking || englishVoices.length === 0}
                        >
                          <SelectTrigger data-testid="select-voice" className="h-10">
                            <SelectValue placeholder={englishVoices.length === 0 ? "Loading..." : "Voice"} />
                          </SelectTrigger>
                          <SelectContent>
                            {englishVoices.length === 0 ? (
                              <SelectItem value="loading" disabled>Loading voices...</SelectItem>
                            ) : (
                              englishVoices.map((voice) => (
                                <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                                  {voice.name.split(' ').slice(0, 2).join(' ')}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Choose your preferred voice accent</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Topic</label>
                        <Select value={category} onValueChange={setCategory} disabled={isLoading || isSpeaking}>
                          <SelectTrigger data-testid="select-category" className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Filter sentences by topic category</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <div className="flex items-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full h-10"
                          onClick={restartCurrentSession}
                          disabled={isLoading || isSpeaking}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restart
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Restart current session from beginning</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  
                  <div className="flex items-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full h-10"
                          onClick={resetSession}
                          disabled={isLoading || isSpeaking}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Exit Mode
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Return to mode selection</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 overflow-hidden">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                {isSpeaking ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex flex-col items-center justify-center cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-2xl p-6"
                        tabIndex={0}
                        role="status"
                        aria-label="Audio is playing"
                        aria-live="polite"
                      >
                        <div className="relative mb-6">
                          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: '1.5s' }}></div>
                          <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" style={{ animationDuration: '1s' }}></div>
                          <div className="relative bg-gradient-to-br from-primary/30 to-primary/10 p-8 rounded-full border-4 border-primary/50 shadow-lg shadow-primary/20">
                            <Mic className="w-20 h-20 text-primary" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-2xl font-bold text-primary" data-testid="text-speaking">
                            Listening...
                          </p>
                          <p className="text-base text-muted-foreground">
                            Pay attention to what's being said
                          </p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium mb-1">Audio Playing</p>
                      <p className="text-xs opacity-90">Listen carefully to the sentence. You can replay it after it finishes.</p>
                    </TooltipContent>
                  </Tooltip>
                ) : testState.startTime ? (
                  <div className="flex flex-col items-center justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="flex flex-col items-center cursor-default focus:outline-none focus:ring-2 focus:ring-green-500/50 rounded-2xl p-6"
                          tabIndex={0}
                          role="status"
                          aria-label="Ready to type"
                        >
                          <div className="relative mb-6">
                            <div className="bg-gradient-to-br from-green-500/30 to-green-500/10 p-6 rounded-full border-4 border-green-500/50 shadow-lg shadow-green-500/20">
                              <Volume2 className="w-16 h-16 text-green-500" />
                            </div>
                            <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1.5">
                              <Check className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-2xl font-bold text-green-500" data-testid="text-ready">
                              Ready to Type!
                            </p>
                            <p className="text-base text-muted-foreground">
                              Type what you heard in the box below
                            </p>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium mb-1">Ready to Type</p>
                        <p className="text-xs opacity-90">The audio has finished. Type what you heard in the text area below.</p>
                      </TooltipContent>
                    </Tooltip>
                    {testState.showHint && testState.sentence && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="mt-6 p-5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl max-w-2xl cursor-help focus:outline-none focus:ring-2 focus:ring-primary/50 border border-primary/20"
                            tabIndex={0}
                            role="note"
                            aria-label="Hint showing the target sentence"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <Eye className="w-4 h-4 text-primary" />
                              <p className="text-sm font-semibold text-primary">Hint</p>
                            </div>
                            <p className="text-lg font-mono text-foreground leading-relaxed" data-testid="text-hint">
                              {testState.sentence.sentence}
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-medium mb-1">Sentence Hint</p>
                          <p className="text-xs opacity-90">This is the actual sentence. Using hints may affect your practice score.</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex flex-col items-center justify-center cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-2xl p-6"
                        tabIndex={0}
                        role="status"
                        aria-label="Loading next sentence"
                        aria-live="polite"
                      >
                        <div className="relative mb-6">
                          <div className="bg-gradient-to-br from-muted to-muted/50 p-6 rounded-full border-4 border-muted-foreground/20">
                            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xl font-semibold text-muted-foreground">Preparing...</p>
                          <p className="text-sm text-muted-foreground/70">Getting your next sentence ready</p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Preparing the next sentence...</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <label className="text-sm font-medium mb-3 block flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span 
                      className="cursor-help flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded px-1"
                      tabIndex={0}
                      role="button"
                      aria-label="Typing area help information"
                    >
                      Type what you heard:
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-1">Typing Area</p>
                    <p className="text-xs opacity-90">Type the sentence exactly as you heard it. Punctuation and capitalization matter for accuracy!</p>
                  </TooltipContent>
                </Tooltip>
                {testState.startTime && !isSpeaking && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={`text-xs flex items-center gap-2 cursor-help transition-colors ${
                        PRACTICE_MODES[practiceMode].timerPressure
                          ? elapsedTime > 45 ? 'text-red-600' : elapsedTime > 30 ? 'text-orange-500' : elapsedTime > 15 ? 'text-yellow-600' : 'text-green-600'
                          : 'text-green-600'
                      }`}>
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full animate-pulse ${
                            PRACTICE_MODES[practiceMode].timerPressure
                              ? elapsedTime > 45 ? 'bg-red-600' : elapsedTime > 30 ? 'bg-orange-500' : elapsedTime > 15 ? 'bg-yellow-600' : 'bg-green-600'
                              : 'bg-green-600'
                          }`}></span>
                          {PRACTICE_MODES[practiceMode].timerPressure && elapsedTime > 30 ? 'Hurry up!' : 'Timer running'}
                        </span>
                        <span className={`font-mono px-2 py-0.5 rounded ${
                          PRACTICE_MODES[practiceMode].timerPressure
                            ? elapsedTime > 45 ? 'bg-red-500/20' : elapsedTime > 30 ? 'bg-orange-500/20' : elapsedTime > 15 ? 'bg-yellow-500/20' : 'bg-green-500/10'
                            : 'bg-green-500/10'
                        }`}>
                          {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                        </span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{PRACTICE_MODES[practiceMode].timerPressure 
                        ? 'Challenge mode: Complete quickly for bonus points!' 
                        : 'Time elapsed since audio finished. Type your answer now!'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Textarea
                      ref={inputRef}
                      value={testState.typedText}
                      onChange={(e) => setTestState(prev => ({ ...prev, typedText: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey && !isSpeaking && testState.startTime) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                      placeholder="Type here... (Ctrl+Enter to submit)"
                      className="text-lg p-4 min-h-[120px] resize-none"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      data-testid="input-typed-text"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">Auto-correct and spell-check are disabled for accurate practice</p>
                </TooltipContent>
              </Tooltip>
              <div className="flex items-center justify-between mt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span 
                      className="text-xs text-muted-foreground cursor-help focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-1"
                      tabIndex={0}
                      role="status"
                      aria-label={`${testState.typedText.length} characters typed`}
                    >
                      {testState.typedText.length} characters
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total characters you've typed so far</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span 
                      className="text-xs text-muted-foreground cursor-help flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-1"
                      tabIndex={0}
                      role="note"
                      aria-label="Press Control plus Enter to submit"
                    >
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl</kbd>
                      <span>+</span>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd>
                      <span>to submit</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Keyboard shortcut to quickly submit your answer</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4 bg-gradient-to-r from-muted/50 to-muted/30">
            <CardContent className="py-4">
              <div className="flex gap-3 justify-center flex-wrap items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleReplay}
                      disabled={!testState.sentence || isSpeaking}
                      variant="outline"
                      size="lg"
                      className="h-12 px-6 text-base"
                      data-testid="button-replay"
                    >
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Replay
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Listen to the sentence again (press R)</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={toggleHint}
                      disabled={!testState.sentence || isSpeaking || !PRACTICE_MODES[practiceMode].hintsAllowed}
                      variant="outline"
                      size="lg"
                      className="h-12 px-6 text-base"
                      data-testid="button-hint"
                    >
                      {testState.showHint ? <EyeOff className="w-5 h-5 mr-2" /> : <Eye className="w-5 h-5 mr-2" />}
                      {testState.showHint ? 'Hide' : 'Hint'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{PRACTICE_MODES[practiceMode].hintsAllowed 
                      ? 'Show the sentence text (press H)'
                      : 'Hints disabled in Challenge Mode'
                    }</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSubmit}
                      disabled={!testState.typedText.trim() || isSpeaking || !testState.startTime}
                      size="lg"
                      className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/20"
                      data-testid="button-submit"
                    >
                      <Check className="w-5 h-5 mr-2" />
                      Submit
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Submit your answer (Ctrl+Enter)</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setShowKeyboardGuide(!showKeyboardGuide)}
                      variant="ghost"
                      size="lg"
                      className="h-12"
                      data-testid="button-keyboard-guide"
                    >
                      <HelpCircle className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Keyboard shortcuts</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          {showKeyboardGuide && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold">Keyboard Shortcuts</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex cursor-help focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full"
                        tabIndex={0}
                        role="button"
                        aria-label="Keyboard shortcuts help"
                      >
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">Use these shortcuts to navigate faster without using your mouse</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex items-center justify-between p-2 bg-muted/30 rounded cursor-help hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                        tabIndex={0}
                        role="listitem"
                        aria-label="Submit answer shortcut: Control plus Enter"
                      >
                        <span>Submit Answer</span>
                        <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">Ctrl + Enter</kbd>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Hold Ctrl and press Enter to submit your answer quickly</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex items-center justify-between p-2 bg-muted/30 rounded cursor-help hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                        tabIndex={0}
                        role="listitem"
                        aria-label="Replay audio shortcut: R key"
                      >
                        <span>Replay Audio</span>
                        <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">R</kbd>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Press R (when not typing) to replay the audio</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex items-center justify-between p-2 bg-muted/30 rounded cursor-help hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                        tabIndex={0}
                        role="listitem"
                        aria-label="Toggle hint shortcut: H key"
                      >
                        <span>Toggle Hint</span>
                        <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">H</kbd>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Press H (when not typing) to show/hide the hint</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex items-center justify-between p-2 bg-muted/30 rounded cursor-help hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                        tabIndex={0}
                        role="listitem"
                        aria-label="Focus text box shortcut: Tab"
                      >
                        <span>Focus Text Box</span>
                        <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">Tab</kbd>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Press Tab to quickly jump to the typing area</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          )}

          {speechError && (
            <Card className="mt-4 border-destructive">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">{speechError}</p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="text-center mb-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h2 
                      className="text-2xl font-bold mb-2 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg px-2 inline-block"
                      tabIndex={0}
                      role="heading"
                      aria-label="Test result feedback"
                    >
                      {testState.result && testState.result.accuracy >= 90 ? '🎉 Excellent!' : 
                       testState.result && testState.result.accuracy >= 70 ? '👍 Good Job!' : '💪 Keep Practicing!'}
                    </h2>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      {testState.result && testState.result.accuracy >= 90 
                        ? 'Outstanding performance! You have excellent listening and typing skills.' 
                        : testState.result && testState.result.accuracy >= 70 
                        ? 'Good work! Keep practicing to improve further.' 
                        : 'Practice makes perfect! Try again to improve your accuracy.'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="text-center cursor-help p-2 rounded-lg transition-colors hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      tabIndex={0}
                      role="group"
                      aria-label={`Words per minute: ${testState.result?.wpm}`}
                    >
                      <div className="text-3xl font-bold text-primary" data-testid="text-result-wpm">
                        {testState.result?.wpm}
                      </div>
                      <div className="text-sm text-muted-foreground">WPM</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-1">Words Per Minute</p>
                    <p className="text-xs opacity-90">Your typing speed calculated from characters typed. Average typists achieve 40-60 WPM.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="text-center cursor-help p-2 rounded-lg transition-colors hover:bg-green-500/5 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                      tabIndex={0}
                      role="group"
                      aria-label={`Accuracy: ${testState.result?.accuracy} percent`}
                    >
                      <div className="text-3xl font-bold text-green-600" data-testid="text-result-accuracy">
                        {testState.result?.accuracy}%
                      </div>
                      <div className="text-sm text-muted-foreground">Accuracy</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-1">Transcription Accuracy</p>
                    <p className="text-xs opacity-90">Percentage of characters you typed correctly. 95%+ is excellent!</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="text-center cursor-help p-2 rounded-lg transition-colors hover:bg-orange-500/5 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      tabIndex={0}
                      role="group"
                      aria-label={`Errors: ${testState.result?.errors}`}
                    >
                      <div className="text-3xl font-bold text-orange-600" data-testid="text-result-errors">
                        {testState.result?.errors}
                      </div>
                      <div className="text-sm text-muted-foreground">Errors</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-1">Character Errors</p>
                    <p className="text-xs opacity-90">Total number of incorrect, missing, or extra characters. Lower is better!</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="text-center cursor-help p-2 rounded-lg transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      tabIndex={0}
                      role="group"
                      aria-label={`Time taken: ${testState.result?.duration} seconds`}
                    >
                      <div className="text-3xl font-bold" data-testid="text-result-duration">
                        {testState.result?.duration}s
                      </div>
                      <div className="text-sm text-muted-foreground">Time</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-1">Time Taken</p>
                    <p className="text-xs opacity-90">Total seconds from when the audio finished to when you submitted.</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="space-y-4">
                {testState.result && testState.result.characterDiff && (
                  <div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span 
                          className="text-sm font-medium mb-2 cursor-help inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded px-1"
                          tabIndex={0}
                          role="button"
                          aria-label="Character analysis help"
                        >
                          Character-by-Character Analysis:
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium mb-1">Detailed Breakdown</p>
                        <p className="text-xs opacity-90">Each character is color-coded to show exactly what you typed correctly and where you made mistakes.</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className="p-4 bg-muted/30 rounded-md">
                      <div className="font-mono text-base leading-relaxed flex flex-wrap gap-0.5">
                        {testState.result.characterDiff.map((diff, idx) => (
                          <Tooltip key={idx}>
                            <TooltipTrigger asChild>
                              <span
                                className={`${
                                  diff.status === 'correct' 
                                    ? 'bg-green-500/20 text-green-700 dark:text-green-400' 
                                    : diff.status === 'incorrect'
                                    ? 'bg-red-500/20 text-red-700 dark:text-red-400 underline decoration-wavy'
                                    : diff.status === 'missing'
                                    ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                                    : 'bg-orange-500/20 text-orange-700 dark:text-orange-400 line-through'
                                } px-0.5 rounded cursor-help`}
                              >
                                {diff.char === ' ' ? '·' : diff.char}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {diff.status === 'correct' ? 'Correct character' :
                                 diff.status === 'incorrect' ? 'Wrong character typed' :
                                 diff.status === 'missing' ? 'You missed this character' :
                                 'Extra character you added'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                      <div className="mt-4 flex gap-4 text-xs flex-wrap" role="list" aria-label="Color legend for character analysis">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className="flex items-center gap-1 cursor-help focus:outline-none focus:ring-1 focus:ring-green-500/50 rounded px-1"
                              tabIndex={0}
                              role="listitem"
                              aria-label="Green indicates correct characters"
                            >
                              <span className="w-3 h-3 bg-green-500/20 rounded border border-green-500/30"></span>
                              <span className="text-muted-foreground">Correct</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Characters you typed correctly</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className="flex items-center gap-1 cursor-help focus:outline-none focus:ring-1 focus:ring-red-500/50 rounded px-1"
                              tabIndex={0}
                              role="listitem"
                              aria-label="Red indicates wrong characters"
                            >
                              <span className="w-3 h-3 bg-red-500/20 rounded border border-red-500/30"></span>
                              <span className="text-muted-foreground">Wrong</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Characters where you typed the wrong letter</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className="flex items-center gap-1 cursor-help focus:outline-none focus:ring-1 focus:ring-yellow-500/50 rounded px-1"
                              tabIndex={0}
                              role="listitem"
                              aria-label="Yellow indicates missing characters"
                            >
                              <span className="w-3 h-3 bg-yellow-500/20 rounded border border-yellow-500/30"></span>
                              <span className="text-muted-foreground">Missing</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Characters you skipped or forgot to type</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className="flex items-center gap-1 cursor-help focus:outline-none focus:ring-1 focus:ring-orange-500/50 rounded px-1"
                              tabIndex={0}
                              role="listitem"
                              aria-label="Orange indicates extra characters"
                            >
                              <span className="w-3 h-3 bg-orange-500/20 rounded border border-orange-500/30"></span>
                              <span className="text-muted-foreground">Extra</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Extra characters you typed that weren't in the original</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="cursor-help focus:outline-none focus:ring-2 focus:ring-green-500/50 rounded-lg"
                        tabIndex={0}
                        role="group"
                        aria-label="Original sentence that was spoken"
                      >
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          Original sentence:
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        </p>
                        <div className="p-4 bg-green-500/10 rounded-md border border-green-500/20">
                          <p className="font-mono text-sm" data-testid="text-correct-sentence">
                            {testState.sentence?.sentence}
                          </p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium mb-1">Target Sentence</p>
                      <p className="text-xs opacity-90">The exact sentence that was spoken. Compare this to what you typed.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-lg"
                        tabIndex={0}
                        role="group"
                        aria-label="Your typed transcription"
                      >
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          Your typing:
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        </p>
                        <div className="p-4 bg-blue-500/10 rounded-md border border-blue-500/20">
                          <p className="font-mono text-sm" data-testid="text-your-typing">
                            {testState.typedText}
                          </p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium mb-1">Your Transcription</p>
                      <p className="text-xs opacity-90">What you typed based on what you heard. Compare to the original above.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {testState.result && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="text-center p-4 bg-primary/5 rounded-lg cursor-help transition-all hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        tabIndex={0}
                        role="group"
                        aria-label={`Accuracy grade: ${getAccuracyGrade(testState.result.accuracy).grade}`}
                      >
                        <p className="text-sm text-muted-foreground mb-1">Accuracy Grade</p>
                        <p className={`text-4xl font-bold ${getAccuracyGrade(testState.result.accuracy).color}`}>
                          {getAccuracyGrade(testState.result.accuracy).grade}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getAccuracyGrade(testState.result.accuracy).message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {testState.result.correctChars} / {testState.result.totalChars} characters correct
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium mb-1">Performance Grade</p>
                      <p className="text-xs opacity-90">
                        A+ (95%+) = Excellent | A (90%+) = Great | B (80%+) = Good | C (70%+) = Fair | D (60%+) = Needs Work | F (&lt;60%) = Keep Practicing
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {currentCoachingTip && (
                  <div className={`p-4 rounded-lg flex items-start gap-3 ${
                    currentCoachingTip.type === 'achievement' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                    currentCoachingTip.type === 'encouragement' ? 'bg-green-500/10 border border-green-500/30' :
                    currentCoachingTip.type === 'improvement' ? 'bg-blue-500/10 border border-blue-500/30' :
                    'bg-orange-500/10 border border-orange-500/30'
                  }`}>
                    <div className="mt-0.5">{currentCoachingTip.icon}</div>
                    <div>
                      <p className="text-sm font-medium">
                        {currentCoachingTip.type === 'achievement' ? 'Achievement!' :
                         currentCoachingTip.type === 'encouragement' ? 'Great work!' :
                         currentCoachingTip.type === 'improvement' ? 'Tip for improvement' :
                         'Heads up!'}
                      </p>
                      <p className="text-sm text-muted-foreground">{currentCoachingTip.message}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p 
                      className="text-sm text-muted-foreground mb-4 cursor-help inline-block focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-2"
                      tabIndex={0}
                      role="status"
                      aria-live="polite"
                    >
                      {autoAdvanceCountdown !== null 
                        ? `Next sentence in ${autoAdvanceCountdown} second${autoAdvanceCountdown !== 1 ? 's' : ''}, or click to continue now`
                        : 'Click to continue to next sentence'}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Auto-advancing to the next sentence</p>
                  </TooltipContent>
                </Tooltip>
                <div className="flex items-center justify-center gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        onClick={toggleBookmark}
                        data-testid="button-bookmark"
                      >
                        {testState.sentence && bookmarks.some(b => b.id === testState.sentence?.id) ? (
                          <>
                            <BookmarkCheck className="w-4 h-4 mr-2 text-primary" />
                            Bookmarked
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4 mr-2" />
                            Bookmark
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Save this sentence for later practice</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleNextManual} data-testid="button-next">
                        <ChevronRight className="w-4 h-4 mr-2" />
                        Continue to Next
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Skip the countdown and go to the next sentence immediately</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        mode="dictation"
        resultId={lastTestResultId}
        stats={{
          wpm: sessionStats.count > 0 ? Math.round(sessionStats.totalWpm / sessionStats.count) : 0,
          accuracy: sessionStats.count > 0 ? Math.round(sessionStats.totalAccuracy / sessionStats.count) : 0,
          errors: sessionStats.totalErrors,
        }}
      />
      </div>
    </TooltipProvider>
  );
}
