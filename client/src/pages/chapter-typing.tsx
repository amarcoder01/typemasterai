import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookOpen, Trophy, Zap, Target, ArrowLeft, ArrowRight, Loader2, RefreshCw, AlertCircle, WifiOff, Share2, Award, Copy, Check, Twitter, Facebook, Linkedin, MessageCircle, Send, Mail } from "lucide-react";
import confetti from "canvas-confetti";
import type { Book, BookParagraph, InsertBookTypingTest } from "@shared/schema";
import { calculateWPM, calculateAccuracy } from "@/lib/typing-utils";
import { BookCertificate } from "@/components/BookCertificate";
import { getTypingPerformanceRating } from "@/lib/share-utils";

interface CachedChapterData {
  book: Book;
  paragraphs: BookParagraph[];
  timestamp: number;
}

const CHAPTER_CACHE_TTL = 30 * 60 * 1000;

function getChapterCache(slug: string, chapterNum: number): CachedChapterData | null {
  try {
    const cached = localStorage.getItem(`chapter_cache_${slug}_${chapterNum}`);
    if (!cached) return null;
    
    const parsed: CachedChapterData = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    if (age < CHAPTER_CACHE_TTL) {
      return parsed;
    }
    
    localStorage.removeItem(`chapter_cache_${slug}_${chapterNum}`);
    return null;
  } catch {
    return null;
  }
}

function setChapterCache(slug: string, chapterNum: number, book: Book, paragraphs: BookParagraph[]): void {
  try {
    const cached: CachedChapterData = {
      book,
      paragraphs,
      timestamp: Date.now(),
    };
    localStorage.setItem(`chapter_cache_${slug}_${chapterNum}`, JSON.stringify(cached));
  } catch {
  }
}

async function fetchBook(slug: string): Promise<Book> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const res = await fetch(`/api/books/${slug}`, {
      signal: controller.signal,
      credentials: 'include',
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('BOOK_NOT_FOUND');
      }
      if (res.status >= 500) {
        throw new Error('SERVER_ERROR');
      }
      throw new Error(`HTTP_${res.status}`);
    }
    
    return res.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      throw new Error('NETWORK_ERROR');
    }
    
    throw error;
  }
}

async function fetchChapterParagraphs(bookId: number, chapter: number): Promise<BookParagraph[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const res = await fetch(`/api/books/${bookId}/chapters/${chapter}`, {
      signal: controller.signal,
      credentials: 'include',
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('CHAPTER_NOT_FOUND');
      }
      if (res.status >= 500) {
        throw new Error('SERVER_ERROR');
      }
      throw new Error(`HTTP_${res.status}`);
    }
    
    return res.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      throw new Error('NETWORK_ERROR');
    }
    
    throw error;
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <Skeleton className="h-9 w-40 mb-4" />
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 text-center">
            <Skeleton className="h-4 w-16 mx-auto mb-2" />
            <Skeleton className="h-10 w-20 mx-auto" />
          </Card>
        ))}
      </div>

      <Card className="p-6 mb-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
        </div>
      </Card>
    </div>
  );
}

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
  isRetrying: boolean;
  onGoBack: () => void;
  cachedData: CachedChapterData | null;
  onUseCached: () => void;
  slug: string;
}

