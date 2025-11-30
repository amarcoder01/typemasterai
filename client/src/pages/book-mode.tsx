import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/searchable-select";
import { BookOpen, Trophy, Zap, Target, RotateCcw, ArrowRight, Sparkles, Loader2, HelpCircle, RefreshCw, AlertCircle, WifiOff } from "lucide-react";
import confetti from "canvas-confetti";
import type { BookParagraph, InsertBookTypingTest } from "@shared/schema";
import { calculateWPM, calculateAccuracy } from "@/lib/typing-utils";

interface CachedTopics {
  topics: string[];
  timestamp: number;
}

interface CachedParagraph {
  paragraph: BookParagraph;
  filters: { topic: string; difficulty: string; durationMode: number };
  timestamp: number;
}

const TOPICS_CACHE_KEY = 'book_topics_cache';
const PARAGRAPH_CACHE_KEY = 'book_paragraph_cache';
const TOPICS_CACHE_TTL = 30 * 60 * 1000;
const PARAGRAPH_CACHE_TTL = 10 * 60 * 1000;

function getTopicsCache(): string[] | null {
  try {
    const cached = localStorage.getItem(TOPICS_CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedTopics = JSON.parse(cached);
    if (Date.now() - parsed.timestamp < TOPICS_CACHE_TTL) {
      return parsed.topics;
    }
    localStorage.removeItem(TOPICS_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function setTopicsCache(topics: string[]): void {
  try {
    const cached: CachedTopics = { topics, timestamp: Date.now() };
    localStorage.setItem(TOPICS_CACHE_KEY, JSON.stringify(cached));
  } catch {}
}

function getParagraphCache(filters: { topic: string; difficulty: string; durationMode: number }): BookParagraph | null {
  try {
    const cached = localStorage.getItem(PARAGRAPH_CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedParagraph = JSON.parse(cached);
    if (Date.now() - parsed.timestamp < PARAGRAPH_CACHE_TTL &&
        parsed.filters.topic === filters.topic &&
        parsed.filters.difficulty === filters.difficulty &&
        parsed.filters.durationMode === filters.durationMode) {
      return parsed.paragraph;
    }
    return null;
  } catch {
    return null;
  }
}

function setParagraphCache(paragraph: BookParagraph, filters: { topic: string; difficulty: string; durationMode: number }): void {
  try {
    const cached: CachedParagraph = { paragraph, filters, timestamp: Date.now() };
    localStorage.setItem(PARAGRAPH_CACHE_KEY, JSON.stringify(cached));
  } catch {}
}

const DURATION_MODES = [
  { value: 30, label: "30s" },
  { value: 60, label: "60s" },
  { value: 90, label: "90s" },
  { value: 120, label: "2min" },
];

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

async function fetchTopics(): Promise<{ topics: string[] }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const res = await fetch('/api/book-topics', {
      signal: controller.signal,
      credentials: 'include',
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`);
    }
    
    const data = await res.json();
    setTopicsCache(data.topics || []);
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    if (error.message === 'Failed to fetch') {
      throw new Error('NETWORK_ERROR');
    }
    throw error;
  }
}

async function fetchRandomParagraph(filters: { topic: string; difficulty: string; durationMode: number }): Promise<BookParagraph> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const params = new URLSearchParams();
    if (filters.topic) params.append('topic', filters.topic);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.durationMode) params.append('durationMode', filters.durationMode.toString());
    
    const res = await fetch(`/api/book-paragraphs/random?${params}`, {
      signal: controller.signal,
      credentials: 'include',
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('NO_PARAGRAPHS');
      }
      throw new Error(`HTTP_${res.status}`);
    }
    
    const paragraph = await res.json();
    setParagraphCache(paragraph, filters);
    return paragraph;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    if (error.message === 'Failed to fetch') {
      throw new Error('NETWORK_ERROR');
    }
    throw error;
  }
}

async function fetchNextParagraph(bookId: number, paragraphIndex: number): Promise<BookParagraph | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const res = await fetch(`/api/book-paragraphs/next/${bookId}/${paragraphIndex}`, {
      signal: controller.signal,
      credentials: 'include',
    });
    
    clearTimeout(timeoutId);
    
    if (res.status === 404) {
      return null;
    }
    
    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`);
    }
    
    return res.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    if (error.message === 'Failed to fetch') {
      throw new Error('NETWORK_ERROR');
    }
    throw error;
  }
}

function LoadingSkeleton() {
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

        <Card className="p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-28" />
          </div>
        </Card>

        <Card className="p-4 mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </Card>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 text-center">
              <Skeleton className="h-4 w-16 mx-auto mb-2" />
              <Skeleton className="h-10 w-20 mx-auto" />
            </Card>
          ))}
        </div>

        <Card className="p-6 mb-6">
          <div className="space-y-3 mb-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          <Skeleton className="h-[150px] w-full" />
        </Card>
      </div>
    </TooltipProvider>
  );
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
  isRetrying: boolean;
  hasFilters: boolean;
  onResetFilters: () => void;
}

