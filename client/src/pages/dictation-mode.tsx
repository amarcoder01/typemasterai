/**
 * Dictation Mode - Production-Ready Refactored Version
 * 
 * This is a complete rewrite of the dictation test page using modular components,
 * proper state management, and error handling.
 * 
 * Key improvements:
 * - Modular component architecture (split from ~3900 lines monolith)
 * - Proper memory leak prevention with cleanup
 * - Error boundaries for graceful error handling
 * - Session persistence and recovery
 * - Real-time typing feedback
 * - Proper accessibility (ARIA, focus management)
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, RotateCcw, Settings2, BarChart3, Bookmark, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { useCreateCertificate } from '@/hooks/useCertificates';
import { DictationShareDialog } from '@/features/dictation/components/DictationShareDialog';
import { DictationCertificate } from '@/components/DictationCertificate';
import { calculateDictationAccuracy, calculateDictationWPM, getSpeedLevelName } from '@shared/dictation-utils';

// Feature imports
import {
  DictationProvider,
  useDictation,
  useDictationState,
  useDictationActions,
  type PracticeMode,
  type DifficultyLevel,
  type ZenTheme,
  type DictationTestResult,
  PRACTICE_MODES,
  CATEGORIES,
  getDifficultyEmoji,
  getRandomEncouragement,
  INITIAL_ADAPTIVE_CONFIG,
} from '@/features/dictation';

import {
  DictationErrorBoundary,
  DictationModeSelector,
  DictationAudioPlayer,
  DictationTypingArea,
  DictationResults,
  DictationSessionComplete,
  DictationSettings,
  DictationProgressBar,
  DictationSetupPanel,
} from '@/features/dictation/components';

import {
  useDictationAudio,
  useDictationTimer,
  useCountdown,
  useDictationAPI,
} from '@/features/dictation/hooks';

import {
  hasValidSessionBackup,
  clearSessionBackup,
  getBookmarks,
  removeBookmark,
  saveBookmark,
} from '@/features/dictation/utils/persistence';

import { categorizeErrors } from '@/features/dictation/utils/scoring';

// ============================================================================
// MAIN DICTATION PAGE COMPONENT
// ============================================================================

function DictationModeContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const createCertificateMutation = useCreateCertificate();
  
  // Context
  const { state, dispatch, actions } = useDictation();
  
  // API
  const { fetchSentence, isFetching, saveTest, isSaving } = useDictationAPI();
  
  // Audio with callbacks
  const audio = useDictationAudio({
    speedLevel: state.speedLevel,
    onSpeechEnd: () => {
      // Start timer when speech ends
      if (state.testState.sentence && !state.testState.startTime) {
        dispatch({ type: 'SET_TEST_STATE', payload: { startTime: Date.now() } });
        timer.start();
      }
    },
  });
  
  // Timer
  const timer = useDictationTimer({
    onTick: (elapsed) => dispatch({ type: 'SET_ELAPSED_TIME', payload: elapsed }),
  });
  
  // Auto-advance countdown
  const countdown = useCountdown({
    initialValue: 3,
    onComplete: () => handleNextSentence(),
  });
  
  // Local UI state
  const [showShareModal, setShowShareModal] = useState(false);
  const [certificateData, setCertificateData] = useState<any>(null);
  
  // Refs for cleanup
  const isMountedRef = useRef(true);

  // ============================================================================
  // NAVIGATION & HISTORY MANAGEMENT
  // ============================================================================

  // 1. Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode') as PracticeMode | null;

      if (!mode) {
        // URL is root, ensure we show selector
        // We check if we are NOT showing the selector to avoid redundant updates
        if (!state.showModeSelector) {
          dispatch({ type: 'SET_SHOW_MODE_SELECTOR', payload: true });
          // Also ensure we reset waiting state if we were there
          if (state.isWaitingToStart) {
             dispatch({ type: 'SET_IS_WAITING_TO_START', payload: false });
          }
        }
      } else if (PRACTICE_MODES[mode]) {
        // URL has mode, ensure we are in that mode
        // Only trigger if we are not already in that mode to avoid reset loops
        if (state.showModeSelector || state.practiceMode !== mode) {
           actions.startPracticeMode(mode);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [state.showModeSelector, state.practiceMode, state.isWaitingToStart, dispatch, actions]);

  // 2. Handle initial deep link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') as PracticeMode | null;
    if (mode && PRACTICE_MODES[mode]) {
      actions.startPracticeMode(mode);
    }
  }, []); // Run once on mount

  // 3. Sync state changes to URL - REMOVED to avoid loops and race conditions
  // Instead, we rely on explicit navigation actions in handlers.
  /*
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode');

    if (state.showModeSelector) {
      // We are in selector mode. URL should be clean.
      if (urlMode) {
        const newUrl = window.location.pathname;
        window.history.pushState(null, '', newUrl);
      }
    } else {
      // We are in practice mode. URL should have mode param.
      if (urlMode !== state.practiceMode) {
        const newUrl = `${window.location.pathname}?mode=${state.practiceMode}`;
        window.history.pushState(null, '', newUrl);
      }
    }
  }, [state.showModeSelector, state.practiceMode]);
  */
  
  // Check for session recovery on mount
  useEffect(() => {
    const hasBackup = hasValidSessionBackup();
    if (hasBackup) {
      // Session recovery will be shown in mode selector
    }
    
    return () => {
      isMountedRef.current = false;
      audio.cancel();
      timer.stop();
      countdown.stop();
    };
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTyping =
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.tagName === 'INPUT' ||
        activeElement?.getAttribute('contenteditable') === 'true';
      
      const key = e.key.toLowerCase();
      
      // Next sentence shortcut
      if (state.testState.isComplete && key === 'n' && !isTyping) {
        e.preventDefault();
        handleNextSentence();
        return;
      }
      
      if (state.testState.isComplete || !state.testState.sentence) return;
      if (isTyping) return;
      
      // Replay shortcut
      if (key === 'r' && !audio.isSpeaking && state.testState.sentence) {
        e.preventDefault();
        handleReplay();
      }
      
      // Hint shortcut
      if (
        key === 'h' &&
        !audio.isSpeaking &&
        state.testState.sentence &&
        PRACTICE_MODES[state.practiceMode].hintsAllowed
      ) {
        e.preventDefault();
        actions.toggleHint();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.testState, audio.isSpeaking, state.practiceMode]);
  
  // Save session backup periodically
  useEffect(() => {
    if (state.sessionProgress > 0 && !state.sessionComplete) {
      actions.saveProgress();
    }
  }, [state.sessionProgress, state.sessionHistory]);
  
  // Generate certificate when session completes
  useEffect(() => {
    if (
      state.sessionComplete &&
      user &&
      state.sessionStats.count > 0 &&
      !certificateData &&
      state.lastTestResultId
    ) {
      const avgWpm = Math.round(state.sessionStats.totalWpm / state.sessionStats.count);
      const avgAccuracy = state.sessionStats.totalAccuracy / state.sessionStats.count;
      const consistency = Math.round(Math.random() * 20 + 75);
      const estimatedDuration = Math.round((state.sessionStats.count * 60 * 5) / avgWpm);
      
      const totalWords = state.sessionHistory.reduce((sum, h) => {
        return sum + h.sentence.split(' ').length;
      }, 0);
      
      const certData = {
        wpm: avgWpm,
        accuracy: avgAccuracy,
        consistency,
        speedLevel: getSpeedLevelName(parseFloat(state.speedLevel)),
        sentencesCompleted: state.sessionStats.count,
        totalWords,
        duration: estimatedDuration,
        username: user.username || 'Typing Expert',
      };
      
      setCertificateData(certData);
      
      createCertificateMutation.mutate({
        certificateType: 'dictation',
        dictationTestId: state.lastTestResultId,
        wpm: avgWpm,
        accuracy: avgAccuracy,
        consistency,
        duration: estimatedDuration,
        metadata: {
          speedLevel: getSpeedLevelName(parseFloat(state.speedLevel)),
          sentencesCompleted: state.sessionStats.count,
          totalWords,
          username: user.username || 'Typing Expert',
        },
      });
      
      clearSessionBackup();
    }
  }, [state.sessionComplete, user, state.sessionStats, state.lastTestResultId, certificateData]);
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleStartPracticeMode = useCallback((mode: PracticeMode) => {
    // Explicitly update history
    const newUrl = `${window.location.pathname}?mode=${mode}`;
    window.history.pushState(null, '', newUrl);
    
    actions.startPracticeMode(mode);
  }, [actions]);
  
  const handleBeginSession = useCallback(async () => {
    actions.beginSession();
    await loadNextSentence();
  }, [actions]);
  
  const handleRecoverSession = useCallback(() => {
    actions.recoverSession();
  }, [actions]);
  
  const loadNextSentence = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    // Reset states
    timer.reset();
    countdown.reset();
    dispatch({ type: 'RESET_TEST_STATE' });
    
    // Fetch new sentence
    const sentence = await fetchSentence({
      difficulty: state.difficulty,
      category: state.category,
      excludeIds: state.shownSentenceIds,
    });
    
    if (!isMountedRef.current) return;
    
    if (sentence) {
      dispatch({ type: 'ADD_SHOWN_SENTENCE_ID', payload: sentence.id });
      dispatch({
        type: 'SET_TEST_STATE',
        payload: { sentence },
      });
      
      // Speak the sentence after a short delay
      setTimeout(() => {
        if (isMountedRef.current) {
          audio.speak(sentence.sentence);
        }
      }, 800);
    } else {
      toast({
        title: 'Failed to load sentence',
        description: 'Could not fetch a new sentence. Please try again.',
        variant: 'destructive',
      });
    }
  }, [
    state.difficulty,
    state.category,
    state.shownSentenceIds,
    fetchSentence,
    audio,
    timer,
    countdown,
    dispatch,
    toast,
  ]);
  
  const handleReplay = useCallback(() => {
    if (state.testState.sentence && !audio.isSpeaking) {
      actions.incrementReplayCount();
      audio.replay(state.testState.sentence.sentence);
    }
  }, [state.testState.sentence, audio, actions]);
  
  const handleSubmit = useCallback(async () => {
    const { sentence, startTime, typedText, replayCount, hintShown } = state.testState;
    
    if (!sentence || !startTime || !typedText.trim()) return;
    
    const endTime = Date.now();
    const elapsedSeconds = (endTime - startTime) / 1000;
    const duration = Math.round(elapsedSeconds);
    
    if (elapsedSeconds < 1) {
      toast({
        title: 'Too fast!',
        description: 'Please take your time to type the sentence.',
      });
      return;
    }
    
    // Calculate results
    const accuracyResult = calculateDictationAccuracy(typedText, sentence.sentence);
    const wpm = calculateDictationWPM(typedText.length, elapsedSeconds);
    const wordErrors = accuracyResult.wordDiff.filter((d) => d.status !== 'correct').length;
    
    const result: DictationTestResult = {
      accuracy: accuracyResult.accuracy,
      wpm,
      errors: wordErrors,
      duration,
      characterDiff: accuracyResult.characterDiff,
      wordDiff: accuracyResult.wordDiff,
      correctChars: accuracyResult.correctChars,
      totalChars: accuracyResult.totalChars,
      correctWords: accuracyResult.correctWords,
      totalWords: accuracyResult.totalWords,
    };
    
    // Stop timer
    timer.stop();
    
    // Update state via context action
    actions.handleTestComplete(result, duration);
    
    // Save to server
    const saveResult = await saveTest({
      sentenceId: sentence.id,
      speedLevel: state.speedLevel,
      actualSpeed: audio.currentRate,
      actualSentence: sentence.sentence,
      typedText,
      wpm: result.wpm,
      accuracy: result.accuracy,
      errors: result.errors,
      replayCount,
      hintUsed: hintShown ? 1 : 0,
      duration,
    });
    
    if (saveResult?.id) {
      dispatch({ type: 'SET_LAST_TEST_RESULT_ID', payload: saveResult.id });
    }
    
    // Start auto-advance if enabled
    if (PRACTICE_MODES[state.practiceMode].autoAdvance) {
      countdown.start();
    }
  }, [state.testState, state.speedLevel, state.practiceMode, audio, timer, countdown, actions, dispatch, saveTest, toast]);
  
  const handleNextSentence = useCallback(async () => {
    countdown.stop();
    
    // Check if session is complete
    if (state.sessionProgress >= state.sessionLength) {
      dispatch({ type: 'SET_SESSION_COMPLETE', payload: true });
      clearSessionBackup();
      return;
    }
    
    await loadNextSentence();
  }, [state.sessionProgress, state.sessionLength, countdown, dispatch, loadNextSentence]);
  
  const handleToggleBookmark = useCallback(() => {
    const { sentence, result } = state.testState;
    if (!sentence) return;
    
    const isBookmarked = state.bookmarks.some((b) => b.id === sentence.id);
    
    if (isBookmarked) {
      dispatch({ type: 'REMOVE_BOOKMARK', payload: sentence.id });
      toast({ title: 'Bookmark removed' });
    } else {
      const bookmark = {
        id: sentence.id,
        sentence: sentence.sentence,
        category: sentence.category || 'general',
        difficulty: sentence.difficulty,
        bookmarkedAt: Date.now(),
        lastAccuracy: result?.accuracy,
      };
      dispatch({ type: 'TOGGLE_BOOKMARK', payload: bookmark });
      toast({ title: 'Sentence bookmarked' });
    }
  }, [state.testState, state.bookmarks, dispatch, toast]);
  
  const handleNewSession = useCallback(() => {
    setCertificateData(null);
    actions.resetSession();
  }, [actions]);
  
  const handleRestartSession = useCallback(() => {
    audio.cancel();
    timer.reset();
    countdown.reset();
    actions.restartCurrentSession();
    
    setTimeout(() => {
      loadNextSentence();
    }, 100);
  }, [audio, timer, countdown, actions, loadNextSentence]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Check browser support
  if (!audio.isSupported) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">Browser Not Supported</h2>
            <p className="text-muted-foreground">
              Your browser doesn't support speech synthesis. Please use a modern browser like
              Chrome, Edge, or Safari to use Dictation Mode.
            </p>
            <Link href="/">
              <Button className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Session complete screen
  if (state.sessionComplete) {
    return (
      <>
        <DictationSessionComplete
          sessionStats={state.sessionStats}
          sessionHistory={state.sessionHistory}
          sessionLength={state.sessionLength}
          speedLevel={state.speedLevel}
          username={user?.username}
          certificateData={certificateData}
          onNewSession={handleNewSession}
          onShare={() => setShowShareModal(true)}
          onSessionLengthChange={(length) => dispatch({ type: 'SET_SESSION_LENGTH', payload: length })}
        />

        {showShareModal && (
          <DictationShareDialog
            open={showShareModal}
            onOpenChange={setShowShareModal}
            wpm={state.sessionStats.count > 0 ? Math.round(state.sessionStats.totalWpm / state.sessionStats.count) : 0}
            accuracy={state.sessionStats.count > 0 ? Math.round(state.sessionStats.totalAccuracy / state.sessionStats.count) : 0}
            errors={state.sessionStats.totalErrors}
            duration={undefined}
            lastResultId={state.lastTestResultId}
            username={user?.username}
            speedLevel={state.speedLevel}
            certificateContent={certificateData ? <DictationCertificate {...certificateData} /> : undefined}
          />
        )}
      </>
    );
  }
  
  // Mode selector
  if (state.showModeSelector) {
    return (
      <DictationModeSelector
        streakData={state.streakData}
        onSelectMode={handleStartPracticeMode}
        hasRecoverableSession={hasValidSessionBackup()}
        onRecoverSession={handleRecoverSession}
      />
    );
  }
  
  // Waiting to start
  if (state.isWaitingToStart) {
    return (
      <TooltipProvider>
        <div className="container max-w-4xl mx-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                dispatch({ type: 'SET_SHOW_MODE_SELECTOR', payload: true });
                dispatch({ type: 'SET_IS_WAITING_TO_START', payload: false });
                
                // Clean URL
                const newUrl = window.location.pathname;
                window.history.pushState(null, '', newUrl);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">{PRACTICE_MODES[state.practiceMode].name}</h1>
            <div className="w-20" />
          </div>
          
          <DictationSetupPanel
            difficulty={state.difficulty}
            speedLevel={state.speedLevel}
            category={state.category}
            sessionLength={state.sessionLength}
            currentOpenAIVoice={audio.currentOpenAIVoice}
            openAIVoices={audio.openAIVoices}
            currentRate={audio.currentRate}
            adaptiveDifficulty={state.adaptiveDifficulty}
            onDifficultyChange={(diff) => dispatch({ type: 'SET_DIFFICULTY', payload: diff })}
            onSpeedLevelChange={(speed) => dispatch({ type: 'SET_SPEED_LEVEL', payload: speed })}
            onCategoryChange={(cat) => dispatch({ type: 'SET_CATEGORY', payload: cat })}
            onSessionLengthChange={(len) => dispatch({ type: 'SET_SESSION_LENGTH', payload: len })}
            onOpenAIVoiceChange={audio.setOpenAIVoice}
            onAdaptiveDifficultyToggle={() => {
              const newEnabled = !state.adaptiveDifficulty.enabled;
              dispatch({
                type: 'SET_ADAPTIVE_DIFFICULTY',
                payload: {
                  enabled: newEnabled,
                  currentLevel: state.difficulty,
                  consecutiveHighScores: 0,
                  consecutiveLowScores: 0,
                  recentScores: [],
                },
              });
            }}
            onStartSession={handleBeginSession}
            onChangeMode={() => {
              dispatch({ type: 'SET_SHOW_MODE_SELECTOR', payload: true });
              dispatch({ type: 'SET_IS_WAITING_TO_START', payload: false });
              const newUrl = window.location.pathname;
              window.history.pushState(null, '', newUrl);
            }}
            isLoading={isFetching}
          />
        </div>
      </TooltipProvider>
    );
  }
  
  // Main practice view
  const isReady = !audio.isSpeaking && state.testState.startTime !== null;
  const isBookmarked = state.testState.sentence
    ? state.bookmarks.some((b) => b.id === state.testState.sentence!.id)
    : false;
  
  return (
    <TooltipProvider delayDuration={300}>
      <div className="container max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ type: 'SET_SHOW_MODE_SELECTOR', payload: true })}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Exit
              </Button>
            </TooltipTrigger>
            <TooltipContent>Return to mode selection</TooltipContent>
          </Tooltip>
          
          <h1 className="text-xl font-bold">{PRACTICE_MODES[state.practiceMode].name}</h1>
          
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dispatch({ type: 'SET_SHOW_SETTINGS', payload: !state.showSettings })}
                >
                  <Settings2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dispatch({ type: 'SET_SHOW_ANALYTICS', payload: !state.showAnalytics })}
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Analytics</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dispatch({ type: 'SET_SHOW_BOOKMARKS', payload: !state.showBookmarks })}
                >
                  <Bookmark className="w-4 h-4" />
                  {state.bookmarks.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px]">
                      {state.bookmarks.length}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bookmarks</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* Settings panel */}
        {state.showSettings && (
          <DictationSettings
            practiceMode={state.practiceMode}
            difficulty={state.difficulty}
            speedLevel={state.speedLevel}
            category={state.category}
            currentOpenAIVoice={audio.currentOpenAIVoice}
            openAIVoices={audio.openAIVoices}
            currentRate={audio.currentRate}
            adaptiveDifficulty={state.adaptiveDifficulty}
            zenTheme={state.zenTheme}
            streakData={state.streakData}
            onSpeedLevelChange={(speed) => dispatch({ type: 'SET_SPEED_LEVEL', payload: speed })}
            onDifficultyChange={(diff) => {
              dispatch({ type: 'SET_DIFFICULTY', payload: diff });
              if (state.adaptiveDifficulty.enabled) {
                dispatch({
                  type: 'SET_ADAPTIVE_DIFFICULTY',
                  payload: { currentLevel: diff, consecutiveHighScores: 0, consecutiveLowScores: 0 },
                });
              }
            }}
            onCategoryChange={(cat) => dispatch({ type: 'SET_CATEGORY', payload: cat })}
            onOpenAIVoiceChange={audio.setOpenAIVoice}
            onZenThemeChange={(theme) => dispatch({ type: 'SET_ZEN_THEME', payload: theme })}
            onAdaptiveDifficultyToggle={() => {
              const newEnabled = !state.adaptiveDifficulty.enabled;
              dispatch({
                type: 'SET_ADAPTIVE_DIFFICULTY',
                payload: {
                  enabled: newEnabled,
                  currentLevel: state.difficulty,
                  consecutiveHighScores: 0,
                  consecutiveLowScores: 0,
                  recentScores: [],
                },
              });
              toast({
                title: newEnabled ? 'Adaptive Difficulty Enabled' : 'Adaptive Difficulty Disabled',
                description: newEnabled
                  ? 'Difficulty will adjust based on your performance.'
                  : 'Difficulty will stay at your selected level.',
              });
            }}
            onEnterZenMode={actions.enterZenMode}
            onClose={() => dispatch({ type: 'SET_SHOW_SETTINGS', payload: false })}
            isLoading={isFetching}
            isSpeaking={audio.isSpeaking}
          />
        )}
        
        {/* Progress bar */}
        <DictationProgressBar current={state.sessionProgress} total={state.sessionLength} />
        
        {/* Quick settings bar */}
        {!state.testState.isComplete && (
          <Card className="mb-6 bg-muted/30">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Quick Settings
                </h3>
                <Badge variant="outline" className="text-xs">
                  {state.testState.replayCount} replays
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
                  <Select
                    value={state.difficulty}
                    onValueChange={(val) => dispatch({ type: 'SET_DIFFICULTY', payload: val as DifficultyLevel })}
                    disabled={isFetching || audio.isSpeaking}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">{getDifficultyEmoji('easy')} Easy</SelectItem>
                      <SelectItem value="medium">{getDifficultyEmoji('medium')} Medium</SelectItem>
                      <SelectItem value="hard">{getDifficultyEmoji('hard')} Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Topic</label>
                  <Select
                    value={state.category}
                    onValueChange={(val) => dispatch({ type: 'SET_CATEGORY', payload: val })}
                    disabled={isFetching || audio.isSpeaking}
                  >
                    <SelectTrigger className="h-10">
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
                
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full h-10"
                    onClick={handleRestartSession}
                    disabled={isFetching || audio.isSpeaking}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restart
                  </Button>
                </div>
                
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    className="w-full h-10"
                    onClick={() => {
                      handleNewSession();
                      
                      // Clean URL
                      const newUrl = window.location.pathname;
                      window.history.pushState(null, '', newUrl);
                    }}
                    disabled={isFetching || audio.isSpeaking}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Exit Mode
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Main content based on test state */}
        {state.testState.isComplete && state.testState.result ? (
          <DictationResults
            result={state.testState.result}
            sentence={state.testState.sentence!.sentence}
            typedText={state.testState.typedText}
            replayCount={state.testState.replayCount}
            hintUsed={state.testState.hintShown}
            duration={state.testState.result.duration}
            isBookmarked={isBookmarked}
            coachingTip={state.currentCoachingTip}
            autoAdvanceCountdown={countdown.countdown}
            isLastSentence={state.sessionProgress >= state.sessionLength}
            onNext={handleNextSentence}
            onReplay={() => {
              // Reset and retry same sentence
              dispatch({
                type: 'SET_TEST_STATE',
                payload: {
                  typedText: '',
                  startTime: null,
                  endTime: null,
                  isComplete: false,
                  result: null,
                  replayCount: 0,
                  hintShown: false,
                  showHint: false,
                },
              });
              timer.reset();
              setTimeout(() => {
                audio.speak(state.testState.sentence!.sentence);
              }, 500);
            }}
            onToggleBookmark={handleToggleBookmark}
          />
        ) : (
          <>
            {/* Audio player */}
            <Card className="mb-6 overflow-hidden">
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  <DictationAudioPlayer
                    isSpeaking={audio.isSpeaking}
                    isReady={isReady}
                    isLoading={isFetching}
                    showHint={state.testState.showHint}
                    hintText={state.testState.sentence?.sentence}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Typing area */}
            <DictationTypingArea
              typedText={state.testState.typedText}
              onTypedTextChange={actions.setTypedText}
              onSubmit={handleSubmit}
              onReplay={handleReplay}
              onToggleHint={actions.toggleHint}
              showHint={state.testState.showHint}
              elapsedTime={state.elapsedTime}
              practiceMode={state.practiceMode}
              isSpeaking={audio.isSpeaking}
              isReady={isReady}
              disabled={isFetching || isSaving}
            />
          </>
        )}
        
        {/* Share dialog */}
        {showShareModal && (
          <DictationShareDialog
            open={showShareModal}
            onOpenChange={setShowShareModal}
            wpm={state.sessionStats.count > 0 ? Math.round(state.sessionStats.totalWpm / state.sessionStats.count) : 0}
            accuracy={state.sessionStats.count > 0 ? Math.round(state.sessionStats.totalAccuracy / state.sessionStats.count) : 0}
            errors={state.sessionStats.totalErrors}
            duration={undefined}
            lastResultId={state.lastTestResultId}
            username={user?.username}
            speedLevel={state.speedLevel}
            certificateContent={certificateData ? <DictationCertificate {...certificateData} /> : undefined}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// WRAPPED EXPORT WITH ERROR BOUNDARY AND PROVIDER
// ============================================================================

export default function DictationMode() {
  return (
    <DictationErrorBoundary>
      <DictationProvider>
        <DictationModeContent />
      </DictationProvider>
    </DictationErrorBoundary>
  );
}
