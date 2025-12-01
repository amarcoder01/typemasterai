import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Volume2, RotateCcw, Eye, EyeOff, Check, ChevronRight, Mic, Share2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { calculateDictationAccuracy, calculateDictationWPM, getSpeedRate, getSpeedLevelName, getAccuracyGrade, type CharacterDiff } from '@shared/dictation-utils';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { DictationSentence } from '@shared/schema';
import { ShareModal } from '@/components/ShareModal';

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
  { value: 5, label: '5 sentences (Quick)' },
  { value: 10, label: '10 sentences (Standard)' },
  { value: 15, label: '15 sentences (Extended)' },
  { value: 20, label: '20 sentences (Marathon)' },
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

export default function DictationTest() {
  const { toast } = useToast();
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [speedLevel, setSpeedLevel] = useState<string>('medium');
  const [category, setCategory] = useState<string>('all');
  const [sessionLength, setSessionLength] = useState<number>(10);
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
    }
  };

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

  const startNewTest = useCallback(async () => {
    if (sessionProgress >= sessionLength) {
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
    startNewTest();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (testState.isComplete || !testState.sentence) return;
      
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'TEXTAREA' || 
                       activeElement?.tagName === 'INPUT' ||
                       activeElement?.getAttribute('contenteditable') === 'true';
      
      if (isTyping) return;
      
      const key = e.key.toLowerCase();
      
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
      
      if (key === 'h' && !isSpeaking && testState.sentence) {
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
  }, [testState.isComplete, testState.sentence, isSpeaking, cancel, speak]);

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

    setSessionStats(prev => ({
      totalWpm: prev.totalWpm + result.wpm,
      totalAccuracy: prev.totalAccuracy + result.accuracy,
      totalErrors: prev.totalErrors + result.errors,
      count: prev.count + 1,
    }));

    setSessionProgress(prev => prev + 1);

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

    const AUTO_ADVANCE_SECONDS = 3;
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
    startNewTest();
  };

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

              <div className="flex gap-4 justify-center items-center mb-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Session Length:</span>
                      <Select value={sessionLength.toString()} onValueChange={(v) => setSessionLength(parseInt(v))}>
                        <SelectTrigger className="w-[180px]" data-testid="select-session-length">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SESSION_LENGTH_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value.toString()}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Choose how many sentences to practice in your next session</p>
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
                aria-label="Dictation Mode - practice listening and typing"
              >
                Dictation Mode 🎧
              </h1>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p className="font-medium mb-1">Dictation Practice Mode</p>
              <p className="text-xs opacity-90">Listen to spoken sentences and type them accurately. Improve your listening and typing skills!</p>
            </TooltipContent>
          </Tooltip>
          <div className="w-20" />
        </div>

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
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className="cursor-help transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  tabIndex={0}
                  role="group"
                  aria-label="Replay count statistic"
                >
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold" data-testid="text-replay-count">{testState.replayCount}</div>
                    <div className="text-sm text-muted-foreground">Replays</div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">Replay Count</p>
                <p className="text-xs opacity-90">Number of times you've replayed the audio for this sentence. Fewer replays = better listening skills!</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className="focus-within:ring-2 focus-within:ring-primary/50"
                  tabIndex={0}
                  role="group"
                  aria-label="Difficulty selector"
                >
                  <CardContent className="pt-6">
                    <Select value={difficulty} onValueChange={setDifficulty} disabled={isLoading || isSpeaking}>
                      <SelectTrigger data-testid="select-difficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground mt-1">Difficulty</div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Easy: Short simple sentences • Medium: Standard sentences • Hard: Complex sentences with advanced vocabulary</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className="focus-within:ring-2 focus-within:ring-primary/50"
                  tabIndex={0}
                  role="group"
                  aria-label="Speed selector"
                >
                  <CardContent className="pt-6">
                    <Select value={speedLevel} onValueChange={setSpeedLevel} disabled={isLoading || isSpeaking}>
                      <SelectTrigger data-testid="select-speed">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slow">Slow (0.7x)</SelectItem>
                        <SelectItem value="medium">Medium (1.0x)</SelectItem>
                        <SelectItem value="fast">Fast (1.5x)</SelectItem>
                        <SelectItem value="random">Random</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground mt-1">Speed</div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Control speech speed: Slow (0.7x) for beginners, Medium (1.0x) for practice, Fast (1.5x) for challenge, Random for variety</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className="focus-within:ring-2 focus-within:ring-primary/50"
                  tabIndex={0}
                  role="group"
                  aria-label="Voice selector"
                >
                  <CardContent className="pt-6">
                    <Select 
                      value={currentVoice?.voiceURI || ''} 
                      onValueChange={handleVoiceChange}
                      disabled={isLoading || isSpeaking || englishVoices.length === 0}
                    >
                      <SelectTrigger data-testid="select-voice">
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
                    <div className="text-xs text-muted-foreground mt-1">Voice</div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>{englishVoices.length === 0 ? 'Loading available voices...' : 'Choose the voice accent and tone you prefer for dictation'}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className="focus-within:ring-2 focus-within:ring-primary/50"
                  tabIndex={0}
                  role="group"
                  aria-label="Category selector"
                >
                  <CardContent className="pt-6">
                    <Select value={category} onValueChange={setCategory} disabled={isLoading || isSpeaking}>
                      <SelectTrigger data-testid="select-category">
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
                    <div className="text-xs text-muted-foreground mt-1">Topic</div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Filter sentences by topic: General for everyday phrases, Business for professional content, Technology for tech-related terms</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className="cursor-help transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  tabIndex={0}
                  role="group"
                  aria-label="Current speech rate display"
                >
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold" data-testid="text-speed-label">
                      {getSpeedLevelName(currentRate)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{currentRate}x Rate</div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">Current Speech Rate</p>
                <p className="text-xs opacity-90">The speed at which sentences are spoken. Adjust using the Speed selector above.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                {isSpeaking ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex flex-col items-center justify-center space-y-4 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg p-2"
                        tabIndex={0}
                        role="status"
                        aria-label="Audio is playing"
                        aria-live="polite"
                      >
                        <Mic className="w-16 h-16 text-primary animate-pulse" />
                        <p className="text-xl font-semibold" data-testid="text-speaking">🔊 Listening...</p>
                        <p className="text-sm text-muted-foreground">
                          The sentence is being read aloud
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium mb-1">Audio Playing</p>
                      <p className="text-xs opacity-90">Listen carefully to the sentence. You can replay it after it finishes.</p>
                    </TooltipContent>
                  </Tooltip>
                ) : testState.startTime ? (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="flex flex-col items-center cursor-default focus:outline-none focus:ring-2 focus:ring-green-500/50 rounded-lg p-2"
                          tabIndex={0}
                          role="status"
                          aria-label="Ready to type"
                        >
                          <Volume2 className="w-12 h-12 text-green-600" />
                          <p className="text-lg font-semibold text-green-600 mt-2" data-testid="text-ready">✓ Ready! Type what you heard</p>
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
                            className="mt-4 p-4 bg-primary/10 rounded-lg max-w-2xl cursor-help focus:outline-none focus:ring-2 focus:ring-primary/50"
                            tabIndex={0}
                            role="note"
                            aria-label="Hint showing the target sentence"
                          >
                            <p className="text-sm font-medium mb-2">Hint:</p>
                            <p className="text-base font-mono text-primary" data-testid="text-hint">
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
                        className="flex flex-col items-center justify-center space-y-2 cursor-default focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg p-2"
                        tabIndex={0}
                        role="status"
                        aria-label="Loading next sentence"
                        aria-live="polite"
                      >
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <p className="text-lg text-muted-foreground">Loading...</p>
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
                      <span className="text-xs text-green-600 flex items-center gap-2 cursor-help">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                          Timer running
                        </span>
                        <span className="font-mono bg-green-500/10 px-2 py-0.5 rounded">
                          {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                        </span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Time elapsed since audio finished. Type your answer now!</p>
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

          <div className="flex gap-3 justify-center flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleReplay}
                  disabled={!testState.sentence || isSpeaking}
                  variant="outline"
                  data-testid="button-replay"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Replay Audio
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Listen to the sentence again (counts as a replay penalty)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleHint}
                  disabled={!testState.sentence || isSpeaking}
                  variant="outline"
                  data-testid="button-hint"
                >
                  {testState.showHint ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {testState.showHint ? 'Hide' : 'Show'} Hint
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reveal the sentence text if you're stuck (reduces your score)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSubmit}
                  disabled={!testState.typedText.trim() || isSpeaking || !testState.startTime}
                  size="lg"
                  data-testid="button-submit"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Submit Answer
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Submit your answer for grading (or press Ctrl+Enter)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setShowKeyboardGuide(!showKeyboardGuide)}
                  variant="ghost"
                  size="sm"
                  data-testid="button-keyboard-guide"
                >
                  ⌨️ Shortcuts
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View available keyboard shortcuts</p>
              </TooltipContent>
            </Tooltip>
          </div>

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
                <div>
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
