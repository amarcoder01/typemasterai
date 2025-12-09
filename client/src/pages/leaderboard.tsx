import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Clock, Target, ChevronLeft, ChevronRight, ShieldCheck, User, AlertCircle, RefreshCw, Info, Wifi, WifiOff, Ban, Globe } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";

type Timeframe = "all" | "daily" | "weekly" | "monthly";

interface LeaderboardEntry {
  userId: string;
  username: string;
  wpm: number;
  accuracy: number;
  mode: number;
  totalTests: number;
  rank: number | string;
  avatarColor?: string;
  isVerified?: boolean;
  createdAt?: string;
}

interface ErrorState {
  type: "network" | "rate_limit" | "auth" | "server" | "timeout" | "unknown";
  message: string;
  retryable: boolean;
}

const TIMEFRAME_TOOLTIPS: Record<Timeframe, string> = {
  all: "Rankings based on all-time best scores since the beginning",
  daily: "Rankings based on best scores from today (resets at midnight)",
  weekly: "Rankings based on best scores from this week (resets Sunday)",
  monthly: "Rankings based on best scores from this month (resets on the 1st)",
};

const MEDAL_TOOLTIPS: Record<number, { label: string; description: string }> = {
  1: { label: "Gold Medal", description: "1st Place - Top performer!" },
  2: { label: "Silver Medal", description: "2nd Place - Outstanding!" },
  3: { label: "Bronze Medal", description: "3rd Place - Excellent work!" },
};

function classifyError(error: unknown, response?: Response): ErrorState {
  if (!navigator.onLine) {
    return {
      type: "network",
      message: "You're offline. Please check your internet connection.",
      retryable: true,
    };
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return {
        type: "timeout",
        message: "Request timed out. Please try again.",
        retryable: true,
      };
    }
    if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
      return {
        type: "network",
        message: "Network error. Please check your connection and try again.",
        retryable: true,
      };
    }
  }

  if (response) {
    if (response.status === 429) {
      return {
        type: "rate_limit",
        message: "Too many requests. Please wait a moment before trying again.",
        retryable: true,
      };
    }
    if (response.status === 401 || response.status === 419) {
      return {
        type: "auth",
        message: "Session expired. Please refresh the page or log in again.",
        retryable: false,
      };
    }
    if (response.status >= 500) {
      return {
        type: "server",
        message: "Server error. Our team has been notified. Please try again later.",
        retryable: true,
      };
    }
  }

  return {
    type: "unknown",
    message: error instanceof Error ? error.message : "An unexpected error occurred.",
    retryable: true,
  };
}

function getErrorIcon(type: ErrorState["type"]) {
  switch (type) {
    case "network":
      return <WifiOff className="w-12 h-12 text-orange-500 mb-4" />;
    case "rate_limit":
      return <Ban className="w-12 h-12 text-yellow-500 mb-4" />;
    case "timeout":
      return <Clock className="w-12 h-12 text-blue-500 mb-4" />;
    default:
      return <AlertCircle className="w-12 h-12 text-destructive mb-4" />;
  }
}

function safeNumber(value: unknown, defaultValue: number = 0): number {
  if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
    return value;
  }
  const parsed = parseFloat(String(value));
  return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
}

function safeString(value: unknown, defaultValue: string = "Unknown"): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return defaultValue;
}

class LeaderboardError extends Error {
  constructor(
    message: string,
    public readonly errorType: ErrorState["type"],
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "LeaderboardError";
  }
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  zh: "Chinese",
  hi: "Hindi",
  ru: "Russian",
  ar: "Arabic",
  ko: "Korean",
  mr: "Marathi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  vi: "Vietnamese",
  tr: "Turkish",
  pl: "Polish",
  nl: "Dutch",
  sv: "Swedish",
  th: "Thai",
  id: "Indonesian",
};

