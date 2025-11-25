import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Volume2, RotateCcw, Eye, EyeOff, Check, ChevronRight, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { calculateDictationAccuracy, calculateDictationWPM, getSpeedRate, getSpeedLevelName } from '@shared/dictation-utils';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { DictationSentence } from '@shared/schema';

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
  } | null;
}

const SENTENCES_PER_SESSION = 10;

export default function DictationTest() {
  const { toast } = useToast();
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [speedLevel, setSpeedLevel] = useState<string>('medium');
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
  
  const currentRate = getSpeedRate(speedLevel);
  const { speak, cancel, isSpeaking, isSupported, error: speechError } = useSpeechSynthesis({
    rate: currentRate,
    lang: 'en-US',
  });

  const { refetch: fetchNewSentence, isLoading } = useQuery({
    queryKey: ['dictation-sentence', difficulty],
    queryFn: async () => {
      const res = await fetch(`/api/dictation/sentence?difficulty=${difficulty}`);
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
    if (sessionProgress >= SENTENCES_PER_SESSION) {
      setSessionComplete(true);
      return;
    }

    cancel();
    
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
  }, [cancel, fetchNewSentence, speak, sessionProgress, toast]);

  useEffect(() => {
    startNewTest();
  }, []);

  useEffect(() => {
    if (!isSpeaking && testState.sentence && !testState.startTime && !testState.isComplete) {
      setTestState(prev => ({ ...prev, startTime: Date.now() }));
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
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
    const duration = Math.round((endTime - currentStartTime) / 1000);
    
    if (duration === 0) {
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
      duration
    );

    const result = {
      accuracy: accuracyResult.accuracy,
      wpm,
      errors: accuracyResult.errors,
      duration,
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

    try {
      await saveTestMutation.mutateAsync({
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
    } catch (error) {
      console.error('Failed to save test:', error);
      toast({
        title: 'Warning',
        description: 'Could not save your test result. Your progress may not be saved.',
      });
    }

    setTimeout(() => {
      startNewTest();
    }, 3000);
  };

  const handleNextManual = () => {
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
      <div className="container max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2">Session Complete! 🎉</h2>
              <p className="text-muted-foreground">You've completed {SENTENCES_PER_SESSION} dictation tests</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-3xl font-bold text-primary" data-testid="text-session-avg-wpm">{avgWpm}</div>
                <div className="text-sm text-muted-foreground">Avg WPM</div>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <div className="text-3xl font-bold text-green-600" data-testid="text-session-avg-accuracy">{avgAccuracy}%</div>
                <div className="text-sm text-muted-foreground">Avg Accuracy</div>
              </div>
              <div className="text-center p-4 bg-orange-500/10 rounded-lg">
                <div className="text-3xl font-bold text-orange-600" data-testid="text-session-total-errors">{sessionStats.totalErrors}</div>
                <div className="text-sm text-muted-foreground">Total Errors</div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={resetSession} size="lg" data-testid="button-new-session">
                Start New Session
              </Button>
              <Link href="/">
                <Button variant="outline" size="lg" data-testid="button-home">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Dictation Mode 🎧</h1>
        <div className="w-20" />
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground" data-testid="text-progress">
              {sessionProgress} / {SENTENCES_PER_SESSION}
            </span>
          </div>
          <Progress value={(sessionProgress / SENTENCES_PER_SESSION) * 100} className="h-2" />
        </CardContent>
      </Card>

      {!testState.isComplete ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold" data-testid="text-replay-count">{testState.replayCount}</div>
                <div className="text-sm text-muted-foreground">Replays</div>
              </CardContent>
            </Card>
            <Card>
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
            <Card>
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
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold" data-testid="text-speed-label">
                  {getSpeedLevelName(currentRate)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{currentRate}x Rate</div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                {isSpeaking ? (
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Mic className="w-16 h-16 text-primary animate-pulse" />
                    <p className="text-xl font-semibold" data-testid="text-speaking">🔊 Listening...</p>
                    <p className="text-sm text-muted-foreground">
                      The sentence is being read aloud
                    </p>
                  </div>
                ) : testState.startTime ? (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Volume2 className="w-12 h-12 text-green-600" />
                    <p className="text-lg font-semibold text-green-600" data-testid="text-ready">✓ Ready! Type what you heard</p>
                    {testState.showHint && testState.sentence && (
                      <div className="mt-4 p-4 bg-primary/10 rounded-lg max-w-2xl">
                        <p className="text-sm font-medium mb-2">Hint:</p>
                        <p className="text-base font-mono text-primary" data-testid="text-hint">
                          {testState.sentence.sentence}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-lg text-muted-foreground">Loading...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <label className="text-sm font-medium mb-3 block flex items-center gap-2">
                <span>Type what you heard:</span>
                {testState.startTime && !isSpeaking && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                    Recording
                  </span>
                )}
              </label>
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
              <p className="text-xs text-muted-foreground mt-2">
                {testState.typedText.length} characters • Press Ctrl+Enter to submit
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              onClick={handleReplay}
              disabled={!testState.sentence || isSpeaking}
              variant="outline"
              data-testid="button-replay"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Replay Audio
            </Button>
            <Button
              onClick={toggleHint}
              disabled={!testState.sentence || isSpeaking}
              variant="outline"
              data-testid="button-hint"
            >
              {testState.showHint ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {testState.showHint ? 'Hide' : 'Show'} Hint
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!testState.typedText.trim() || isSpeaking || !testState.startTime}
              size="lg"
              data-testid="button-submit"
            >
              <Check className="w-4 h-4 mr-2" />
              Submit Answer
            </Button>
          </div>

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
                <h2 className="text-2xl font-bold mb-2">
                  {testState.result && testState.result.accuracy >= 90 ? '🎉 Excellent!' : 
                   testState.result && testState.result.accuracy >= 70 ? '👍 Good Job!' : '💪 Keep Practicing!'}
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary" data-testid="text-result-wpm">
                    {testState.result?.wpm}
                  </div>
                  <div className="text-sm text-muted-foreground">WPM</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600" data-testid="text-result-accuracy">
                    {testState.result?.accuracy}%
                  </div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600" data-testid="text-result-errors">
                    {testState.result?.errors}
                  </div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold" data-testid="text-result-duration">
                    {testState.result?.duration}s
                  </div>
                  <div className="text-sm text-muted-foreground">Time</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Correct sentence:</p>
                  <div className="p-4 bg-green-500/10 rounded-md">
                    <p className="font-mono text-sm" data-testid="text-correct-sentence">
                      {testState.sentence?.sentence}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Your typing:</p>
                  <div className="p-4 bg-blue-500/10 rounded-md">
                    <p className="font-mono text-sm" data-testid="text-your-typing">
                      {testState.typedText}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Next sentence in 3 seconds, or click to continue now
                </p>
                <Button onClick={handleNextManual} data-testid="button-next">
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Continue to Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
