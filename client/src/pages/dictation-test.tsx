import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Volume2, RotateCcw, Eye, EyeOff, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [completedTests, setCompletedTests] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const currentRate = getSpeedRate(speedLevel);
  const { speak, cancel, isSpeaking, isSupported, error: speechError } = useSpeechSynthesis({
    rate: currentRate,
    lang: 'en-US',
  });

  const { data: sentenceData, refetch: fetchNewSentence, isLoading } = useQuery({
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
      if (!res.ok) throw new Error('Failed to save test');
      return res.json();
    },
  });

  const startNewTest = useCallback(async () => {
    cancel();
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
      }, 500);
    }
  }, [cancel, fetchNewSentence, speak]);

  useEffect(() => {
    startNewTest();
  }, []);

  useEffect(() => {
    if (!isSpeaking && testState.sentence && !testState.startTime && !testState.isComplete) {
      setTestState(prev => ({ ...prev, startTime: Date.now() }));
      inputRef.current?.focus();
    }
  }, [isSpeaking, testState.sentence, testState.startTime, testState.isComplete]);

  const handleReplay = () => {
    if (testState.sentence) {
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
    if (!testState.sentence || !testState.startTime || testState.isComplete) return;

    const endTime = Date.now();
    const duration = Math.round((endTime - testState.startTime) / 1000);
    
    const accuracyResult = calculateDictationAccuracy(
      testState.typedText,
      testState.sentence.sentence
    );
    
    const wpm = calculateDictationWPM(
      testState.typedText.length,
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

    try {
      await saveTestMutation.mutateAsync({
        sentenceId: testState.sentence.id,
        speedLevel,
        actualSpeed: currentRate,
        actualSentence: testState.sentence.sentence,
        typedText: testState.typedText,
        wpm: result.wpm,
        accuracy: result.accuracy,
        errors: result.errors,
        replayCount: testState.replayCount,
        hintUsed: testState.hintShown ? 1 : 0,
        duration: result.duration,
      });

      setCompletedTests(prev => prev + 1);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save test result',
        variant: 'destructive',
      });
    }
  };

  const handleNext = () => {
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

      {!testState.isComplete ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold" data-testid="text-completed-count">{completedTests}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </CardContent>
            </Card>
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
          </div>

          <Card className="mb-6">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                {isSpeaking ? (
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Volume2 className="w-16 h-16 text-primary animate-pulse" />
                    <p className="text-xl font-semibold" data-testid="text-speaking">Speaking...</p>
                    <p className="text-sm text-muted-foreground">
                      Speed: {getSpeedLevelName(currentRate)} ({currentRate}x)
                    </p>
                  </div>
                ) : testState.startTime ? (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Volume2 className="w-12 h-12 text-muted-foreground" />
                    <p className="text-lg font-semibold" data-testid="text-ready">Ready to type!</p>
                    {testState.showHint && testState.sentence && (
                      <p className="text-sm text-primary font-mono mt-4 p-4 bg-primary/10 rounded-md" data-testid="text-hint">
                        {testState.sentence.sentence}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="text-lg text-muted-foreground">Preparing...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <label className="text-sm font-medium mb-2 block">Type what you heard:</label>
              <Input
                ref={inputRef}
                type="text"
                value={testState.typedText}
                onChange={(e) => setTestState(prev => ({ ...prev, typedText: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSpeaking && testState.startTime) {
                    handleSubmit();
                  }
                }}
                disabled={isSpeaking || !testState.startTime}
                placeholder="Type here..."
                className="text-lg p-4"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-testid="input-typed-text"
              />
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleReplay}
              disabled={!testState.sentence || isSpeaking}
              variant="outline"
              data-testid="button-replay"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Replay
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
              data-testid="button-submit"
            >
              <Check className="w-4 h-4 mr-2" />
              Submit
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
              <h2 className="text-2xl font-bold text-center mb-6">Results</h2>
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

              <div className="space-y-4 mt-6">
                <div>
                  <p className="text-sm font-medium mb-2">Correct sentence:</p>
                  <p className="p-3 bg-green-500/10 rounded-md font-mono text-sm" data-testid="text-correct-sentence">
                    {testState.sentence?.sentence}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Your typing:</p>
                  <p className="p-3 bg-blue-500/10 rounded-md font-mono text-sm" data-testid="text-your-typing">
                    {testState.typedText}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-center mt-6">
                <Button onClick={handleNext} data-testid="button-next">
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Next Sentence
                </Button>
                <Link href="/">
                  <Button variant="outline" data-testid="button-finish">
                    Finish
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
