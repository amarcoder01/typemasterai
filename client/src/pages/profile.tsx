import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, User as UserIcon, TrendingUp, MapPin, Keyboard, Edit, Award, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { BADGES, type UserBadgeProgress } from "@shared/badges";
import { BadgeCard } from "@/components/badge-card";

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: statsData } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: resultsData } = useQuery({
    queryKey: ["test-results"],
    queryFn: async () => {
      const response = await fetch("/api/test-results?limit=10", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch results");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: badgeData } = useQuery({
    queryKey: ["badges"],
    queryFn: async () => {
      const response = await fetch("/api/badges", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch badges");
      return response.json();
    },
    enabled: !!user,
  });

  // Calculate badge progress
  const badgeProgress: UserBadgeProgress[] = BADGES.map((badge) => {
    if (!badgeData?.badgeData) {
      return {
        badge,
        unlocked: false,
        progress: 0,
        currentValue: 0,
        requiredValue: badge.requirement.value,
      };
    }

    const data = badgeData.badgeData;
    let currentValue = 0;
    let unlocked = false;

    switch (badge.requirement.type) {
      case "wpm":
        currentValue = data.bestWpm;
        unlocked = currentValue >= badge.requirement.value;
        break;
      case "accuracy":
        currentValue = data.bestAccuracy; // Use raw float for accurate comparison
        unlocked = currentValue >= badge.requirement.value; // True accuracy must meet threshold
        break;
      case "testCount":
        currentValue = data.totalTests;
        unlocked = currentValue >= badge.requirement.value;
        break;
      case "streak":
        currentValue = data.currentStreak;
        unlocked = currentValue >= badge.requirement.value;
        break;
      case "bestStreak":
        currentValue = data.bestStreak;
        unlocked = currentValue >= badge.requirement.value;
        break;
    }

    const progress = Math.min((currentValue / badge.requirement.value) * 100, 100);

    return {
      badge,
      unlocked,
      progress,
      currentValue,
      requiredValue: badge.requirement.value,
    };
  });

  const unlockedCount = badgeProgress.filter((b) => b.unlocked).length;
  const totalCount = BADGES.length;

  if (!user) {
    return (
        <div className="max-w-3xl mx-auto">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-12">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">View Your Typing Stats</h2>
                  <p className="text-muted-foreground max-w-md">
                    Sign in to access your personal profile, track your progress over time, and see detailed analytics of your typing performance.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 w-full max-w-md pt-4">
                  <div className="p-4 bg-background/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">📊</div>
                    <div className="text-xs text-muted-foreground mt-1">Charts</div>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">📈</div>
                    <div className="text-xs text-muted-foreground mt-1">History</div>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">🏆</div>
                    <div className="text-xs text-muted-foreground mt-1">Stats</div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button onClick={() => setLocation("/register")} size="lg">
                    Create Account
                  </Button>
                  <Button onClick={() => setLocation("/login")} variant="outline" size="lg">
                    Sign In
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    );
  }

  const stats = statsData?.stats;
  const results = resultsData?.results || [];

  const chartData = results.slice(0, 7).reverse().map((result: any, index: number) => ({
    date: `Test ${index + 1}`,
    wpm: result.wpm,
    acc: result.accuracy,
  }));

  return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-start gap-6 p-6 rounded-2xl bg-card border border-border">
          <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
            <AvatarFallback className={cn(user.avatarColor || "bg-primary", "text-primary-foreground text-3xl")}>
              {user.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">{user.username}</h1>
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20">
                    PRO
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">{user.email}</p>
                {user.bio && (
                  <p className="text-foreground/80 mt-2 max-w-2xl">{user.bio}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  {user.country && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{user.country}</span>
                    </div>
                  )}
                  {user.keyboardLayout && (
                    <div className="flex items-center gap-1">
                      <Keyboard className="w-4 h-4" />
                      <span>{user.keyboardLayout}</span>
                    </div>
                  )}
                  {stats && (
                    <span>{stats.totalTests} Tests Completed</span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLocation("/profile/edit")} data-testid="button-edit-profile">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
            <div className="flex gap-8">
              {stats ? (
                <>
                  <div>
                    <div className="text-3xl font-bold font-mono">{stats.avgWpm || 0}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Avg WPM</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold font-mono text-primary">{stats.bestWpm || 0}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Best WPM</div>
                  </div>
                </>
              ) : (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>WPM History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <Line type="monotone" dataKey="wpm" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accuracy Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip 
                         cursor={{fill: 'hsl(var(--muted)/0.3)'}}
                         contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                         itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar dataKey="acc" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="space-y-1">
                {results.map((test: any) => (
                  <div key={test.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span className="font-mono font-medium">{test.wpm} wpm</span>
                    </div>
                    <div className="flex items-center gap-8 text-sm text-muted-foreground">
                      <span>{test.accuracy.toFixed(1)}% acc</span>
                      <span>{test.mode}s</span>
                      <span>{new Date(test.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tests completed yet.</p>
                <p className="text-sm mt-2">Start typing to see your results here!</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>Achievements & Badges</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Unlock badges by reaching milestones
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {badgeData?.badgeData && (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <span className="text-sm font-semibold">
                        {badgeData.badgeData.currentStreak} Day Streak
                      </span>
                    </div>
                    <Badge variant="outline" className="text-base px-4 py-2">
                      {unlockedCount} / {totalCount} Unlocked
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="speed">Speed</TabsTrigger>
                <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
                <TabsTrigger value="milestone">Milestones</TabsTrigger>
                <TabsTrigger value="streak">Streaks</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {badgeProgress.map((item) => (
                    <BadgeCard
                      key={item.badge.id}
                      badge={item.badge}
                      unlocked={item.unlocked}
                      progress={item.progress}
                      currentValue={item.currentValue}
                    />
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="speed" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {badgeProgress
                    .filter((item) => item.badge.category === "speed")
                    .map((item) => (
                      <BadgeCard
                        key={item.badge.id}
                        badge={item.badge}
                        unlocked={item.unlocked}
                        progress={item.progress}
                        currentValue={item.currentValue}
                      />
                    ))}
                </div>
              </TabsContent>
              <TabsContent value="accuracy" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {badgeProgress
                    .filter((item) => item.badge.category === "accuracy")
                    .map((item) => (
                      <BadgeCard
                        key={item.badge.id}
                        badge={item.badge}
                        unlocked={item.unlocked}
                        progress={item.progress}
                        currentValue={item.currentValue}
                      />
                    ))}
                </div>
              </TabsContent>
              <TabsContent value="milestone" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {badgeProgress
                    .filter((item) => item.badge.category === "milestone")
                    .map((item) => (
                      <BadgeCard
                        key={item.badge.id}
                        badge={item.badge}
                        unlocked={item.unlocked}
                        progress={item.progress}
                        currentValue={item.currentValue}
                      />
                    ))}
                </div>
              </TabsContent>
              <TabsContent value="streak" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {badgeProgress
                    .filter((item) => item.badge.category === "streak")
                    .map((item) => (
                      <BadgeCard
                        key={item.badge.id}
                        badge={item.badge}
                        unlocked={item.unlocked}
                        progress={item.progress}
                        currentValue={item.currentValue}
                      />
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
  );
}