function ErrorState({ error, onRetry, isRetrying, hasFilters, onResetFilters }: ErrorStateProps) {
  let icon = <AlertCircle className="w-16 h-16 text-destructive" />;
  let title = "Unable to Load Paragraph";
  let description = "Something went wrong while loading the book paragraph.";
  let showRetry = true;
  let showResetFilters = false;
  
  switch (error) {
    case 'NETWORK_ERROR':
      icon = <WifiOff className="w-16 h-16 text-muted-foreground" />;
      title = "No Internet Connection";
      description = "Please check your internet connection and try again.";
      break;
    case 'TIMEOUT':
      title = "Request Timed Out";
      description = "The server took too long to respond. Please try again.";
      break;
    case 'NO_PARAGRAPHS':
      icon = <BookOpen className="w-16 h-16 text-muted-foreground" />;
      title = "No Paragraphs Found";
      description = hasFilters 
        ? "No paragraphs match your current filters. Try different settings."
        : "The book library is still being populated. Please check back later.";
      showRetry = !hasFilters;
      showResetFilters = hasFilters;
      break;
  }
  
  return (
    <TooltipProvider>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold">Book Typing Mode</h1>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 p-4">
          {icon}
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-semibold mb-2">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {showRetry && (
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                data-testid="button-retry-paragraph"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            )}
            {showResetFilters && (
              <Button
                onClick={onResetFilters}
                variant="outline"
                data-testid="button-reset-filters"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [completedTestData, setCompletedTestData] = useState<{
    duration: number;
    wpm: number;
    accuracy: number;
    errors: number;
  } | null>(null);
  const [pendingResult, setPendingResult] = useState<Omit<InsertBookTypingTest, 'userId'> | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasInitiallyLoaded = useRef(false);

  const { 
    data: topicsData,
    isLoading: topicsLoading,
    isError: topicsError,
    refetch: refetchTopics
  } = useQuery({
    queryKey: ['bookTopics'],
    queryFn: fetchTopics,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    placeholderData: () => {
      const cached = getTopicsCache();
      return cached ? { topics: cached } : undefined;
    },
  });

  const topics = topicsData?.topics || [];
  const topicOptions = useMemo(() => [
    { value: '', label: 'All Topics' },
    ...topics.map((topic: string) => ({ 
      value: topic, 
      label: topic.charAt(0).toUpperCase() + topic.slice(1).replace(/-/g, ' ')
    }))
  ], [topics]);

  const fetchParagraph = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      const paragraph = await fetchRandomParagraph(filters);
      setCurrentParagraph(paragraph);
      resetTestState();
      setRetryCount(0);
      
      if (hasInitiallyLoaded.current) {
        toast({
          title: "Paragraph Loaded",
          description: `${paragraph.source} - ${paragraph.lengthWords} words`,
        });
      } else {
        hasInitiallyLoaded.current = true;
      }
    } catch (error: any) {
      console.error("Error fetching paragraph:", error);
      setLoadError(error.message);
      
      const cachedParagraph = getParagraphCache(filters);
      if (cachedParagraph && !currentParagraph) {
        setCurrentParagraph(cachedParagraph);
        toast({
          title: "Using Cached Data",
          description: "Loaded a previously cached paragraph due to network issues.",
        });
      } else {
        let description = "Unable to load paragraph. Press Ctrl+Enter to retry.";
        if (error.message === 'NETWORK_ERROR') {
          description = "Network error. Please check your connection and try again.";
        } else if (error.message === 'TIMEOUT') {
          description = "Request timed out. Please try again.";
        } else if (error.message === 'NO_PARAGRAPHS') {
          description = "No paragraphs match your current filters. Try different settings.";
        }
        
        toast({
          title: "Failed to Load Paragraph",
          description,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast, currentParagraph]);

  const continueReading = useCallback(async () => {
    if (!currentParagraph) return;
    
    setIsLoading(true);
    setLoadError(null);
    
    try {
      const nextParagraph = await fetchNextParagraph(currentParagraph.bookId, currentParagraph.paragraphIndex);
      
      if (nextParagraph) {
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
      
      let description = "Loading a new book instead.";
      if (error.message === 'NETWORK_ERROR') {
        description = "Network error. Loading a new book...";
      } else if (error.message === 'TIMEOUT') {
        description = "Request timed out. Loading a new book...";
      }
      
      toast({
        title: "Failed to Load Next Paragraph",
        description,
        variant: "destructive",
      });
      
      await fetchParagraph();
    } finally {
      setIsLoading(false);
    }
  }, [currentParagraph, fetchParagraph, toast]);

  const saveTestMutation = useMutation({
    mutationFn: async (result: Omit<InsertBookTypingTest, 'userId'>) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const res = await fetch('/api/book-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result),
          credentials: 'include',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${res.status}`);
        }
        return res.json();
      } catch (error: any) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Test Saved!",
        description: "Your book typing test result has been saved to your profile.",
      });
      queryClient.invalidateQueries({ queryKey: ["bookStats"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      setPendingResult(null);
    },
    onError: (error: any) => {
      const isNetworkError = error.message === 'Failed to fetch' || 
                             error.name === 'AbortError' ||
                             error.message.includes('NetworkError');
      
      toast({
        title: "Failed to Save Test",
        description: error.message?.includes("401")
          ? "Please log in to save your test results."
          : isNetworkError
          ? "Network error. Your result wasn't saved. You can retry below."
          : "Could not save your test result. Your stats are still visible above.",
        variant: "destructive",
      });
    },
    retry: 2,
    retryDelay: 1000,
  });

  useEffect(() => {
    fetchParagraph();
  }, []);

  const normalizedText = useMemo(() => {
    return (currentParagraph?.text || "").replace(/\n/g, " ").replace(/\s+/g, " ");
  }, [currentParagraph]);

  const stats = useMemo(() => {
    if (!isActive || !startTime || !currentParagraph) {
      return { wpm: 0, accuracy: 100, errors: 0 };
    }
    
    const chars = userInput.length;
    const errorCount = userInput.split("").filter((char, i) => char !== normalizedText[i]).length;
    const correctChars = chars - errorCount;
    const timeElapsed = (Date.now() - startTime) / 1000;
    
    return {
      wpm: calculateWPM(correctChars, timeElapsed),
      accuracy: calculateAccuracy(correctChars, chars),
      errors: errorCount,
    };
  }, [userInput, isActive, startTime, currentParagraph, normalizedText]);

  useEffect(() => {
    if (!isActive || isFinished) return;
    
    const timer = setTimeout(() => {
      setWpm(stats.wpm);
      setAccuracy(stats.accuracy);
      setErrors(stats.errors);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [stats, isActive, isFinished]);

  useEffect(() => {
    if (isActive && currentParagraph && userInput === normalizedText) {
      finishTest();
    }
  }, [userInput, isActive, currentParagraph, normalizedText]);

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
      }

      if (e.key === "Tab" && isFinished) {
        e.preventDefault();
        continueReading();
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [isActive, isFinished, fetchParagraph, continueReading, toast]);

  useEffect(() => {
    if (currentParagraph && !isActive && !isFinished && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentParagraph, isActive, isFinished]);

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
    if (!currentParagraph || !startTime) return;

    setIsActive(false);
    setIsFinished(true);
    
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const duration = Math.round(elapsedSeconds);
    
    const chars = userInput.length;
    const errorCount = userInput.split("").filter((char, i) => char !== normalizedText[i]).length;
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
      const result = {
        paragraphId: currentParagraph.id,
        wpm: finalWpm,
        accuracy: finalAccuracy,
        characters: chars,
        errors: errorCount,
        duration,
      };
      setPendingResult(result);
      saveTestMutation.mutate(result);
    }
  }, [currentParagraph, startTime, userInput, user, saveTestMutation, normalizedText]);

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
        processInput(textareaRef.current.value);
      }
    }, 0);
  };

  const processInput = (value: string) => {
    if (!currentParagraph || isFinished) return;
    
    if (value.length > normalizedText.length) {
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
    setPendingResult(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const resetTest = () => {
    resetTestState();
    fetchParagraph();
  };
  
  const handleResetFilters = () => {
    setFilters({ topic: '', difficulty: 'medium', durationMode: 60 });
    setLoadError(null);
    setTimeout(() => fetchParagraph(), 100);
  };
  
  const handleRetrySave = () => {
    if (pendingResult) {
      saveTestMutation.mutate(pendingResult);
    }
  };
  
  const hasFilters = filters.topic !== '' || filters.difficulty !== 'medium' || filters.durationMode !== 60;

  if (!currentParagraph && isLoading) {
    return <LoadingSkeleton />;
  }

  if (!currentParagraph && loadError) {
    return (
      <ErrorState
        error={loadError}
        onRetry={fetchParagraph}
        isRetrying={isLoading}
        hasFilters={hasFilters}
        onResetFilters={handleResetFilters}
      />
    );
  }

  if (!currentParagraph && !isLoading) {
    return (
      <ErrorState
        error="NO_PARAGRAPHS"
        onRetry={fetchParagraph}
        isRetrying={isLoading}
        hasFilters={hasFilters}
        onResetFilters={handleResetFilters}
      />
    );
  }

  const highlightedText = normalizedText.split("").map((char, index) => {
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

      {currentParagraph && (
        <Card className="p-4 mb-6 border-primary/50">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span className="font-semibold" data-testid="text-book-source">
                      {currentParagraph.source}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Current book title from the library</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="capitalize cursor-help">
                    {currentParagraph.topic.replace(/-/g, ' ')}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Book genre/category</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className={`cursor-help ${getDifficultyColor(currentParagraph.difficulty)}`}>
                    {currentParagraph.difficulty}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {currentParagraph.difficulty === 'easy' ? 'Beginner-friendly text' :
                     currentParagraph.difficulty === 'medium' ? 'Standard literary complexity' :
                     'Advanced vocabulary and structure'}
                  </p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-muted-foreground cursor-help" data-testid="text-paragraph-progress">
                    Paragraph {currentParagraph.paragraphIndex + 1}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your position in the current book</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm text-muted-foreground cursor-help">
                  {currentParagraph.lengthWords} words
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total words in this paragraph</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="p-4 text-center cursor-help">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">WPM</span>
              </div>
              <div className="text-3xl font-bold text-yellow-500" data-testid="text-wpm">
                {wpm}
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Words Per Minute - your typing speed</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="p-4 text-center cursor-help">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Target className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Accuracy</span>
              </div>
              <div className="text-3xl font-bold text-green-500" data-testid="text-accuracy">
                {accuracy}%
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Percentage of correctly typed characters</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="p-4 text-center cursor-help">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">Errors</span>
              </div>
              <div className="text-3xl font-bold text-red-500" data-testid="text-errors">
                {errors}
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Number of incorrect characters typed</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="p-4 text-center cursor-help">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">Time</span>
              </div>
              <div className="text-3xl font-bold" data-testid="text-timer">
                {formatTime(elapsedTime)}
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total time spent typing</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Card className="p-6 mb-6 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading paragraph...</span>
            </div>
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
          <div className="mt-4 flex gap-3 justify-center flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={continueReading}
                  size="lg"
                  className="gap-2"
                  disabled={isLoading}
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
                  disabled={isLoading}
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
            {pendingResult && saveTestMutation.isError && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleRetrySave}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                    disabled={saveTestMutation.isPending}
                    data-testid="button-retry-save"
                  >
                    {saveTestMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5" />
                    )}
                    Retry Save
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Try saving your results again</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </Card>

      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="p-4 bg-muted/50 cursor-help">
            <div className="text-sm text-muted-foreground text-center">
              <span className="font-semibold">Shortcuts:</span>{" "}
              <kbd className="px-2 py-1 bg-background rounded text-xs">Esc</kbd> Reset • {" "}
              <kbd className="px-2 py-1 bg-background rounded text-xs">Ctrl+Enter</kbd> New Paragraph • {" "}
              <kbd className="px-2 py-1 bg-background rounded text-xs">Tab</kbd> Continue Reading (when finished)
            </div>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p>Use these keyboard shortcuts for quick actions while typing</p>
        </TooltipContent>
      </Tooltip>

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
              
              {saveTestMutation.isError && (
                <div className="p-3 bg-destructive/10 rounded-lg text-center">
                  <p className="text-sm text-destructive mb-2">Failed to save your result</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetrySave}
                    disabled={saveTestMutation.isPending}
                    data-testid="button-dialog-retry-save"
                  >
                    {saveTestMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Retry Save
                  </Button>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  onClick={continueReading}
                  className="flex-1 gap-2"
                  disabled={isLoading}
                  data-testid="button-dialog-continue"
                >
                  <ArrowRight className="w-4 h-4" />
                  Continue Reading
                </Button>
                <Button
                  onClick={resetTest}
                  variant="outline"
                  className="flex-1 gap-2"
                  disabled={isLoading}
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
