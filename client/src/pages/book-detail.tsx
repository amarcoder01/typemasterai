import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Loader2, ArrowLeft, FileText, RefreshCw, AlertCircle, WifiOff, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Book } from "@shared/schema";

interface Chapter {
  chapter: number;
  title: string | null;
  paragraphCount: number;
}

interface CachedBookData {
  book: Book;
  chapters: Chapter[];
  timestamp: number;
}

const CACHE_TTL = 10 * 60 * 1000;

function getBookDetailCache(slug: string): CachedBookData | null {
  try {
    const cached = localStorage.getItem(`book_detail_${slug}`);
    if (!cached) return null;
    
    const parsed: CachedBookData = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    if (age < CACHE_TTL) {
      return parsed;
    }
    
    localStorage.removeItem(`book_detail_${slug}`);
    return null;
  } catch {
    return null;
  }
}

function setBookDetailCache(slug: string, book: Book, chapters: Chapter[]): void {
  try {
    const cached: CachedBookData = {
      book,
      chapters,
      timestamp: Date.now(),
    };
    localStorage.setItem(`book_detail_${slug}`, JSON.stringify(cached));
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

async function fetchChapters(bookId: number): Promise<Chapter[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const res = await fetch(`/api/books/${bookId}/chapters`, {
      signal: controller.signal,
      credentials: 'include',
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('CHAPTERS_NOT_FOUND');
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

function ChapterSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-11 h-11 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="container py-8 max-w-4xl">
      <Skeleton className="h-9 w-36 mb-6" />
      
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <Skeleton className="w-20 h-20 rounded-lg" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <div className="flex gap-3">
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24" />
            </div>
          </div>
        </div>
      </div>

      <Skeleton className="h-8 w-32 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <ChapterSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
  isRetrying: boolean;
  onGoBack: () => void;
  cachedData: CachedBookData | null;
  onUseCached: () => void;
}

function ErrorState({ error, onRetry, isRetrying, onGoBack, cachedData, onUseCached }: ErrorStateProps) {
  const errorType = error.message;
  
  let icon = <AlertCircle className="w-16 h-16 text-destructive" />;
  let title = "Unable to Load Book";
  let description = "Something went wrong while loading the book details.";
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
    case 'CHAPTERS_NOT_FOUND':
      title = "Chapters Not Available";
      description = "The chapters for this book couldn't be loaded.";
      break;
  }
  
  return (
    <div className="container py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={onGoBack}
        className="mb-6"
        data-testid="back-to-library"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Library
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
              data-testid="button-retry-book"
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
              data-testid="button-use-cached-book"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Use Offline Data
            </Button>
          )}
          <Button variant="outline" onClick={onGoBack} data-testid="button-go-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BookDetail() {
  const [, params] = useRoute("/books/:slug");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const slug = params?.slug || '';
  
  const [useCachedData, setUseCachedData] = useState(false);
  const [cachedData, setCachedData] = useState<CachedBookData | null>(null);
  
  useEffect(() => {
    if (slug) {
      const cached = getBookDetailCache(slug);
      setCachedData(cached);
    }
  }, [slug]);

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
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  const { 
    data: chapters = [], 
    isLoading: chaptersLoading,
    isError: chaptersError,
    error: chaptersErrorData,
    isFetching: chaptersFetching,
    refetch: refetchChapters
  } = useQuery<Chapter[], Error>({
    queryKey: ['chapters', book?.id],
    queryFn: () => fetchChapters(book!.id),
    enabled: !!book && !useCachedData,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });
  
  useEffect(() => {
    if (book && chapters.length > 0 && slug && !useCachedData) {
      setBookDetailCache(slug, book, chapters);
    }
  }, [book, chapters, slug, useCachedData]);
  
  const displayBook = useCachedData && cachedData ? cachedData.book : book;
  const displayChapters = useCachedData && cachedData ? cachedData.chapters : chapters;
  
  const handleRetry = useCallback(() => {
    setUseCachedData(false);
    refetchBook();
    if (book) {
      refetchChapters();
    }
  }, [refetchBook, refetchChapters, book]);
  
  const handleUseCached = useCallback(() => {
    if (cachedData) {
      queryClient.setQueryData(['book', slug], cachedData.book);
      queryClient.setQueryData(['chapters', cachedData.book.id], cachedData.chapters);
      setUseCachedData(true);
    }
  }, [cachedData, queryClient, slug]);
  
  const handleGoBack = useCallback(() => {
    setLocation('/books');
  }, [setLocation]);

  const isLoading = bookLoading || (book && chaptersLoading);
  const hasError = (bookError || chaptersError) && !useCachedData;
  const error = bookErrorData || chaptersErrorData;
  const isFetching = bookFetching || chaptersFetching;

  if (isLoading && !useCachedData) {
    return <LoadingState />;
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
      />
    );
  }

  if (!displayBook) {
    return (
      <div className="container py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={handleGoBack}
          className="mb-6"
          data-testid="back-to-library"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Library
        </Button>
        
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <BookOpen className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Book Not Found</h2>
          <p className="text-muted-foreground text-center max-w-md">
            This book doesn't exist or may have been removed from the library.
          </p>
          <Button onClick={handleGoBack} data-testid="button-back-library">
            Return to Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={handleGoBack}
        className="mb-6"
        data-testid="back-to-library"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Library
      </Button>

      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-4 rounded-lg bg-primary/10">
            <BookOpen className="w-12 h-12 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2" data-testid="book-title">{displayBook.title}</h1>
                <p className="text-xl text-muted-foreground mb-4" data-testid="book-author">by {displayBook.author}</p>
              </div>
              {useCachedData && (
                <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-500">
                  Offline
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-sm px-3 py-1 rounded-full ${
                displayBook.difficulty === 'easy' ? 'bg-green-500/20 text-green-500' :
                displayBook.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                'bg-red-500/20 text-red-500'
              }`} data-testid="book-difficulty">
                {displayBook.difficulty}
              </span>
              <span className="text-sm px-3 py-1 rounded-full bg-primary/20 text-primary capitalize" data-testid="book-topic">
                {displayBook.topic}
              </span>
              <span className="text-sm text-muted-foreground">{displayBook.totalChapters} chapters</span>
              <span className="text-sm text-muted-foreground">{displayBook.totalParagraphs} paragraphs</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Chapters</h2>
          {!useCachedData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchChapters()}
              disabled={chaptersFetching}
              data-testid="button-refresh-chapters"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${chaptersFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
        
        {displayChapters.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Chapters Found</h3>
            <p className="text-muted-foreground">
              This book's chapters are still being processed.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refetchChapters()}
              disabled={chaptersFetching}
              data-testid="button-retry-chapters"
            >
              {chaptersFetching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Again
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayChapters.map((chapter) => (
              <Card
                key={`chapter-${displayBook.id}-${chapter.chapter}`}
                className="group cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] focus-within:ring-2 focus-within:ring-primary"
                onClick={() => setLocation(`/books/${slug}/chapter/${chapter.chapter}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setLocation(`/books/${slug}/chapter/${chapter.chapter}`);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Start typing Chapter ${chapter.chapter}${chapter.title ? `: ${chapter.title}` : ''}`}
                data-testid={`chapter-card-${chapter.chapter}`}
              >
                <div className="p-4 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold" data-testid={`chapter-title-${chapter.chapter}`}>
                      Chapter {chapter.chapter}
                      {chapter.title && `: ${chapter.title}`}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {chapter.paragraphCount} paragraph{chapter.paragraphCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="group-hover:bg-primary/10"
                    data-testid={`start-chapter-${chapter.chapter}`}
                  >
                    Start Typing
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
