import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Trophy, Zap, Flame, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';

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

export default function StressLeaderboard() {
  const { user } = useAuth();
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('all');

  const { data: leaderboardData } = useQuery({
    queryKey: ['stress-leaderboard', selectedDifficulty],
    queryFn: async () => {
      const params = selectedDifficulty !== 'all' ? `?difficulty=${selectedDifficulty}` : '';
      const res = await fetch(`/api/stress-test/leaderboard${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json();
    },
  });

  const { data: statsData } = useQuery({
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

  const leaderboard = leaderboardData?.leaderboard || [];
  const stats = statsData?.stats;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/stress-test">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            Back to Stress Test
          </Button>
        </Link>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-12 h-12 text-primary animate-pulse" />
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
                <Award className="w-5 h-5 text-primary" />
                Your Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary">{stats.totalTests}</div>
                  <div className="text-sm text-muted-foreground">Total Tests</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-green-500">{stats.completedTests}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-orange-500">{stats.bestScore}</div>
                  <div className="text-sm text-muted-foreground">Best Score</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-blue-500">{stats.avgScore}</div>
                  <div className="text-sm text-muted-foreground">Avg Score</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-purple-500">{stats.difficultiesCompleted.length}</div>
                  <div className="text-sm text-muted-foreground">Difficulties Beat</div>
                </div>
              </div>
              
              {stats.difficultiesCompleted.length > 0 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Conquered Difficulties:</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {stats.difficultiesCompleted.map((diff: string) => (
                      <span
                        key={diff}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full text-sm font-medium"
                      >
                        <span>{DIFFICULTY_ICONS[diff as keyof typeof DIFFICULTY_ICONS]}</span>
                        <span className="capitalize">{diff}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Difficulty Filter */}
        <Tabs value={selectedDifficulty} onValueChange={(v) => setSelectedDifficulty(v as Difficulty)} className="mb-8">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all" data-testid="tab-all">
              All
            </TabsTrigger>
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
                {leaderboard.length === 0 ? (
                  <div className="text-center py-12">
                    <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg text-muted-foreground">
                      No one has conquered this challenge yet. Be the first!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {leaderboard.map((entry: any, index: number) => (
                      <div
                        key={entry.userId + entry.createdAt}
                        className={`flex items-center gap-4 p-4 transition-colors ${
                          entry.userId === user?.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                        data-testid={`leaderboard-entry-${index}`}
                      >
                        {/* Rank */}
                        <div className="flex-shrink-0 w-12 text-center">
                          {index === 0 && (
                            <div className="text-3xl animate-bounce">🥇</div>
                          )}
                          {index === 1 && (
                            <div className="text-3xl animate-bounce" style={{ animationDelay: '0.1s' }}>🥈</div>
                          )}
                          {index === 2 && (
                            <div className="text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>🥉</div>
                          )}
                          {index > 2 && (
                            <span className="text-2xl font-bold text-muted-foreground">#{index + 1}</span>
                          )}
                        </div>

                        {/* User */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="w-10 h-10 border-2" style={{ borderColor: entry.avatarColor || '#888' }}>
                            <AvatarFallback style={{ backgroundColor: entry.avatarColor || '#888' }}>
                              {entry.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold truncate flex items-center gap-2">
                              {entry.username}
                              {entry.userId === user?.id && (
                                <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded">You</span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </div>
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
                            <div className="text-xs text-muted-foreground">Score</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-blue-500">{entry.wpm}</div>
                            <div className="text-xs text-muted-foreground">WPM</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-green-500">{entry.accuracy.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">Acc</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-orange-500">{entry.completionRate.toFixed(0)}%</div>
                            <div className="text-xs text-muted-foreground">Done</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <div className="text-center mt-8">
          <Link href="/stress-test">
            <Button size="lg" className="gap-2" data-testid="button-take-test">
              <Flame className="w-5 h-5" />
              Take the Test
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