function LeaderboardContent() {
  const [timeframe, setTimeframe] = useState<Timeframe>("all");
  const [offset, setOffset] = useState(0);
  const [language, setLanguage] = useState<string>("en");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const limit = 15;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["leaderboard", timeframe, offset, limit, language],
    queryFn: async ({ signal }) => {
      const timeoutSignal = AbortSignal.timeout(15000);
      const combinedController = new AbortController();
      
      const abortHandler = () => combinedController.abort();
      signal.addEventListener("abort", abortHandler);
      timeoutSignal.addEventListener("abort", abortHandler);
      
      try {
        const response = await fetch(
          `/api/leaderboard?limit=${limit}&offset=${offset}&timeframe=${timeframe}&language=${language}`,
          { signal: combinedController.signal }
        );
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const classified = classifyError(new Error(errorData.message || "Request failed"), response);
          throw new LeaderboardError(classified.message, classified.type, classified.retryable);
        }
        
        return response.json();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          if (timeoutSignal.aborted) {
            throw new LeaderboardError("Request timed out. Please try again.", "timeout", true);
          }
          throw err;
        }
        if (err instanceof LeaderboardError) throw err;
        const classified = classifyError(err);
        throw new LeaderboardError(classified.message, classified.type, classified.retryable);
      } finally {
        signal.removeEventListener("abort", abortHandler);
        timeoutSignal.removeEventListener("abort", abortHandler);
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 30000,
    retry: (failureCount, err) => {
      if (err instanceof Error && err.name === "AbortError") return false;
      if (err instanceof LeaderboardError && err.errorType === "auth") return false;
      if (err instanceof LeaderboardError && err.errorType === "timeout") return false;
      if (err instanceof LeaderboardError && !err.retryable) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  useEffect(() => {
    if (data?.pagination && offset >= data.pagination.total && offset > 0 && data.pagination.total > 0) {
      const newOffset = Math.max(0, Math.floor((data.pagination.total - 1) / limit) * limit);
      if (newOffset !== offset) {
        setOffset(newOffset);
      }
    }
  }, [data?.pagination, offset, limit]);

  const errorState: ErrorState | null = error instanceof LeaderboardError 
    ? { type: error.errorType, message: error.message, retryable: error.retryable }
    : error instanceof Error 
      ? classifyError(error)
      : null;

  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) return null;
      return response.json();
    },
    retry: false,
    staleTime: 60000,
  });

  const { data: aroundMeData, isLoading: aroundMeLoading } = useQuery({
    queryKey: ["leaderboard-around-me", timeframe, language],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/leaderboard/around-me?range=3&timeframe=${timeframe}&language=${language}`);
        if (!response.ok) return null;
        return response.json();
      } catch {
        return null;
      }
    },
    enabled: !!userData?.user,
    staleTime: 30000,
    retry: 1,
  });

  const entries: LeaderboardEntry[] = data?.entries || [];
  const pagination = data?.pagination || { total: 0, hasMore: false };
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(pagination.total / limit));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value as Timeframe);
    setOffset(0);
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    setOffset(0);
  };

  const handlePrevPage = () => {
    setOffset(Math.max(0, offset - limit));
  };

  const handleNextPage = () => {
    if (pagination.hasMore && offset + limit < pagination.total) {
      setOffset(offset + limit);
    }
  };

  const formatTestMode = (seconds: number) => {
    const safeSeconds = safeNumber(seconds, 60);
    if (safeSeconds < 60) return `${safeSeconds}s`;
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const getTimeframeLabel = (tf: Timeframe) => {
    switch (tf) {
      case "daily": return "Today";
      case "weekly": return "This Week";
      case "monthly": return "This Month";
      default: return "All Time";
    }
  };

  const getEmptyStateMessage = (tf: Timeframe) => {
    switch (tf) {
      case "daily":
        return { title: "No tests completed today", subtitle: "Be the first to set a record today!" };
      case "weekly":
        return { title: "No tests completed this week", subtitle: "Start the week strong with a new record!" };
      case "monthly":
        return { title: "No tests completed this month", subtitle: "Be the first to make the monthly leaderboard!" };
      default:
        return { title: "No test results yet", subtitle: "Complete a typing test to appear on the leaderboard!" };
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-5xl mx-auto px-4 sm:px-0">
        {!isOnline && (
          <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-2 text-orange-500">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm">You're offline. Some features may not work.</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-2.5 sm:p-3 rounded-full bg-primary/10 text-primary cursor-help">
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium">Global Leaderboard</p>
              <p className="text-xs text-muted-foreground mt-1">
                Compare your typing speed with players worldwide. Rankings are based on your best WPM score.
              </p>
            </TooltipContent>
          </Tooltip>
          <h1 className="text-2xl sm:text-3xl font-bold">Global Leaderboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Top typists worldwide</p>
        </div>

        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Tabs value={timeframe} onValueChange={handleTimeframeChange} className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-4 w-full sm:w-auto" data-testid="timeframe-tabs">
                {(["all", "daily", "weekly", "monthly"] as Timeframe[]).map((tf) => (
                  <Tooltip key={tf}>
                    <TooltipTrigger asChild>
                      <TabsTrigger value={tf} data-testid={`tab-${tf}`}>
                        {tf === "all" ? "All Time" : tf.charAt(0).toUpperCase() + tf.slice(1)}
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{TIMEFRAME_TOOLTIPS[tf]}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TabsList>
            </Tabs>

            {userData?.user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-help">
                    <User className="w-4 h-4" />
                    {aroundMeLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : aroundMeData?.userRank && aroundMeData.userRank > 0 ? (
                      <span>Your rank: <strong className="text-foreground">#{aroundMeData.userRank}</strong></span>
                    ) : (
                      <span className="text-muted-foreground">Not ranked in {getTimeframeLabel(timeframe).toLowerCase()}</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your position in the {getTimeframeLabel(timeframe).toLowerCase()} leaderboard</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[180px]" data-testid="language-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                  <SelectItem key={code} value={code} data-testid={`language-option-${code}`}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">Filter by typing language</span>
          </div>
        </div>

        {userData?.user && aroundMeData?.entries?.length > 0 && aroundMeData.userRank > 0 && (
          <Card className="border-primary/30 bg-primary/5 mb-6">
            <CardContent className="p-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-sm font-medium text-primary mb-3 flex items-center gap-2 cursor-help">
                    <User className="w-4 h-4" />
                    Your Position
                    <Info className="w-3 h-3 opacity-50" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Shows players ranked near you for the {getTimeframeLabel(timeframe).toLowerCase()} period</p>
                </TooltipContent>
              </Tooltip>
              <div className="space-y-2">
                {aroundMeData.entries.map((entry: LeaderboardEntry) => (
                  <div 
                    key={`around-${entry.rank}-${entry.userId}`} 
                    className={`flex items-center justify-between p-2 rounded ${entry.userId === userData.user.id ? 'bg-primary/20 font-medium' : 'bg-background/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm w-8">#{safeNumber(entry.rank)}</span>
                      <span>{safeString(entry.username)}</span>
                      {entry.isVerified && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ShieldCheck className="w-4 h-4 text-green-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Verified score - passed anti-cheat challenge</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <span className="font-mono text-primary">{safeNumber(entry.wpm)} WPM</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0">
            {isError || errorState ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                {getErrorIcon(errorState?.type || "unknown")}
                <p className="text-lg font-medium text-foreground mb-2">
                  {errorState?.type === "network" ? "Connection Lost" :
                   errorState?.type === "rate_limit" ? "Slow Down" :
                   errorState?.type === "timeout" ? "Request Timed Out" :
                   "Failed to load leaderboard"}
                </p>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  {errorState?.message || (error instanceof Error ? error.message : "An unexpected error occurred")}
                </p>
                {(errorState?.retryable !== false) && (
                  <Button 
                    variant="outline" 
                    onClick={() => refetch()}
                    disabled={isFetching}
                    data-testid="retry-button"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                    Try Again
                  </Button>
                )}
                {errorState?.type === "auth" && (
                  <Button 
                    variant="default" 
                    onClick={() => window.location.reload()}
                    className="mt-2"
                  >
                    Refresh Page
                  </Button>
                )}
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">{getEmptyStateMessage(timeframe).title}</p>
                <p className="text-sm mt-2">{getEmptyStateMessage(timeframe).subtitle}</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border/50">
                  <div className="grid grid-cols-12 gap-4 p-4 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="col-span-1 text-center cursor-help">#</div>
                      </TooltipTrigger>
                      <TooltipContent><p>Rank position based on best WPM</p></TooltipContent>
                    </Tooltip>
                    <div className="col-span-4">User</div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="col-span-2 text-center cursor-help">WPM</div>
                      </TooltipTrigger>
                      <TooltipContent><p>Words Per Minute - typing speed</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="col-span-2 text-center cursor-help">Accuracy</div>
                      </TooltipTrigger>
                      <TooltipContent><p>Percentage of correctly typed characters</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="col-span-2 text-center cursor-help">Test Mode</div>
                      </TooltipTrigger>
                      <TooltipContent><p>Duration of the typing test</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="col-span-1 text-center cursor-help">Tests</div>
                      </TooltipTrigger>
                      <TooltipContent><p>Total number of tests completed</p></TooltipContent>
                    </Tooltip>
                  </div>

                  {entries.map((entry: LeaderboardEntry) => {
                    const rank = safeNumber(entry.rank, 999);
                    const isCurrentUser = userData?.user?.id === entry.userId;
                    const username = safeString(entry.username);
                    const wpm = safeNumber(entry.wpm);
                    const accuracy = safeNumber(entry.accuracy);
                    const totalTests = safeNumber(entry.totalTests, 1);
                    
                    return (
                      <div 
                        key={`${entry.userId}-${entry.createdAt || rank}`} 
                        className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors ${isCurrentUser ? 'bg-primary/10' : ''}`}
                      >
                        <div className="col-span-1 flex justify-center">
                          {rank <= 3 && MEDAL_TOOLTIPS[rank] ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help">
                                  <Medal 
                                    className={`w-5 h-5 ${
                                      rank === 1 ? 'text-yellow-500' : 
                                      rank === 2 ? 'text-gray-400' : 
                                      'text-amber-600'
                                    }`} 
                                    data-testid={`medal-rank-${rank}`} 
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">{MEDAL_TOOLTIPS[rank].label}</p>
                                <p className="text-xs text-muted-foreground">{MEDAL_TOOLTIPS[rank].description}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="font-mono text-muted-foreground" data-testid={`rank-${rank}`}>{rank}</span>
                          )}
                        </div>
                        <div className="col-span-4 flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback 
                              className={entry.avatarColor || "bg-primary/20"} 
                              style={{ color: "white" }}
                            >
                              {username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate max-w-[120px]" data-testid={`username-${username}`}>
                                {username}
                              </span>
                              {entry.isVerified && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <ShieldCheck className="w-4 h-4 text-green-500 cursor-help flex-shrink-0" data-testid={`verified-${entry.userId}`} />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Verified score - passed anti-cheat challenge</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{totalTests} test{totalTests !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="font-mono font-bold text-primary text-lg cursor-help" data-testid={`wpm-${entry.userId}`}>
                                {wpm}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{wpm} words per minute</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="col-span-2 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="font-mono text-muted-foreground cursor-help" data-testid={`accuracy-${entry.userId}`}>
                                {accuracy.toFixed(1)}%
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{accuracy.toFixed(2)}% typing accuracy</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="col-span-2 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="gap-1 cursor-help" data-testid={`mode-${entry.userId}`}>
                                <Clock className="w-3 h-3" />
                                {formatTestMode(entry.mode)}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Test duration: {formatTestMode(entry.mode)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="col-span-1 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="gap-1 cursor-help" data-testid={`total-tests-${entry.userId}`}>
                                <Target className="w-3 h-3" />
                                {totalTests}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{totalTests} total test{totalTests !== 1 ? 's' : ''} completed</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between p-4 border-t border-border/50">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm text-muted-foreground cursor-help">
                        Showing {Math.min(offset + 1, pagination.total)} - {Math.min(offset + entries.length, pagination.total)} of {pagination.total} results
                        {isFetching && <Loader2 className="inline-block ml-2 w-4 h-4 animate-spin" />}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{limit} entries per page</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrevPage}
                          disabled={offset === 0 || isFetching}
                          data-testid="prev-page"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{offset === 0 ? "You're on the first page" : `Go to page ${safeCurrentPage - 1}`}</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {safeCurrentPage} of {totalPages}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={!pagination.hasMore || offset + limit >= pagination.total || isFetching}
                          data-testid="next-page"
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{!pagination.hasMore || offset + limit >= pagination.total ? "You're on the last page" : `Go to page ${safeCurrentPage + 1}`}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

export default function Leaderboard() {
  return (
    <ErrorBoundary>
      <LeaderboardContent />
    </ErrorBoundary>
  );
}
