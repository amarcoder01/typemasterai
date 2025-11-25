import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Trophy, Zap, Target, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";
import type { BookParagraph, InsertBookTypingTest } from "@shared/schema";

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

export default function ChapterTyping() {
  const [match, params] = useRoute("/books/:slug/chapter/:chapterNum");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const slug = params?.slug || '';
  const chapterNum = params?.chapterNum ? parseInt(params.chapterNum) : 0;

  const [chapterText, setChapterText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [completedTestData, setCompletedTestData] = useState<{
    duration: number;
    wpm: number;
    accuracy: number;
    errors: number;
  } | null>(null);
  const [paragraphs, setParagraphs] = useState<BookParagraph[]>([]);
  const [cursorPosition, setCursorPosition] = useState({ left: 0, top: 0, height: 40 });
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const correctSpanRef = useRef<HTMLSpanElement>(null);
  const incorrectSpanRef = useRef<HTMLSpanElement>(null);

  // Fetch book by slug to get bookId
  const { data: book, isLoading: bookLoading } = useQuery({
    queryKey: ['book', slug],
    queryFn: async () => {
      const res = await fetch(`/api/books/${slug}`);
      if (!res.ok) throw new Error('Failed to fetch book');
      return res.json();
    },
    enabled: !!slug,
  });

  // Fetch chapter paragraphs
  const { data: chapterParagraphs = [], isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapter', book?.id, chapterNum],
    queryFn: async () => {
      const res = await fetch(`/api/books/${book!.id}/chapters/${chapterNum}`);
      if (!res.ok) throw new Error('Failed to fetch chapter');
      return res.json() as Promise<BookParagraph[]>;
    },
    enabled: !!book && chapterNum > 0,
  });

  // Set chapter text when paragraphs load
  useEffect(() => {
    if (chapterParagraphs.length > 0) {
      const text = chapterParagraphs.map(p => p.text).join('\n\n');
      setChapterText(text);
      setParagraphs(chapterParagraphs);
      
      // Try to restore progress from localStorage
      const progressKey = `chapter-progress-${slug}-${chapterNum}`;
      let progressRestored = false;
      
      try {
        const savedProgress = localStorage.getItem(progressKey);
        if (savedProgress) {
          const { userInput: savedInput, timestamp } = JSON.parse(savedProgress);
          // Only restore if saved within last 24 hours
          const age = Date.now() - timestamp;
          if (age < 24 * 60 * 60 * 1000 && savedInput.length > 0 && savedInput.length < text.length) {
            setUserInput(savedInput);
            setIsActive(true);
            setStartTime(Date.now() - 1000); // Add 1s buffer
            progressRestored = true;
            toast({
              title: "Progress Restored",
              description: "Your previous typing progress has been restored.",
            });
          } else {
            localStorage.removeItem(progressKey);
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }
      
      // Only reset if no progress was restored
      if (!progressRestored) {
        resetTestState();
      }
    }
  }, [chapterParagraphs]);

  // Save progress to localStorage
  useEffect(() => {
    if (userInput && chapterText && !isFinished && slug && chapterNum) {
      const progressKey = `chapter-progress-${slug}-${chapterNum}`;
      try {
        localStorage.setItem(progressKey, JSON.stringify({
          userInput,
          timestamp: Date.now(),
        }));
      } catch (e) {
        // Ignore localStorage errors (quota exceeded, etc.)
      }
    }
  }, [userInput, chapterText, isFinished, slug, chapterNum]);

  // Clear progress on test completion
  useEffect(() => {
    if (isFinished && slug && chapterNum) {
      const progressKey = `chapter-progress-${slug}-${chapterNum}`;
      try {
        localStorage.removeItem(progressKey);
      } catch (e) {
        // Ignore errors
      }
    }
  }, [isFinished, slug, chapterNum]);

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
        title: "Chapter Complete!",
        description: "Your progress has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["bookStats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Save Progress",
        description: error.message?.includes("401")
          ? "Please log in to save your progress."
          : "Could not save your progress. Your stats are still visible above.",
        variant: "destructive",
      });
    },
  });

  // Memoize stats calculation for performance
  const stats = useMemo(() => {
    if (!isActive || !startTime || !chapterText) {
      return { wpm: 0, accuracy: 100, errors: 0 };
    }
    
    const chars = userInput.length;
    const errorCount = userInput.split("").filter((char, i) => char !== chapterText[i]).length;
    const correctChars = chars - errorCount;
    const timeElapsed = (Date.now() - startTime) / 1000;
    
    return {
      wpm: calculateWPM(correctChars, timeElapsed),
      accuracy: calculateAccuracy(correctChars, chars),
      errors: errorCount,
    };
  }, [userInput, isActive, startTime, chapterText]);

  // Update stats with debouncing (only while active and not finished)
  useEffect(() => {
    if (!isActive || isFinished) return;
    
    const timer = setTimeout(() => {
      setWpm(stats.wpm);
      setAccuracy(stats.accuracy);
      setErrors(stats.errors);
    }, 50); // 50ms debounce for smooth updates
    
    return () => clearTimeout(timer);
  }, [stats, isActive, isFinished]);

  // Check for test completion
  useEffect(() => {
    if (isActive && userInput === chapterText && chapterText) {
      finishTest();
    }
  }, [userInput, chapterText, isActive, finishTest]);

  // Auto-focus input
  useEffect(() => {
    if (chapterText && !isActive && !isFinished && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chapterText, isActive, isFinished]);

  // Update cursor position using document.createRange() for performance
  const updateCursorPosition = useCallback(() => {
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      
      try {
        const containerRect = containerRef.current.getBoundingClientRect();
        let targetSpan: HTMLSpanElement | null = null;
        let offsetInSpan = 0;
        
        // Determine which span contains the cursor
        if (correctSpanRef.current && userInput.length <= (correctSpanRef.current.textContent?.length || 0)) {
          targetSpan = correctSpanRef.current;
          offsetInSpan = userInput.length;
        } else if (incorrectSpanRef.current) {
          targetSpan = incorrectSpanRef.current;
          const correctLength = correctSpanRef.current?.textContent?.length || 0;
          offsetInSpan = userInput.length - correctLength;
        }
        
        if (targetSpan && targetSpan.firstChild) {
          const range = document.createRange();
          const textNode = targetSpan.firstChild;
          const maxOffset = textNode.textContent?.length || 0;
          const safeOffset = Math.min(offsetInSpan, maxOffset);
          
          range.setStart(textNode, safeOffset);
          range.setEnd(textNode, safeOffset);
          
          const rect = range.getBoundingClientRect();
          const relativeLeft = rect.left - containerRect.left;
          const relativeTop = rect.top - containerRect.top;
          const height = rect.height || 40;
          
          setCursorPosition({ left: relativeLeft, top: relativeTop, height });
        } else {
          // Fallback to start position
          setCursorPosition({ left: 0, top: 0, height: 40 });
        }
      } catch (error) {
        // Fallback on error
        setCursorPosition({ left: 0, top: 0, height: 40 });
      }
    });
  }, [userInput.length]);

  useEffect(() => {
    updateCursorPosition();
  }, [updateCursorPosition]);

  // Recalculate cursor on window resize and font load
  useEffect(() => {
    const handleResize = () => updateCursorPosition();
    window.addEventListener('resize', handleResize);
    
    // Recalculate after fonts load
    if (document.fonts) {
      document.fonts.ready.then(() => updateCursorPosition());
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCursorPosition]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to reset test
      if (e.key === 'Escape' && isActive && !isFinished) {
        e.preventDefault();
        resetTestState();
        toast({
          title: "Test Reset",
          description: "Your progress has been cleared. Start typing to begin again.",
        });
      }
      
      // Arrow keys for chapter navigation (when not typing)
      if (!isActive && !isFinished) {
        if (e.key === 'ArrowLeft' && chapterNum > 1) {
          e.preventDefault();
          goToPreviousChapter();
        } else if (e.key === 'ArrowRight' && book && chapterNum < book.totalChapters) {
          e.preventDefault();
          goToNextChapter();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isFinished, chapterNum, book]);

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

  const finishTest = useCallback(() => {
    if (!chapterText || !startTime || paragraphs.length === 0) return;

    // Calculate final stats synchronously for accuracy
    const chars = userInput.length;
    const errorCount = userInput.split("").filter((char, i) => char !== chapterText[i]).length;
    const correctChars = chars - errorCount;
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    const finalWpm = calculateWPM(correctChars, duration);
    const finalAccuracy = calculateAccuracy(correctChars, chars);
    const finalErrors = errorCount;

    setIsActive(false);
    setIsFinished(true);
    
    // Set final stats immediately (bypass debounce)
    setWpm(finalWpm);
    setAccuracy(finalAccuracy);
    setErrors(finalErrors);
    
    setCompletedTestData({
      duration,
      wpm: finalWpm,
      accuracy: finalAccuracy,
      errors: finalErrors,
    });
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#00FFFF', '#FF00FF']
    });

    // Save result for the first paragraph (representing the chapter)
    if (user) {
      saveTestMutation.mutate({
        paragraphId: paragraphs[0].id,
        wpm: finalWpm,
        accuracy: finalAccuracy,
        characters: chars,
        errors: finalErrors,
        duration,
      });
    }
  }, [chapterText, startTime, paragraphs, userInput, user, saveTestMutation]);

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
      if (inputRef.current) {
        const value = inputRef.current.value;
        processInput(value);
      }
    }, 0);
  };

  const processInput = (value: string) => {
    if (!chapterText || isFinished) return;
    
    if (value.length > chapterText.length) {
      if (inputRef.current) inputRef.current.value = userInput;
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

  const handleContainerClick = () => {
    inputRef.current?.focus();
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
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const goToNextChapter = () => {
    if (!book) return;
    const nextChapter = chapterNum + 1;
    if (nextChapter <= book.totalChapters) {
      setLocation(`/books/${slug}/chapter/${nextChapter}`);
    } else {
      toast({
        title: "Last Chapter",
        description: "You've completed the book!",
      });
      setLocation(`/books/${slug}`);
    }
  };

  const goToPreviousChapter = () => {
    const prevChapter = chapterNum - 1;
    if (prevChapter > 0) {
      setLocation(`/books/${slug}/chapter/${prevChapter}`);
    } else {
      setLocation(`/books/${slug}`);
    }
  };

  if (bookLoading || chaptersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!book || chapterParagraphs.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Chapter Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This chapter doesn't exist or hasn't been loaded yet.
          </p>
          <Button onClick={() => setLocation(`/books/${slug}`)} data-testid="button-back">
            Back to Book
          </Button>
        </div>
      </div>
    );
  }

  // 3-segment rendering for optimal performance with range-based cursor
  const renderText = () => {
    // Find where correct typing ends and incorrect begins
    let correctUpTo = 0;
    for (let i = 0; i < userInput.length && i < chapterText.length; i++) {
      if (userInput[i] === chapterText[i]) {
        correctUpTo = i + 1;
      } else {
        break;
      }
    }
    
    const correctText = chapterText.slice(0, correctUpTo);
    const incorrectText = chapterText.slice(correctUpTo, userInput.length);
    const remainingText = chapterText.slice(userInput.length);
    
    return (
      <>
        {correctText && (
          <span ref={correctSpanRef} className="text-foreground">
            {correctText}
          </span>
        )}
        {incorrectText && (
          <span ref={incorrectSpanRef} className="text-red-500 bg-red-500/20">
            {incorrectText}
          </span>
        )}
        {remainingText && (
          <span className="text-muted-foreground/60">
            {remainingText}
          </span>
        )}
      </>
    );
  };

  const chapterTitle = paragraphs[0]?.chapterTitle || `Chapter ${chapterNum}`;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation(`/books/${slug}`)}
          className="mb-4"
          data-testid="button-back-to-book"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {book.title}
        </Button>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold" data-testid="text-chapter-title">{chapterTitle}</h1>
            </div>
            <p className="text-muted-foreground">
              {book.title} by {book.author}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousChapter}
              disabled={chapterNum <= 1}
              data-testid="button-previous-chapter"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Badge variant="outline" className="text-sm">
              Chapter {chapterNum} of {book.totalChapters}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextChapter}
              disabled={chapterNum >= book.totalChapters}
              data-testid="button-next-chapter"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Display */}
      <div className="grid grid-cols-4 gap-4 mb-6" role="region" aria-label="Typing statistics">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-yellow-500" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">WPM</span>
          </div>
          <div 
            className="text-3xl font-bold text-yellow-500" 
            data-testid="text-wpm"
            role="status"
            aria-live="polite"
            aria-label={`Words per minute: ${wpm}`}
          >
            {wpm}
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Target className="w-4 h-4 text-green-500" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">Accuracy</span>
          </div>
          <div 
            className="text-3xl font-bold text-green-500" 
            data-testid="text-accuracy"
            role="status"
            aria-live="polite"
            aria-label={`Accuracy: ${accuracy} percent`}
          >
            {accuracy}%
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-sm text-muted-foreground">Errors</span>
          </div>
          <div 
            className="text-3xl font-bold text-red-500" 
            data-testid="text-errors"
            role="status"
            aria-live="polite"
            aria-label={`Errors: ${errors}`}
          >
            {errors}
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-sm text-muted-foreground">Time</span>
          </div>
          <div 
            className="text-3xl font-bold" 
            data-testid="text-timer"
            role="timer"
            aria-live="off"
            aria-label={`Elapsed time: ${formatTime(elapsedTime)}`}
          >
            {formatTime(elapsedTime)}
          </div>
        </Card>
      </div>

      {/* Typing Interface - typelit.io style */}
      <Card className="p-6 mb-6 relative">
        <div 
          ref={containerRef}
          onClick={handleContainerClick}
          className="relative min-h-[200px] font-serif text-lg leading-relaxed cursor-text"
          data-testid="typing-container"
          role="application"
          aria-label="Chapter typing practice area"
        >
          {/* Hidden Textarea for multi-line support */}
          <Textarea
            ref={inputRef}
            value={userInput}
            onChange={handleInput}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onPaste={handlePaste}
            onCut={handleCut}
            className="absolute opacity-0 w-full h-full cursor-default z-0 resize-none"
            autoFocus
            disabled={isFinished}
            data-testid="hidden-input"
          />
          
          {/* Text Display */}
          <div className="relative z-10 whitespace-pre-wrap pointer-events-none select-none">
            {renderText()}
          </div>
          
          {/* Visual Cursor */}
          {!isFinished && (
            <div
              className="absolute pointer-events-none z-20 bg-primary/60 animate-pulse"
              style={{
                left: `${cursorPosition.left}px`,
                top: `${cursorPosition.top}px`,
                width: '3px',
                height: `${cursorPosition.height}px`,
                transition: 'left 50ms ease-out, top 50ms ease-out',
              }}
              data-testid="typing-cursor"
            />
          )}
        </div>

        {isFinished && (
          <div className="mt-4 flex gap-3 justify-center">
            {chapterNum < book.totalChapters && (
              <Button
                onClick={goToNextChapter}
                size="lg"
                className="gap-2"
                data-testid="button-next-chapter-complete"
              >
                Next Chapter
                <ArrowRight className="w-5 h-5" />
              </Button>
            )}
            <Button
              onClick={resetTestState}
              variant="outline"
              size="lg"
              className="gap-2"
              data-testid="button-retry"
            >
              Retry Chapter
            </Button>
          </div>
        )}
      </Card>

      {/* Keyboard Shortcuts */}
      <Card className="p-4 bg-muted/50" role="complementary" aria-label="Keyboard shortcuts">
        <div className="text-sm text-muted-foreground">
          <div className="font-semibold mb-2 text-center">Keyboard Shortcuts</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-center">
            <div>
              <kbd className="px-2 py-1 bg-background rounded border text-xs">Esc</kbd>
              <span className="ml-2">Reset test</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-background rounded border text-xs">←</kbd>
              <span className="ml-2">Previous chapter</span>
            </div>
            <div>
              <kbd className="px-2 py-1 bg-background rounded border text-xs">→</kbd>
              <span className="ml-2">Next chapter</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Results Dialog */}
      <Dialog open={isFinished} onOpenChange={(open) => !open && resetTestState()}>
        <DialogContent data-testid="dialog-results">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Chapter Complete!
            </DialogTitle>
            <DialogDescription>
              Great job! Here are your results for {chapterTitle}:
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
                {chapterNum < book.totalChapters && (
                  <Button
                    onClick={goToNextChapter}
                    className="flex-1 gap-2"
                    data-testid="button-dialog-next"
                  >
                    Next Chapter
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  onClick={resetTestState}
                  variant="outline"
                  className="flex-1 gap-2"
                  data-testid="button-dialog-retry"
                >
                  Retry Chapter
                </Button>
                <Button
                  onClick={() => setLocation(`/books/${slug}`)}
                  variant="outline"
                  className="flex-1 gap-2"
                  data-testid="button-dialog-back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Book Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
