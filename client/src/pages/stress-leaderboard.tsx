import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Trophy, Zap, Flame, Award, Info, Target, BarChart3, Timer, CheckCircle2, Medal, Crown, Star, HelpCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/error-boundary';

type Difficulty = 'all' | 'beginner' | 'intermediate' | 'expert' | 'nightmare' | 'impossible';

const DIFFICULTY_ICONS: Record<Exclude<Difficulty, 'all'>, string> = {
  beginner: '🔥',
  intermediate: '⚡',
  expert: '💀',
  nightmare: '☠️',
  impossible: '🌀',
};

const DIFFICULTY_COLORS: Record<Exclude<Difficulty, 'all'>, string> = {
  beginner: 'text-orange-500',
  intermediate: 'text-purple-500',
  expert: 'text-red-500',
  nightmare: 'text-red-900',
  impossible: 'text-purple-900',
};

const DIFFICULTY_DESCRIPTIONS: Record<Exclude<Difficulty, 'all'>, string> = {
  beginner: 'Gentle introduction with light effects - 30 seconds',
  intermediate: 'Screen inverts, zoom chaos, and sensory assault - 45 seconds',
  expert: 'Screen flips upside down, glitches, complete chaos - 60 seconds',
  nightmare: 'Text reverses, screen inverts/flips, reality collapses - 90 seconds',
  impossible: 'Text teleports, ALL effects active, reality ceases to exist - 120 seconds',
};