function ErrorState({ error, onRetry, isRetrying, onGoBack, cachedData, onUseCached, slug }: ErrorStateProps) {
  const errorType = error.message;
  
  let icon = <AlertCircle className="w-16 h-16 text-destructive" />;
  let title = "Unable to Load Chapter";
  let description = "Something went wrong while loading the chapter.";
  let canRetry = true;
  
  switch (errorType) {
    case 'NETWORK_ERROR':
      icon = <WifiOff className="w-16 h-16 text-muted-foreground" />;
      title = "No Internet Connection";
      description = "Please check your internet connection and try again.";
      break;
    case 'TIMEOUT':
      title = "Request Timed Out";
      description = "The server took too long to respond. Please try again.";
      break;
    case 'SERVER_ERROR':
      title = "Server Error";
      description = "The server encountered an error. Please try again later.";
      break;
    case 'BOOK_NOT_FOUND':
      icon = <BookOpen className="w-16 h-16 text-muted-foreground" />;
      title = "Book Not Found";
      description = "This book doesn't exist or may have been removed.";
      canRetry = false;
      break;
    case 'CHAPTER_NOT_FOUND':
      title = "Chapter Not Found";
      description = "This chapter doesn't exist or hasn't been loaded yet.";
      canRetry = false;
      break;
  }
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Button
        variant="ghost"
        onClick={onGoBack}
        className="mb-6"
        data-testid="button-back-error"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Book
      </Button>
      
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 p-4">
        {icon}
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-semibold mb-2">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {canRetry && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              data-testid="button-retry-chapter"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          )}
          {cachedData && (
            <Button
              variant="outline"
              onClick={onUseCached}
              data-testid="button-use-cached-chapter"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Use Offline Data
            </Button>
          )}
          <Button variant="outline" onClick={onGoBack} data-testid="button-go-back-chapter">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Book
          </Button>
        </div>
      </div>
    </div>
  );
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
  const [useCachedData, setUseCachedData] = useState(false);
  const [cachedData, setCachedData] = useState<CachedChapterData | null>(null);
  const [saveRetryCount, setSaveRetryCount] = useState(0);
  const [pendingResult, setPendingResult] = useState<Omit<InsertBookTypingTest, 'userId'> | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [certificateImageCopied, setCertificateImageCopied] = useState(false);
  const [isSharingCertificate, setIsSharingCertificate] = useState(false);
  const [lastResultSnapshot, setLastResultSnapshot] = useState<{
    wpm: number;
    accuracy: number;
    duration: number;
    consistency: number;
    bookTitle: string;
    author: string;
    chapter: number;
    chapterTitle: string;
    paragraphsCompleted: number;
    wordsTyped: number;
  } | null>(null);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const correctSpanRef = useRef<HTMLSpanElement>(null);
  const incorrectSpanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (slug && chapterNum) {
      const cached = getChapterCache(slug, chapterNum);
      setCachedData(cached);
    }
  }, [slug, chapterNum]);

  const { 
    data: book, 
    isLoading: bookLoading,
    isError: bookError,
    error: bookErrorData,
    isFetching: bookFetching,
    refetch: refetchBook
  } = useQuery<Book, Error>({
    queryKey: ['book', slug],
    queryFn: () => fetchBook(slug),
    enabled: !!slug && !useCachedData,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.message === 'BOOK_NOT_FOUND') return false;
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  const { 
    data: chapterParagraphs = [], 
    isLoading: chaptersLoading,
    isError: chaptersError,
    error: chaptersErrorData,
    isFetching: chaptersFetching,
    refetch: refetchChapter
  } = useQuery<BookParagraph[], Error>({
    queryKey: ['chapter', book?.id, chapterNum],
    queryFn: () => fetchChapterParagraphs(book!.id, chapterNum),
    enabled: !!book && chapterNum > 0 && !useCachedData,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.message === 'CHAPTER_NOT_FOUND') return false;
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
  
  const displayBook = useCachedData && cachedData ? cachedData.book : book;
  const displayParagraphs = useCachedData && cachedData ? cachedData.paragraphs : chapterParagraphs;
  
  useEffect(() => {
    if (book && chapterParagraphs.length > 0 && slug && chapterNum && !useCachedData) {
      setChapterCache(slug, chapterNum, book, chapterParagraphs);
    }
  }, [book, chapterParagraphs, slug, chapterNum, useCachedData]);

  useEffect(() => {
    if (displayParagraphs.length > 0) {
      const text = displayParagraphs.map(p => p.text).join('\n\n');
      setChapterText(text);
      setParagraphs(displayParagraphs);
      
      const progressKey = `chapter-progress-${slug}-${chapterNum}`;
      let progressRestored = false;
      
      try {
        const savedProgress = localStorage.getItem(progressKey);
        if (savedProgress) {
          const { userInput: savedInput, timestamp, elapsedSeconds } = JSON.parse(savedProgress);
          const age = Date.now() - timestamp;
          if (age < 24 * 60 * 60 * 1000 && savedInput.length > 0 && savedInput.length < text.length) {
            setUserInput(savedInput);
            setIsActive(true);
            const resumeTime = elapsedSeconds ? Date.now() - (elapsedSeconds * 1000) : Date.now() - 1000;
            setStartTime(resumeTime);
            progressRestored = true;
            toast({
              title: "Progress Restored",
              description: `Resuming from where you left off (${Math.round((savedInput.length / text.length) * 100)}% complete).`,
            });
          } else {
            localStorage.removeItem(progressKey);
          }
        }
      } catch (e) {
      }
      
      if (!progressRestored) {
        resetTestState();
      }
    }
  }, [displayParagraphs, slug, chapterNum]);

  useEffect(() => {
    if (userInput && chapterText && !isFinished && slug && chapterNum && startTime) {
      const progressKey = `chapter-progress-${slug}-${chapterNum}`;
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      try {
        localStorage.setItem(progressKey, JSON.stringify({
          userInput,
          timestamp: Date.now(),
          elapsedSeconds,
        }));
      } catch (e) {
      }
    }
  }, [userInput, chapterText, isFinished, slug, chapterNum, startTime]);

  useEffect(() => {
    if (isFinished && slug && chapterNum) {
      const progressKey = `chapter-progress-${slug}-${chapterNum}`;
      try {
        localStorage.removeItem(progressKey);
      } catch (e) {
      }
    }
  }, [isFinished, slug, chapterNum]);

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
        title: "Chapter Complete!",
        description: "Your progress has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["bookStats"] });
      setPendingResult(null);
      setSaveRetryCount(0);
    },
    onError: (error: any) => {
      const isNetworkError = error.message === 'Failed to fetch' || 
                             error.name === 'AbortError' ||
                             error.message.includes('NetworkError');
      
      if (isNetworkError && saveRetryCount < 3) {
        setSaveRetryCount(prev => prev + 1);
        toast({
          title: "Save Failed",
          description: `Retrying... (${saveRetryCount + 1}/3)`,
        });
      } else {
        toast({
          title: "Failed to Save Progress",
          description: error.message?.includes("401")
            ? "Please log in to save your progress."
            : "Could not save your progress. Your stats are still visible above.",
          variant: "destructive",
        });
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

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
    if (chapterText && !isActive && !isFinished && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chapterText, isActive, isFinished]);

  const updateCursorPosition = useCallback(() => {
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      
      try {
        const containerRect = containerRef.current.getBoundingClientRect();
        let targetSpan: HTMLSpanElement | null = null;
        let offsetInSpan = 0;
        
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
          setCursorPosition({ left: 0, top: 0, height: 40 });
        }
      } catch (error) {
        setCursorPosition({ left: 0, top: 0, height: 40 });
      }
    });
  }, [userInput.length]);

  useEffect(() => {
    updateCursorPosition();
  }, [updateCursorPosition]);

  useEffect(() => {
    const handleResize = () => updateCursorPosition();
    window.addEventListener('resize', handleResize);
    
    if (document.fonts) {
      document.fonts.ready.then(() => updateCursorPosition());
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCursorPosition]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isActive && !isFinished) {
        e.preventDefault();
        resetTestState();
        toast({
          title: "Test Reset",
          description: "Your progress has been cleared. Start typing to begin again.",
        });
      }
      
      if (!isActive && !isFinished) {
        if (e.key === 'ArrowLeft' && chapterNum > 1) {
          e.preventDefault();
          goToPreviousChapter();
        } else if (e.key === 'ArrowRight' && displayBook && chapterNum < displayBook.totalChapters) {
          e.preventDefault();
          goToNextChapter();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isFinished, chapterNum, displayBook]);

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
    if (!chapterText || !startTime || paragraphs.length === 0 || !displayBook) return;

    const chars = userInput.length;
    const errorCount = userInput.split("").filter((char, i) => char !== chapterText[i]).length;
    const correctChars = chars - errorCount;
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const duration = Math.round(elapsedSeconds);
    
    const finalWpm = calculateWPM(correctChars, elapsedSeconds);
    const finalAccuracy = calculateAccuracy(correctChars, chars);
    const finalErrors = errorCount;
    const consistency = Math.max(0, Math.min(100, Math.round(100 - (errorCount / chars) * 100)));
    const currentChapterTitle = paragraphs[0]?.chapterTitle || `Chapter ${chapterNum}`;
    const words = chapterText.split(/\s+/).length;
    const wordsTyped = Math.min(words, Math.floor(userInput.split(/\s+/).length));

    setIsActive(false);
    setIsFinished(true);
    
    setWpm(finalWpm);
    setAccuracy(finalAccuracy);
    setErrors(finalErrors);
    
    setCompletedTestData({
      duration,
      wpm: finalWpm,
      accuracy: finalAccuracy,
      errors: finalErrors,
    });
    
    setLastResultSnapshot({
      wpm: finalWpm,
      accuracy: finalAccuracy,
      duration,
      consistency,
      bookTitle: displayBook.title,
      author: displayBook.author,
      chapter: chapterNum,
      chapterTitle: currentChapterTitle,
      paragraphsCompleted: paragraphs.length,
      wordsTyped,
    });
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#00FFFF', '#FF00FF']
    });

    if (user) {
      const result = {
        paragraphId: paragraphs[0].id,
        wpm: finalWpm,
        accuracy: finalAccuracy,
        characters: chars,
        errors: finalErrors,
        duration,
      };
      setPendingResult(result);
      saveTestMutation.mutate(result);
    }
  }, [chapterText, startTime, paragraphs, userInput, user, saveTestMutation, displayBook, chapterNum]);

  useEffect(() => {
    if (isActive && userInput === chapterText && chapterText) {
      finishTest();
    }
  }, [userInput, chapterText, isActive, finishTest]);

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
    setPendingResult(null);
    setSaveRetryCount(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const goToNextChapter = () => {
    if (!displayBook) return;
    const nextChapter = chapterNum + 1;
    if (nextChapter <= displayBook.totalChapters) {
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
  
  const handleRetry = useCallback(() => {
    setUseCachedData(false);
    refetchBook();
    if (book) {
      refetchChapter();
    }
  }, [refetchBook, refetchChapter, book]);
  
  const handleUseCached = useCallback(() => {
    if (cachedData && cachedData.paragraphs.length > 0) {
      queryClient.setQueryData(['book', slug], cachedData.book);
      queryClient.setQueryData(['chapter', cachedData.book.id, chapterNum], cachedData.paragraphs);
      
      setUseCachedData(true);
      const text = cachedData.paragraphs.map(p => p.text).join('\n\n');
      setChapterText(text);
      setParagraphs(cachedData.paragraphs);
      resetTestState();
      
      toast({
        title: "Using Offline Data",
        description: "Loaded cached chapter content. Some features may be limited.",
      });
    }
  }, [cachedData, queryClient, slug, chapterNum, toast]);
  
  const handleGoBack = useCallback(() => {
    setLocation(`/books/${slug}`);
  }, [setLocation, slug]);
  
  const handleRetrySave = useCallback(() => {
    if (pendingResult) {
      saveTestMutation.mutate(pendingResult);
    }
  }, [pendingResult, saveTestMutation]);

  const isLoading = bookLoading || (book && chaptersLoading);
  const hasError = (bookError || chaptersError) && !useCachedData;
  const error = bookErrorData || chaptersErrorData;
  const isFetching = bookFetching || chaptersFetching;

  if (isLoading && !useCachedData) {
    return <LoadingSkeleton />;
  }

  if (hasError && error) {
    return (
      <ErrorState
        error={error}
        onRetry={handleRetry}
        isRetrying={isFetching}
        onGoBack={handleGoBack}
        cachedData={cachedData}
        onUseCached={handleUseCached}
        slug={slug}
      />
    );
  }

  if (!displayBook || displayParagraphs.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Button
          variant="ghost"
          onClick={handleGoBack}
          className="mb-6"
          data-testid="button-back-empty"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Book
        </Button>
        
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <BookOpen className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-2xl font-bold">Chapter Not Found</h2>
          <p className="text-muted-foreground text-center max-w-md">
            This chapter doesn't exist or hasn't been loaded yet.
          </p>
          <Button onClick={handleGoBack} data-testid="button-back">
            Back to Book
          </Button>
        </div>
      </div>
    );
  }

  const renderText = () => {
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
          <span ref={correctSpanRef} className="text-green-500">
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => setLocation(`/books/${slug}`)}
                className="mb-4"
                data-testid="button-back-to-book"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to {displayBook.title}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Return to book chapters list</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <BookOpen className="w-8 h-8 text-primary" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Book chapter typing practice</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <h1 className="text-3xl font-bold" data-testid="text-chapter-title">{chapterTitle}</h1>
              {useCachedData && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 cursor-help">
                        Offline
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Using cached data - progress may not be saved</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-muted-foreground">
              {displayBook.title} by {displayBook.author}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
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
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{chapterNum <= 1 ? 'This is the first chapter' : `Go to Chapter ${chapterNum - 1}`}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-sm cursor-help">
                    Chapter {chapterNum} of {displayBook.totalChapters}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your current progress in the book</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextChapter}
                      disabled={chapterNum >= displayBook.totalChapters}
                      data-testid="button-next-chapter"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{chapterNum >= displayBook.totalChapters ? 'This is the last chapter' : `Go to Chapter ${chapterNum + 1}`}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6" role="region" aria-label="Typing statistics">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="p-4 text-center cursor-help">
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
            </TooltipTrigger>
            <TooltipContent>
              <p>Words Per Minute - your typing speed</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="p-4 text-center cursor-help">
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
            </TooltipTrigger>
            <TooltipContent>
              <p>Percentage of correctly typed characters</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="p-4 text-center cursor-help">
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
            </TooltipTrigger>
            <TooltipContent>
              <p>Number of incorrect characters typed</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="p-4 text-center cursor-help">
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
            </TooltipTrigger>
            <TooltipContent>
              <p>Total time spent typing this chapter</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Card className="p-6 mb-6 relative">
        <div 
          ref={containerRef}
          onClick={handleContainerClick}
          className="relative min-h-[200px] font-serif text-lg leading-relaxed cursor-text"
          data-testid="typing-container"
          role="application"
          aria-label="Chapter typing practice area"
        >
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
          
          <div className="relative z-10 whitespace-pre-wrap pointer-events-none select-none">
            {renderText()}
          </div>
          
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
          <div className="mt-4 flex gap-3 justify-center flex-wrap">
            {chapterNum < displayBook.totalChapters && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={goToNextChapter}
                      size="lg"
                      className="gap-2"
                      data-testid="button-next-chapter-complete"
                    >
                      Next Chapter
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Continue to Chapter {chapterNum + 1}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={resetTestState}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                    data-testid="button-retry"
                  >
                    Retry Chapter
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Practice this chapter again to improve your score</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {pendingResult && saveTestMutation.isError && (
              <TooltipProvider>
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
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Retry Save
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Try saving your results again</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </Card>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="p-4 bg-muted/50 cursor-help" role="complementary" aria-label="Keyboard shortcuts">
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
          </TooltipTrigger>
          <TooltipContent>
            <p>Use these shortcuts while typing for quick navigation</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

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
              
              {saveTestMutation.isError && (
                <div className="p-3 bg-destructive/10 rounded-lg text-center">
                  <p className="text-sm text-destructive mb-2">Failed to save your progress</p>
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
              
              {lastResultSnapshot && (
                <div className="flex justify-center mb-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setShareDialogOpen(true)}
                        variant="outline"
                        className="gap-2"
                        data-testid="button-share-chapter-results"
                      >
                        <Share2 className="w-4 h-4" />
                        Share Certificate
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Share your chapter typing achievement with certificate</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
              
              <div className="flex gap-3">
                {chapterNum < displayBook.totalChapters && (
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

      {/* Share Dialog with Certificate */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share Your Chapter Result
            </DialogTitle>
            <DialogDescription>
              Share your chapter typing achievement with others!
            </DialogDescription>
          </DialogHeader>
          
          {lastResultSnapshot && (
            <Tabs defaultValue="certificate" className="w-full">
              <TabsList className="grid w-full grid-cols-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="certificate" className="gap-2" data-testid="tab-chapter-certificate">
                      <Award className="w-4 h-4" />
                      Certificate
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Professional 1200×675 certificate with verification ID</p>
                  </TooltipContent>
                </Tooltip>
              </TabsList>
              
              <TabsContent value="certificate" className="space-y-4">
                <div className="text-center space-y-2 mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30 mb-2">
                    <Award className="w-8 h-8 text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-bold">Share Your Certificate</h3>
                  <p className="text-sm text-muted-foreground">
                    Show off your official Chapter Typing Certificate for "{lastResultSnapshot.bookTitle}"!
                  </p>
                </div>

                {/* Certificate Stats Preview */}
                <div className="p-4 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-purple-500/10 rounded-xl border border-yellow-500/20">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Typing Speed</p>
                      <p className="text-2xl font-bold text-primary">{lastResultSnapshot.wpm} WPM</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                      <p className="text-2xl font-bold text-green-400">{lastResultSnapshot.accuracy}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Performance</p>
                      <p className="text-sm font-bold text-yellow-400">{getTypingPerformanceRating(lastResultSnapshot.wpm, lastResultSnapshot.accuracy).badge}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Chapter</p>
                      <p className="text-sm font-bold">{lastResultSnapshot.chapterTitle || `Chapter ${lastResultSnapshot.chapter}`}</p>
                    </div>
                  </div>
                </div>

                {/* Hidden pre-rendered certificate for sharing */}
                <div className="absolute -z-50 w-0 h-0 overflow-hidden opacity-0 pointer-events-none" aria-hidden="true">
                  <BookCertificate
                    wpm={lastResultSnapshot.wpm}
                    accuracy={lastResultSnapshot.accuracy}
                    consistency={lastResultSnapshot.consistency}
                    duration={lastResultSnapshot.duration}
                    bookTitle={lastResultSnapshot.bookTitle}
                    author={lastResultSnapshot.author}
                    chapter={lastResultSnapshot.chapter}
                    chapterTitle={lastResultSnapshot.chapterTitle}
                    paragraphsCompleted={lastResultSnapshot.paragraphsCompleted}
                    wordsTyped={lastResultSnapshot.wordsTyped}
                    username={user?.username}
                  />
                </div>

                {/* View & Share Certificate Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowCertificate(true)}
                    className="py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
                  >
                    <Award className="w-5 h-5" />
                    View Certificate
                  </button>
                  <button
                    onClick={async () => {
                      const certCanvas = document.querySelector('[data-testid="certificate-canvas"]') as HTMLCanvasElement;
                      if (!certCanvas) {
                        toast({ title: "Certificate not ready", description: "Please try again.", variant: "destructive" });
                        return;
                      }
                      try {
                        const blob = await new Promise<Blob>((resolve, reject) => {
                          certCanvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Failed")), "image/png");
                        });
                        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                        setCertificateImageCopied(true);
                        setTimeout(() => setCertificateImageCopied(false), 2000);
                        toast({ title: "Certificate Copied!", description: "Paste directly into Twitter, Discord, or LinkedIn!" });
                      } catch {
                        toast({ title: "Copy Failed", description: "Please download instead.", variant: "destructive" });
                      }
                    }}
                    className="py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-green-500/25"
                  >
                    {certificateImageCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {certificateImageCopied ? "Copied!" : "Copy Image"}
                  </button>
                </div>

                {/* Share Certificate with Image Button */}
                {'share' in navigator && (
                  <button
                    onClick={async () => {
                      const certCanvas = document.querySelector('[data-testid="certificate-canvas"]') as HTMLCanvasElement;
                      if (!certCanvas) {
                        toast({ title: "Certificate not ready", description: "Please try again.", variant: "destructive" });
                        return;
                      }
                      setIsSharingCertificate(true);
                      try {
                        const blob = await new Promise<Blob>((resolve, reject) => {
                          certCanvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Failed")), "image/png");
                        });
                        const file = new File([blob], `TypeMasterAI_Chapter_Certificate_${lastResultSnapshot.wpm}WPM.png`, { type: "image/png" });
                        if (navigator.canShare?.({ files: [file] })) {
                          const rating = getTypingPerformanceRating(lastResultSnapshot.wpm, lastResultSnapshot.accuracy);
                          await navigator.share({
                            title: `TypeMasterAI Chapter Certificate - ${lastResultSnapshot.wpm} WPM`,
                            text: `🎓 I earned a ${rating.badge} Certificate completing "${lastResultSnapshot.chapterTitle || `Chapter ${lastResultSnapshot.chapter}`}" from "${lastResultSnapshot.bookTitle}"!\n\n⚡ ${lastResultSnapshot.wpm} WPM | ✨ ${lastResultSnapshot.accuracy}% Accuracy\n📚 ${lastResultSnapshot.paragraphsCompleted} paragraphs\n🏆 ${rating.title}\n\n🔗 typemasterai.com/book-mode`,
                            files: [file],
                          });
                          toast({ title: "Certificate Shared!", description: "Your achievement is on its way!" });
                        }
                      } catch (error: any) {
                        if (error.name !== 'AbortError') {
                          toast({ title: "Share failed", description: "Please try Copy Image instead.", variant: "destructive" });
                        }
                      } finally {
                        setIsSharingCertificate(false);
                      }
                    }}
                    disabled={isSharingCertificate}
                    className="w-full py-4 bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Share2 className="w-5 h-5" />
                    {isSharingCertificate ? "Preparing..." : "Share Certificate with Image"}
                  </button>
                )}

                {/* Certificate Share Message Preview */}
                <div className="relative">
                  <div className="absolute -top-2 left-3 px-2 bg-background text-xs font-medium text-muted-foreground">
                    Certificate Share Message
                  </div>
                  <div className="p-4 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-xl border border-yellow-500/20 text-sm leading-relaxed">
                    <div className="space-y-2">
                      <p className="text-base font-medium">
                        🎓 <span className="text-yellow-400 font-bold">CERTIFIED: {lastResultSnapshot.wpm} WPM Chapter Typing!</span>
                      </p>
                      <p className="text-muted-foreground">
                        📚 Book: <span className="text-foreground font-semibold">{lastResultSnapshot.bookTitle}</span>
                      </p>
                      <p className="text-muted-foreground">
                        📖 Chapter: <span className="text-foreground font-semibold">{lastResultSnapshot.chapterTitle || `Chapter ${lastResultSnapshot.chapter}`}</span>
                      </p>
                      <p className="text-muted-foreground">
                        ⚡ Speed: <span className="text-foreground font-semibold">{lastResultSnapshot.wpm} WPM</span>
                      </p>
                      <p className="text-muted-foreground">
                        ✨ Accuracy: <span className="text-foreground font-semibold">{lastResultSnapshot.accuracy}%</span>
                      </p>
                      <p className="text-muted-foreground">
                        🏆 Level: <span className="text-yellow-400 font-semibold">{getTypingPerformanceRating(lastResultSnapshot.wpm, lastResultSnapshot.accuracy).title}</span>
                      </p>
                      <p className="text-primary/80 text-xs mt-3 font-medium">
                        Official chapter typing certificate earned! 📖
                      </p>
                      <p className="text-xs text-primary mt-2 font-medium">
                        🔗 https://typemasterai.com/book-mode
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const rating = getTypingPerformanceRating(lastResultSnapshot.wpm, lastResultSnapshot.accuracy);
                      const text = `🎓 Just earned my TypeMasterAI Chapter Typing Certificate! ${lastResultSnapshot.wpm} WPM with ${lastResultSnapshot.accuracy}% accuracy 📖

📚 "${lastResultSnapshot.bookTitle}" - ${lastResultSnapshot.chapterTitle || `Chapter ${lastResultSnapshot.chapter}`}
🏆 ${rating.title}

🔗 https://typemasterai.com/book-mode

#TypeMasterAI #BookTyping #Reading`;
                      navigator.clipboard.writeText(text);
                      toast({ title: "Certificate Message Copied!", description: "Paste into your social media post" });
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                {/* Certificate Social Share Buttons */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-center text-muted-foreground uppercase tracking-wide">
                    Share Certificate On
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        const text = encodeURIComponent(`🎓 Just earned my TypeMasterAI Chapter Typing Certificate! ${lastResultSnapshot.wpm} WPM reading "${lastResultSnapshot.bookTitle}" 📖

#TypeMasterAI #BookTyping`);
                        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent('https://typemasterai.com/book-mode')}`, '_blank', 'width=600,height=400');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all"
                    >
                      <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                      <span className="text-xs font-medium">X (Twitter)</span>
                    </button>
                    <button
                      onClick={() => {
                        const text = encodeURIComponent(`🎓 I just earned my official TypeMasterAI Chapter Typing Certificate!

Achieved ${lastResultSnapshot.wpm} WPM with ${lastResultSnapshot.accuracy}% accuracy reading "${lastResultSnapshot.bookTitle}"! 📖`);
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://typemasterai.com/book-mode')}&quote=${text}`, '_blank', 'width=600,height=400');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 transition-all"
                    >
                      <Facebook className="w-4 h-4 text-[#1877F2]" />
                      <span className="text-xs font-medium">Facebook</span>
                    </button>
                    <button
                      onClick={() => {
                        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://typemasterai.com/book-mode')}`, '_blank', 'width=600,height=400');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/20 transition-all"
                    >
                      <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                      <span className="text-xs font-medium">LinkedIn</span>
                    </button>
                    <button
                      onClick={() => {
                        const rating = getTypingPerformanceRating(lastResultSnapshot.wpm, lastResultSnapshot.accuracy);
                        const waText = `*TypeMasterAI Chapter Certificate*\n\nBook: ${lastResultSnapshot.bookTitle}\nChapter: ${lastResultSnapshot.chapterTitle || `Chapter ${lastResultSnapshot.chapter}`}\nSpeed: *${lastResultSnapshot.wpm} WPM*\nAccuracy: *${lastResultSnapshot.accuracy}%*\nLevel: ${rating.title}\n\nGet yours: https://typemasterai.com/book-mode`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank', 'width=600,height=400');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all"
                    >
                      <MessageCircle className="w-4 h-4 text-[#25D366]" />
                      <span className="text-xs font-medium">WhatsApp</span>
                    </button>
                    <button
                      onClick={() => {
                        const rating = getTypingPerformanceRating(lastResultSnapshot.wpm, lastResultSnapshot.accuracy);
                        const text = `🎓 CERTIFIED!\n\n📚 "${lastResultSnapshot.bookTitle}"\n📖 ${lastResultSnapshot.chapterTitle || `Chapter ${lastResultSnapshot.chapter}`}\n⚡ ${lastResultSnapshot.wpm} WPM | ✨ ${lastResultSnapshot.accuracy}%\n🏆 ${rating.title}`;
                        window.open(`https://t.me/share/url?url=${encodeURIComponent('https://typemasterai.com/book-mode')}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-all"
                    >
                      <Send className="w-4 h-4 text-[#0088cc]" />
                      <span className="text-xs font-medium">Telegram</span>
                    </button>
                    <button
                      onClick={() => {
                        const rating = getTypingPerformanceRating(lastResultSnapshot.wpm, lastResultSnapshot.accuracy);
                        const subject = encodeURIComponent(`🎓 TypeMasterAI Chapter Certificate - ${lastResultSnapshot.wpm} WPM`);
                        const body = encodeURIComponent(`Hello!\n\nI earned a TypeMasterAI Chapter Typing Certificate!\n\n📚 Book: ${lastResultSnapshot.bookTitle}\n📖 Chapter: ${lastResultSnapshot.chapterTitle || `Chapter ${lastResultSnapshot.chapter}`}\n⚡ Speed: ${lastResultSnapshot.wpm} WPM\n✨ Accuracy: ${lastResultSnapshot.accuracy}%\n🏆 Level: ${rating.title}\n\n👉 Try it: https://typemasterai.com/book-mode`);
                        window.open(`mailto:?subject=${subject}&body=${body}`);
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-500/10 hover:bg-gray-500/25 border border-gray-500/20 transition-all"
                    >
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-medium">Email</span>
                    </button>
                  </div>
                </div>

                {/* Certificate Sharing Tips */}
                <div className="space-y-2">
                  <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                    <p className="text-xs text-center text-muted-foreground">
                      📱 <span className="font-medium text-foreground">Mobile:</span> Use "Share Certificate with Image" to attach the certificate directly!
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                    <p className="text-xs text-center text-muted-foreground">
                      💻 <span className="font-medium text-foreground">Desktop:</span> Use "Copy Image" then paste directly into Twitter, LinkedIn, Discord, or any social media!
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* View Certificate Dialog */}
              {showCertificate && user && lastResultSnapshot && (
                <Dialog open={showCertificate} onOpenChange={setShowCertificate}>
                  <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-400" />
                        Your Chapter Typing Certificate
                      </DialogTitle>
                    </DialogHeader>
                    <BookCertificate
                      wpm={lastResultSnapshot.wpm}
                      accuracy={lastResultSnapshot.accuracy}
                      consistency={lastResultSnapshot.consistency}
                      duration={lastResultSnapshot.duration}
                      bookTitle={lastResultSnapshot.bookTitle}
                      author={lastResultSnapshot.author}
                      chapter={lastResultSnapshot.chapter}
                      chapterTitle={lastResultSnapshot.chapterTitle}
                      paragraphsCompleted={lastResultSnapshot.paragraphsCompleted}
                      wordsTyped={lastResultSnapshot.wordsTyped}
                      username={user?.username}
                      minimal={true}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
