import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Loader2, RefreshCw, AlertCircle, WifiOff, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useCallback, useEffect } from "react";
import type { Book } from "@shared/schema";

const CACHE_KEY = 'book_library_cache';
const CACHE_TTL = 5 * 60 * 1000;

interface CachedBooks {
  books: Book[];
  timestamp: number;
}

function getBookCacheFromStorage(): Book[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedBooks = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    
    if (age < CACHE_TTL && parsed.books.length > 0) {
      return parsed.books;
    }
    
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function setBookCacheToStorage(books: Book[]): void {
  try {
    if (books.length > 0) {
      const cached: CachedBooks = {
        books,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    }
  } catch {
  }
}

async function fetchBooks(): Promise<Book[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const res = await fetch('/api/books', {
      signal: controller.signal,
      credentials: 'include',
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      if (res.status === 404) {
        throw new Error('BOOKS_NOT_FOUND');
      }
      if (res.status >= 500) {
        throw new Error('SERVER_ERROR');
      }
      throw new Error(errorText || `HTTP_${res.status}`);
    }
    
    const books = await res.json() as Book[];
    
    setBookCacheToStorage(books);
    
    return books;
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

function BookCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <BookCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
  isRetrying: boolean;
  cachedBooks: Book[] | null;
  onUseCached: () => void;
}

function ErrorState({ error, onRetry, isRetrying, cachedBooks, onUseCached }: ErrorStateProps) {
  const errorType = error.message;
  
  let icon = <AlertCircle className="w-16 h-16 text-destructive" />;
  let title = "Unable to Load Books";
  let description = "Something went wrong while loading the book library.";
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
    case 'BOOKS_NOT_FOUND':
      title = "No Books Found";
      description = "The book library is currently empty. Please check back later.";
      canRetry = false;
      break;
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
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
            data-testid="button-retry-books"
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
        {cachedBooks && cachedBooks.length > 0 && (
          <Button
            variant="outline"
            onClick={onUseCached}
            data-testid="button-use-cached"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Use Offline Data ({cachedBooks.length} books)
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onRefresh, isRefreshing }: { onRefresh: () => void; isRefreshing: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
      <BookOpen className="w-16 h-16 text-muted-foreground" />
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold mb-2">No Books Available</h2>
        <p className="text-muted-foreground">
          The book library is currently being populated. Books from classic literature will appear here shortly.
        </p>
      </div>
      <Button
        onClick={onRefresh}
        disabled={isRefreshing}
        variant="outline"
        data-testid="button-refresh-library"
      >
        {isRefreshing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Check for Books
          </>
        )}
      </Button>
    </div>
  );
}

export default function BookLibrary() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [useCachedData, setUseCachedData] = useState(false);
  const [cachedBooks, setCachedBooks] = useState<Book[] | null>(null);
  
  useEffect(() => {
    const cached = getBookCacheFromStorage();
    setCachedBooks(cached);
  }, []);
  
  const { data: books = [], isLoading, isError, error, isFetching, refetch } = useQuery<Book[], Error>({
    queryKey: ['books'],
    queryFn: fetchBooks,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.message === 'BOOKS_NOT_FOUND') return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
  
  const displayBooks = useCachedData && cachedBooks ? cachedBooks : books;
  
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return displayBooks;
    
    const query = searchQuery.toLowerCase().trim();
    return displayBooks.filter(book => 
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query) ||
      book.topic.toLowerCase().includes(query)
    );
  }, [displayBooks, searchQuery]);
  
  const handleRetry = useCallback(() => {
    setUseCachedData(false);
    refetch();
  }, [refetch]);
  
  const handleUseCached = useCallback(() => {
    if (cachedBooks && cachedBooks.length > 0) {
      queryClient.setQueryData(['books'], cachedBooks);
      setUseCachedData(true);
    }
  }, [cachedBooks, queryClient]);
  
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['books'] });
  }, [queryClient]);
  
  if (isLoading && !useCachedData) {
    return <LoadingState />;
  }
  
  if (isError && !useCachedData) {
    return (
      <ErrorState
        error={error}
        onRetry={handleRetry}
        isRetrying={isFetching}
        cachedBooks={cachedBooks}
        onUseCached={handleUseCached}
      />
    );
  }
  
  if (displayBooks.length === 0) {
    return <EmptyState onRefresh={handleRefresh} isRefreshing={isFetching} />;
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Book Library</h1>
            <p className="text-muted-foreground">
              Choose a book and start typing chapter by chapter
              {useCachedData && (
                <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-500">
                  (Offline mode)
                </span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="self-start md:self-center"
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title, author, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-books"
          />
        </div>
      </div>

      {filteredBooks.length === 0 && searchQuery ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Search className="w-12 h-12 text-muted-foreground" />
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-1">No books found</h3>
            <p className="text-muted-foreground">
              Try a different search term or{' '}
              <button
                onClick={() => setSearchQuery('')}
                className="text-primary underline hover:no-underline"
                data-testid="button-clear-search"
              >
                clear the search
              </button>
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredBooks.length} of {displayBooks.length} books
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <Card
                key={book.id}
                className="group cursor-pointer hover:shadow-lg transition-all hover:scale-105 focus-within:ring-2 focus-within:ring-primary"
                onClick={() => setLocation(`/books/${book.slug}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setLocation(`/books/${book.slug}`);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Open ${book.title} by ${book.author}`}
                data-testid={`book-card-${book.id}`}
              >
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate" data-testid={`book-title-${book.id}`}>
                        {book.title}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate" data-testid={`book-author-${book.id}`}>
                        {book.author}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{book.totalChapters} chapters</span>
                    <span className="text-muted-foreground">{book.totalParagraphs} paragraphs</span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      book.difficulty === 'easy' ? 'bg-green-500/20 text-green-500' :
                      book.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-red-500/20 text-red-500'
                    }`} data-testid={`book-difficulty-${book.id}`}>
                      {book.difficulty}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary capitalize" data-testid={`book-topic-${book.id}`}>
                      {book.topic}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