function StressLeaderboardContent() {
  const { user } = useAuth();
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('all');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data: leaderboardData, isLoading: leaderboardLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['stress-leaderboard', selectedDifficulty, offset, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (selectedDifficulty !== 'all') params.set('difficulty', selectedDifficulty);
      const res = await fetch(`/api/stress-test/leaderboard?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch leaderboard');
      }
      return res.json();
    },
    staleTime: 30000,
    retry: 2,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['stress-stats'],
    queryFn: async () => {
      const res = await fetch('/api/stress-test/stats', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: !!user,
  });

  const leaderboard = leaderboardData?.entries || [];
  const pagination = leaderboardData?.pagination || { total: 0, hasMore: false };
  const stats = statsData?.stats;

  const handleDifficultyChange = (v: string) => {
    setSelectedDifficulty(v as Difficulty);
    setOffset(0);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/stress-test">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Stress Test
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Return to difficulty selection and take the test</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Trophy className="w-12 h-12 text-primary animate-pulse cursor-help" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Global rankings of stress test champions</p>
                </TooltipContent>
              </Tooltip>
              <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-red-500 to-purple-500">
                Stress Test Leaderboard
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The bravest warriors who survived the chaos
            </p>
          </div>

          {/* User Stats */}
          {user && stats && (
            <Card className="mb-8 border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <Award className="w-5 h-5 text-primary" />
                        Your Statistics
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Your personal stress test performance summary</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center p-4 bg-muted rounded-lg cursor-help hover:bg-muted/80 transition-colors">
                        <div className="text-3xl font-bold text-primary">{stats.totalTests}</div>
                        <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          Total Tests
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Total number of stress tests you've attempted</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center p-4 bg-muted rounded-lg cursor-help hover:bg-muted/80 transition-colors">
                        <div className="text-3xl font-bold text-green-500">{stats.completedTests}</div>
                        <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="space-y-1">
                        <p>Tests where you typed 100% of the text</p>
                        <p className="text-xs text-muted-foreground">
                          Completion rate: {stats.totalTests > 0 ? ((stats.completedTests / stats.totalTests) * 100).toFixed(0) : 0}%
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center p-4 bg-muted rounded-lg cursor-help hover:bg-muted/80 transition-colors">
                        <div className="text-3xl font-bold text-orange-500">{stats.bestScore}</div>
                        <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                          <Crown className="w-3 h-3" />
                          Best Score
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Your highest stress score ever achieved</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center p-4 bg-muted rounded-lg cursor-help hover:bg-muted/80 transition-colors">
                        <div className="text-3xl font-bold text-blue-500">{stats.avgScore}</div>
                        <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                          <Target className="w-3 h-3" />
                          Avg Score
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Your average stress score across all tests</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center p-4 bg-muted rounded-lg cursor-help hover:bg-muted/80 transition-colors">
                        <div className="text-3xl font-bold text-purple-500">{stats.difficultiesCompleted.length}</div>
                        <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                          <Medal className="w-3 h-3" />
                          Difficulties Beat
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="space-y-1">
                        <p>Number of unique difficulties you've completed</p>
                        <p className="text-xs text-muted-foreground">Complete all 5 difficulties to become a true champion!</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                {stats.difficultiesCompleted.length > 0 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Conquered Difficulties:</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {stats.difficultiesCompleted.map((diff: string) => (
                        <Tooltip key={diff}>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full text-sm font-medium cursor-help hover:bg-primary/20 transition-colors">
                              <span>{DIFFICULTY_ICONS[diff as keyof typeof DIFFICULTY_ICONS]}</span>
                              <span className="capitalize">{diff}</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>{DIFFICULTY_DESCRIPTIONS[diff as keyof typeof DIFFICULTY_DESCRIPTIONS]}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Difficulty Filter */}
          <Tabs value={selectedDifficulty} onValueChange={handleDifficultyChange} className="mb-8">
            <TabsList className="grid w-full grid-cols-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="all" data-testid="tab-all">
                    All
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>View all difficulties combined</p>
                </TooltipContent>
              </Tooltip>
              
              <TabsTrigger value="beginner" data-testid="tab-beginner">
                🔥 Beginner
              </TabsTrigger>
              
              <TabsTrigger value="intermediate" data-testid="tab-intermediate">
                ⚡ Intermediate
              </TabsTrigger>
              
              <TabsTrigger value="expert" data-testid="tab-expert">
                💀 Expert
              </TabsTrigger>
              
              <TabsTrigger value="nightmare" data-testid="tab-nightmare">
                ☠️ Nightmare
              </TabsTrigger>
              
              <TabsTrigger value="impossible" data-testid="tab-impossible">
                🌀 Impossible
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedDifficulty}>
              <Card>
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
                  ) : leaderboardLoading ? (
                    <div className="text-center py-12">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">Loading leaderboard...</p>
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-12">
                      <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg text-muted-foreground">
                        No one has conquered this challenge yet. Be the first!
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {/* Table Header */}
                      <div className="hidden md:flex items-center gap-4 p-4 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <div className="w-12 text-center">Rank</div>
                        <div className="flex-1">Player</div>
                        {selectedDifficulty === 'all' && <div className="w-24">Difficulty</div>}
                        <div className="w-20 text-center">Score</div>
                        <div className="w-16 text-center">WPM</div>
                        <div className="w-16 text-center">Acc</div>
                        <div className="w-16 text-center">Done</div>
                      </div>
                      
                      {leaderboard.map((entry: any, index: number) => {
                        const rank = entry.rank || (index + 1);
                        return (
                        <div
                          key={`${entry.userId}-${entry.difficulty}-${entry.createdAt}`}
                          className={`flex items-center gap-4 p-4 transition-colors ${
                            entry.userId === user?.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                          }`}
                          data-testid={`leaderboard-entry-${index}`}
                        >
                          {/* Rank - uses DENSE_RANK from API for proper tie handling */}
                          <div className="flex-shrink-0 w-12 text-center">
                            {rank === 1 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-3xl animate-bounce cursor-help">🥇</div>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  <p>1st Place - The Champion!</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {rank === 2 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-3xl animate-bounce cursor-help" style={{ animationDelay: '0.1s' }}>🥈</div>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  <p>2nd Place - Silver medalist!</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {rank === 3 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-3xl animate-bounce cursor-help" style={{ animationDelay: '0.2s' }}>🥉</div>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  <p>3rd Place - Bronze medalist!</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {rank > 3 && (
                              <span className="text-2xl font-bold text-muted-foreground">#{rank}</span>
                            )}
                          </div>

                          {/* User */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="w-10 h-10 border-2 cursor-help" style={{ borderColor: entry.avatarColor || '#888' }}>
                                  <AvatarFallback style={{ backgroundColor: entry.avatarColor || '#888' }}>
                                    {entry.username.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>{entry.username}'s profile</p>
                              </TooltipContent>
                            </Tooltip>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate flex items-center gap-2">
                                {entry.username}
                                {entry.userId === user?.id && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded cursor-help">You</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p>This is your entry!</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-sm text-muted-foreground cursor-help">
                                    {new Date(entry.createdAt).toLocaleDateString()}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <p>Achieved on {new Date(entry.createdAt).toLocaleString()}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          {/* Difficulty Badge */}
                          {selectedDifficulty === 'all' && (
                            <div className="flex-shrink-0">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                DIFFICULTY_COLORS[entry.difficulty as keyof typeof DIFFICULTY_COLORS]
                              } bg-muted`}>
                                <span>{DIFFICULTY_ICONS[entry.difficulty as keyof typeof DIFFICULTY_ICONS]}</span>
                                <span className="capitalize">{entry.difficulty}</span>
                              </span>
                            </div>
                          )}

                          {/* Stats */}
                          <div className="flex gap-6 flex-shrink-0">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-primary">{entry.stressScore}</div>
                              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                <Star className="w-3 h-3" />
                                Score
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-lg font-semibold text-blue-500">{entry.wpm}</div>
                              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                <BarChart3 className="w-3 h-3" />
                                WPM
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-lg font-semibold text-green-500">{entry.accuracy.toFixed(1)}%</div>
                              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                <Target className="w-3 h-3" />
                                Acc
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className="text-lg font-semibold text-orange-500">{entry.completionRate.toFixed(0)}%</div>
                              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Done
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* CTA */}
          <div className="text-center mt-8">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/stress-test">
                  <Button size="lg" className="gap-2" data-testid="button-take-test">
                    <Flame className="w-5 h-5" />
                    Take the Test
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Challenge yourself and climb the leaderboard!</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function StressLeaderboard() {
  return (
    <ErrorBoundary>
      <StressLeaderboardContent />
    </ErrorBoundary>
  );
}
