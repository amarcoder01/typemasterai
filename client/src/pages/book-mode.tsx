import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/searchable-select";
import { BookOpen, Trophy, Zap, Target, RotateCcw, ArrowRight, Sparkles, Loader2, HelpCircle } from "lucide-react";
import confetti from "canvas-confetti";
import type { BookParagraph, InsertBookTypingTest } from "@shared/schema";

const DURATION_MODES = [
  { value: 30, label: "30s" },
  { value: 60, label: "60s" },
  { value: 90, label: "90s" },
  { value: 120, label: "2min" },
];

function calculateWPM(chars: number, seconds: number): number {
  if (seconds === 0) return 0;
  return Math.round((chars / 5) / (seconds / 60));
}

function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getDifficultyColor(difficulty: string): string {
  const colors: Record<string, string> = {
    easy: "bg-green-500/20 text-green-500 border-green-500/50",
    medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
    hard: "bg-red-500/20 text-red-500 border-red-500/50",
  };
  return colors[difficulty] || colors.medium;
}

export default function BookMode() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState({ topic: '', difficulty: 'medium', durationMode: 60 });
  const [currentParagraph, setCurrentParagraph] = useState<BookParagraph | null>(null);
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [completedTestData, setCompletedTestData] = useState<{
    duration: number;
    wpm: number;
    accuracy: number;
    errors: number;
  } | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch topics for filter dropdown
  const { data: topicsData } = useQuery({
    queryKey: ['bookTopics'],
    queryFn: async () => {
      const res = await fetch('/api/book-topics');
      if (!res.ok) throw new Error('Failed to fetch topics');
      return res.json();
    },
  });

  const topics = topicsData?.topics || [];
  const topicOptions = [
    { value: '', label: 'All Topics' },
    ...topics.map((topic: string) => ({ value: topic, label: topic.charAt(0).toUpperCase() + topic.slice(1) }))
  ];

  // Fetch random paragraph based on filters
  const fetchParagraph = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.topic) params.append('topic', filters.topic);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);
      if (filters.durationMode) params.append('durationMode', filters.durationMode.toString());
      
      const res = await fetch(`/api/book-paragraphs/random?${params}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Server error: ${res.status}`);
      }
      const paragraph = await res.json();
      setCurrentParagraph(paragraph);
      resetTestState();
    } catch (error: any) {
      console.error("Error fetching paragraph:", error);
      toast({
        title: "Failed to Load Paragraph",
        description: error.message?.includes("No paragraphs found")
          ? "No paragraphs match your current filters. Try different settings."
          : error.message?.includes("Network")
          ? "Network error. Please check your connection and try again."
          : "Unable to load paragraph. Press Ctrl+Enter to retry.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  // Continue reading - fetch next paragraph from same book
  const continueReading = async () => {
    if (!currentParagraph) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/book-paragraphs/next/${currentParagraph.bookId}/${currentParagraph.paragraphIndex}`);
      if (res.ok) {
        const nextParagraph = await res.json();
        setCurrentParagraph(nextParagraph);
        resetTestState();
        toast({
          title: "Next Paragraph Loaded",
          description: `Paragraph ${nextParagraph.paragraphIndex + 1} of ${nextParagraph.source}`,
        });
      } else {
        toast({
          title: "End of Book",
          description: "You've reached the last available paragraph. Loading a new book...",
        });
        await fetchParagraph();
      }
    } catch (error: any) {
      console.error("Error loading next paragraph:", error);
      toast({
        title: "Failed to Load Next Paragraph",
        description: "Loading a new book instead.",
        variant: "destructive",
      });
      await fetchParagraph();
    } finally {
      setIsLoading(false);
    }
  };

  // Save test result
  const saveTestMutation = useMutation({
    mutationFn: async (result: Omit<InsertBookTypingTest, 'userId'>) => {
      const res = await fetch('/api/book-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Saved!",
        description: "Your book typing test result has been saved to your profile.",
      });
      queryClient.invalidateQueries({ queryKey: ["bookStats"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Save Test",
        description: error.message?.includes("401")
          ? "Please log in to save your test results."
          : error.message?.includes("Network")
          ? "Network error. Your result wasn't saved. Please check your connection."
          : "Could not save your test result. Your stats are still visible above.",
        variant: "destructive",
      });
    },
  });

  // Load initial paragraph
  useEffect(() => {
    fetchParagraph();
  }, []);

  // Calculate stats in real-time
  useEffect(() => {
    if (isActive && startTime && currentParagraph) {
      const chars = userInput.length;
      const errorCount = userInput.split("").filter((char, i) => char !== currentParagraph.text[i]).length;
      const correctChars = chars - errorCount;
      const timeElapsed = (Date.now() - startTime) / 1000;
      
      setWpm(calculateWPM(correctChars, timeElapsed));
      setAccuracy(calculateAccuracy(correctChars, chars));
      setErrors(errorCount);
      
      if (userInput === currentParagraph.text) {
        finishTest();
      }
    }
  }, [userInput, isActive, startTime, currentParagraph]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isActive && !isFinished) {
        resetTest();
        toast({
          title: "Test Reset",
          description: "Press any key to start typing.",
        });
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !isActive) {
        e.preventDefault();
        fetchParagraph();
        toast({
          title: "New Paragraph",
          description: "Loading a random paragraph...",
        });
      }

      if (e.key === "Tab" && isFinished) {
        e.preventDefault();
        continueReading();
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [isActive, isFinished, fetchParagraph]);

  // Auto-focus textarea
  useEffect(() => {
    if (currentParagraph && !isActive && !isFinished && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentParagraph, isActive, isFinished]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
    } else if (!isActive) {
      setElapsedTime(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, startTime]);

  const finishTest = () => {
    if (!currentParagraph || !startTime) return;

    setIsActive(false);
    setIsFinished(true);
    
    // Use raw seconds for WPM calculation, rounded for display/storage
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const duration = Math.round(elapsedSeconds);
    
    // Recalculate final WPM with precise elapsed time
    const chars = userInput.length;
    const errorCount = userInput.split("").filter((char, i) => char !== currentParagraph.text[i]).length;
    const correctChars = chars - errorCount;
    const finalWpm = calculateWPM(correctChars, elapsedSeconds);
    const finalAccuracy = calculateAccuracy(correctChars, chars);
    
    setWpm(finalWpm);
    setAccuracy(finalAccuracy);
    setErrors(errorCount);
    
    setCompletedTestData({
      duration,
      wpm: finalWpm,
      accuracy: finalAccuracy,
      errors: errorCount,
    });
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#00FFFF', '#FF00FF']
    });

    if (user) {
      saveTestMutation.mutate({
        paragraphId: currentParagraph.id,
        wpm: finalWpm,
        accuracy: finalAccuracy,
        characters: userInput.length,
        errors: errorCount,
        duration,
      });
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;
    processInput(e.target.value);
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    setTimeout(() => {
      if (textareaRef.current) {
        const value = textareaRef.current.value;
        processInput(value);
      }
    }, 0);
  };

  const processInput = (value: string) => {
    if (!currentParagraph || isFinished) return;
    
    if (value.length > currentParagraph.text.length) {
      if (textareaRef.current) textareaRef.current.value = userInput;
      return;
    }
    
    if (!isActive && value.length > 0) {
      setIsActive(true);
      setStartTime(Date.now());
    }
    
    setUserInput(value);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    toast({
      title: "Paste Disabled",
      description: "Please type manually for accurate results.",
      variant: "destructive",
    });
  };

  const handleCut = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  };

  const resetTestState = () => {
    setUserInput("");
    setStartTime(null);
    setIsActive(false);
    setIsFinished(false);
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
    setCompletedTestData(null);
    setElapsedTime(0);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const resetTest = () => {
    resetTestState();
    fetchParagraph();
  };

  if (!currentParagraph && !isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Paragraphs Available</h2>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters or check back later.
          </p>
          <Button onClick={fetchParagraph} data-testid="button-retry">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const paragraphText = currentParagraph?.text || "";
  const highlightedText = paragraphText.split("").map((char, index) => {
    let className = "text-muted-foreground";
    if (index < userInput.length) {
      className = userInput[index] === char ? "text-green-500" : "text-red-500 bg-red-500/20";
    }
    return (
      <span key={index} className={className}>
        {char}
      </span>
    );
  });

  return (
    <TooltipProvider>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold">Book Typing Mode</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Improve your typing speed by reading classic literature
          </p>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Topic:
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Choose a book topic: fiction, philosophy, science, history, and more from classic literature</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <SearchableSelect
                      value={filters.topic}
                      onValueChange={(value) => setFilters({ ...filters, topic: value })}
                      options={topicOptions}
                      placeholder="All Topics"
                      searchPlaceholder="Search topics..."
                      icon={<Sparkles className="w-4 h-4" />}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filter books by subject matter or browse all topics</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Difficulty:
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Easy: simple vocabulary • Medium: standard literature • Hard: complex language and longer sentences</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <RadioGroup
                value={filters.difficulty}
                onValueChange={(value) => setFilters({ ...filters, difficulty: value })}
                className="flex gap-2"
                disabled={isActive}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="easy" id="easy" data-testid="radio-difficulty-easy" />
                      <Label htmlFor="easy" className="cursor-pointer">Easy</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Simple vocabulary and short sentences</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" data-testid="radio-difficulty-medium" />
                      <Label htmlFor="medium" className="cursor-pointer">Medium</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Standard literary vocabulary and structure</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hard" id="hard" data-testid="radio-difficulty-hard" />
                      <Label htmlFor="hard" className="cursor-pointer">Hard</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Complex language, advanced vocabulary, longer sentences</p>
                  </TooltipContent>
                </Tooltip>
              </RadioGroup>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Duration:
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Choose paragraph length: 30s for quick practice, up to 2min for longer reading sessions</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <div className="flex gap-1">
                {DURATION_MODES.map((mode) => (
                  <Tooltip key={mode.value}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={filters.durationMode === mode.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters({ ...filters, durationMode: mode.value })}
                        disabled={isActive}
                        data-testid={`button-duration-${mode.value}`}
                      >
                        {mode.label}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Target reading time: {mode.label}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={fetchParagraph}
                  disabled={isActive || isLoading}
                  variant="secondary"
                  data-testid="button-new-book"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span className="ml-2">New Book</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Load a random paragraph from a different book (or press Ctrl+Enter)</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </Card>

      {/* Book Metadata */}
      {currentParagraph && (
        <Card className="p-4 mb-6 border-primary/50">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="font-semibold" data-testid="text-book-source">
                  {currentParagraph.source}
                </span>
              </div>
              <Badge variant="outline" className="capitalize">
                {currentParagraph.topic}
              </Badge>
              <Badge variant="outline" className={getDifficultyColor(currentParagraph.difficulty)}>
                {currentParagraph.difficulty}
              </Badge>
              <span className="text-sm text-muted-foreground" data-testid="text-paragraph-progress">
                Paragraph {currentParagraph.paragraphIndex + 1}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {currentParagraph.lengthWords} words
            </div>
          </div>
        </Card>
      )}

      {/* Stats Display */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">WPM</span>
          </div>
          <div className="text-3xl font-bold text-yellow-500" data-testid="text-wpm">
            {wpm}
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Target className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Accuracy</span>
          </div>
          <div className="text-3xl font-bold text-green-500" data-testid="text-accuracy">
            {accuracy}%
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-sm text-muted-foreground">Errors</span>
          </div>
          <div className="text-3xl font-bold text-red-500" data-testid="text-errors">
            {errors}
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-sm text-muted-foreground">Time</span>
          </div>
          <div className="text-3xl font-bold" data-testid="text-timer">
            {formatTime(elapsedTime)}
          </div>
        </Card>
      </div>

      {/* Typing Interface */}
      <Card className="p-6 mb-6 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        <div className="mb-4">
          <pre className="font-serif text-lg leading-relaxed whitespace-pre-wrap">
            {highlightedText}
          </pre>
        </div>

        <Textarea
          ref={textareaRef}
          value={userInput}
          onChange={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onPaste={handlePaste}
          onCut={handleCut}
          placeholder={isLoading ? "Loading paragraph..." : "Start typing here..."}
          className="min-h-[150px] font-serif text-lg resize-none"
          disabled={isFinished || isLoading}
          data-testid="textarea-typing"
        />

        {isFinished && (
          <div className="mt-4 flex gap-3 justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={continueReading}
                  size="lg"
                  className="gap-2"
                  data-testid="button-continue-reading"
                >
                  <ArrowRight className="w-5 h-5" />
                  Continue Reading
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Load the next paragraph from the same book (or press Tab)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={resetTest}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                  data-testid="button-new-paragraph"
                >
                  <RotateCcw className="w-5 h-5" />
                  New Paragraph
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Get a random paragraph from a different book based on your filters</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </Card>

      {/* Keyboard Shortcuts */}
      <Card className="p-4 bg-muted/50">
        <div className="text-sm text-muted-foreground text-center">
          <span className="font-semibold">Shortcuts:</span>{" "}
          <kbd className="px-2 py-1 bg-background rounded text-xs">Esc</kbd> Reset • {" "}
          <kbd className="px-2 py-1 bg-background rounded text-xs">Ctrl+Enter</kbd> New Paragraph • {" "}
          <kbd className="px-2 py-1 bg-background rounded text-xs">Tab</kbd> Continue Reading (when finished)
        </div>
      </Card>

      {/* Results Dialog */}
      <Dialog open={isFinished} onOpenChange={(open) => !open && resetTestState()}>
        <DialogContent data-testid="dialog-results">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Test Complete!
            </DialogTitle>
            <DialogDescription>
              Great job! Here are your results:
            </DialogDescription>
          </DialogHeader>
          {completedTestData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-sm text-muted-foreground mb-1">WPM</div>
                  <div className="text-3xl font-bold text-yellow-500">{completedTestData.wpm}</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-sm text-muted-foreground mb-1">Accuracy</div>
                  <div className="text-3xl font-bold text-green-500">{completedTestData.accuracy}%</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-sm text-muted-foreground mb-1">Errors</div>
                  <div className="text-3xl font-bold text-red-500">{completedTestData.errors}</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-sm text-muted-foreground mb-1">Time</div>
                  <div className="text-3xl font-bold">{formatTime(completedTestData.duration)}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={continueReading}
                  className="flex-1 gap-2"
                  data-testid="button-dialog-continue"
                >
                  <ArrowRight className="w-4 h-4" />
                  Continue Reading
                </Button>
                <Button
                  onClick={resetTest}
                  variant="outline"
                  className="flex-1 gap-2"
                  data-testid="button-dialog-new"
                >
                  <RotateCcw className="w-4 h-4" />
                  New Book
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
