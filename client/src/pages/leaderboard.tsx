import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Clock, Target, ChevronLeft, ChevronRight, ShieldCheck, User, AlertCircle, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";

type Timeframe = "all" | "daily" | "weekly" | "monthly";

function LeaderboardContent() {
  const [timeframe, setTimeframe] = useState<Timeframe>("all");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["leaderboard", timeframe, offset, limit],
    queryFn: async () => {
      const response = await fetch(`/api/leaderboard?limit=${limit}&offset=${offset}&timeframe=${timeframe}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch leaderboard");
      }
      return response.json();
    },
    placeholderData: keepPreviousData,
    staleTime: 30000,
    retry: 2,
  });

  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) return null;
      return response.json();
    },
    retry: false,
  });

  const { data: aroundMeData } = useQuery({
    queryKey: ["leaderboard-around-me", timeframe],
    queryFn: async () => {
      const response = await fetch(`/api/leaderboard/around-me?range=3&timeframe=${timeframe}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userData?.user,
  });

  const entries = data?.entries || [];
  const pagination = data?.pagination || { total: 0, hasMore: false };
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(pagination.total / limit);

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value as Timeframe);
    setOffset(0);
  };

  const handlePrevPage = () => {
    setOffset(Math.max(0, offset - limit));
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      setOffset(offset + limit);
    }
  };

  const formatTestMode = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
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

  return (
    <TooltipProvider>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold">Global Leaderboard</h1>
          <p className="text-muted-foreground">Top typists worldwide</p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Tabs value={timeframe} onValueChange={handleTimeframeChange} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-4 w-full sm:w-auto" data-testid="timeframe-tabs">
              <TabsTrigger value="all" data-testid="tab-all">All Time</TabsTrigger>
              <TabsTrigger value="daily" data-testid="tab-daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly" data-testid="tab-weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>

          {userData?.user && aroundMeData?.userRank && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Your rank: <strong className="text-foreground">#{aroundMeData.userRank}</strong></span>
            </div>
          )}
        </div>

        {userData?.user && aroundMeData?.entries?.length > 0 && (
          <Card className="border-primary/30 bg-primary/5 mb-6">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Your Position
              </div>
              <div className="space-y-2">
                {aroundMeData.entries.map((entry: any) => (
                  <div 
                    key={entry.rank} 
                    className={`flex items-center justify-between p-2 rounded ${entry.userId === userData.user.id ? 'bg-primary/20 font-medium' : 'bg-background/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm w-8">#{entry.rank}</span>
                      <span>{entry.username}</span>
                      {entry.isVerified && (
                        <ShieldCheck className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <span className="font-mono text-primary">{entry.wpm} WPM</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <p className="text-lg font-medium text-destructive mb-2">Failed to load leaderboard</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {error instanceof Error ? error.message : "An unexpected error occurred"}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  disabled={isFetching}
                  data-testid="retry-button"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                  Try Again
                </Button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No test results for {getTimeframeLabel(timeframe).toLowerCase()}.</p>
                <p className="text-sm mt-2">Be the first to set a record!</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border/50">
                  <div className="grid grid-cols-12 gap-4 p-4 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-4">User</div>
                    <div className="col-span-2 text-center">WPM</div>
                    <div className="col-span-2 text-center">Accuracy</div>
                    <div className="col-span-2 text-center">Test Mode</div>
                    <div className="col-span-1 text-center">Tests</div>
                  </div>

                  {entries.map((entry: any) => {
                    const rank = parseInt(entry.rank);
                    const isCurrentUser = userData?.user?.id === entry.userId;
                    return (
                      <div 
                        key={entry.userId + entry.createdAt} 
                        className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors ${isCurrentUser ? 'bg-primary/10' : ''}`}
                      >
                        <div className="col-span-1 flex justify-center">
                          {rank === 1 && <Medal className="w-5 h-5 text-yellow-500" data-testid={`medal-rank-${rank}`} />}
                          {rank === 2 && <Medal className="w-5 h-5 text-gray-400" data-testid={`medal-rank-${rank}`} />}
                          {rank === 3 && <Medal className="w-5 h-5 text-amber-600" data-testid={`medal-rank-${rank}`} />}
                          {rank > 3 && <span className="font-mono text-muted-foreground" data-testid={`rank-${rank}`}>{rank}</span>}
                        </div>
                        <div className="col-span-4 flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className={entry.avatarColor || "bg-primary/20"} style={{ color: "white" }}>
                              {entry.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium" data-testid={`username-${entry.username}`}>{entry.username}</span>
                              {entry.isVerified && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <ShieldCheck className="w-4 h-4 text-green-500 cursor-help" data-testid={`verified-${entry.userId}`} />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Verified score - passed anti-cheat challenge</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{entry.totalTests} test{entry.totalTests !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center">
                          <div className="font-mono font-bold text-primary text-lg" data-testid={`wpm-${entry.userId}`}>
                            {entry.wpm}
                          </div>
                        </div>
                        <div className="col-span-2 text-center">
                          <div className="font-mono text-muted-foreground" data-testid={`accuracy-${entry.userId}`}>
                            {entry.accuracy.toFixed(1)}%
                          </div>
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
                                {entry.totalTests}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Total tests completed</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between p-4 border-t border-border/50">
                  <div className="text-sm text-muted-foreground">
                    Showing {offset + 1} - {Math.min(offset + entries.length, pagination.total)} of {pagination.total} results
                    {isFetching && <Loader2 className="inline-block ml-2 w-4 h-4 animate-spin" />}
                  </div>
                  <div className="flex items-center gap-2">
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
                    <span className="text-sm text-muted-foreground px-2">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!pagination.hasMore || isFetching}
                      data-testid="next-page"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
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
