import { useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
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
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, User as UserIcon, TrendingUp, MapPin, Keyboard, Edit, Award, Flame, Star, Target, ChevronRight, Trophy, Sparkles, Check, Zap, Share2, Moon, Sunrise, Rocket, Timer, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BADGES, TOTAL_BADGES, type UserBadgeProgress, getTierColor, getTierBorder, type Badge as BadgeType } from "@shared/badges";
import { BadgeCard } from "@/components/badge-card";
import { BadgeShareCard } from "@/components/badge-share-card";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Target,
  Flame,
  TrendingUp,
  Star,
  Award,
  Share2,
  Moon,
  Sunrise,
  Rocket,
  Sparkles,
  Timer,
};

function BadgeIcon({ iconName, className }: { iconName: string; className?: string }) {
  const IconComponent = iconMap[iconName] || Star;
  return <IconComponent className={className} />;
}

const tierDescriptions: Record<string, string> = {
  bronze: "Entry-level achievement",
  silver: "Intermediate milestone",
  gold: "Advanced accomplishment", 
  platinum: "Expert-level mastery",
  diamond: "Ultimate achievement",
};

interface NextAchievement {
  key: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  points: number;
  icon: string;
  color: string;
  progress: number;
  currentValue: number;
  targetValue: number;
}

interface UserAchievement {
  id: number;
  unlockedAt: string;
  testResultId: number | null;
  achievement: {
    id: number;
    key: string;
    name: string;
    description: string;
    category: string;
    tier: string;
    points: number;
    icon: string;
    color: string;
  };
}

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

  const { data: achievementsData } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const response = await fetch("/api/achievements", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch achievements");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: gamificationData } = useQuery({
    queryKey: ["gamification"],
    queryFn: async () => {
      const response = await fetch("/api/gamification", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch gamification");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: nextAchievementData } = useQuery<{ nextAchievement: NextAchievement | null }>({
    queryKey: ["next-achievement"],
    queryFn: async () => {
      const response = await fetch("/api/achievements/next", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch next achievement");
      return response.json();
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: showcaseBadgesData, refetch: refetchShowcase } = useQuery<{ showcaseBadges: string[] }>({
    queryKey: ["showcase-badges"],
    queryFn: async () => {
      const response = await fetch("/api/showcase-badges", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch showcase badges");
      return response.json();
    },
    enabled: !!user,
  });

  const queryClient = useQueryClient();
  const [showShowcaseModal, setShowShowcaseModal] = useState(false);
  const [selectedShowcaseBadges, setSelectedShowcaseBadges] = useState<string[]>([]);
  const [badgeToShare, setBadgeToShare] = useState<BadgeType | null>(null);
  const [showBadgeShareCard, setShowBadgeShareCard] = useState(false);

  const showcaseMutation = useMutation({
    mutationFn: async (badgeKeys: string[]) => {
      const response = await fetch("/api/showcase-badges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ badgeKeys }),
      });
      if (!response.ok) throw new Error("Failed to update showcase badges");
      return response.json();
    },
    onSuccess: () => {
      refetchShowcase();
      setShowShowcaseModal(false);
    },
  });

  const handleBadgeShare = (badge: BadgeType) => {
    setBadgeToShare(badge);
    setShowBadgeShareCard(true);
  };

  const handleShareTracked = async (platform: string) => {
    try {
      await fetch("/api/share/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "badge", platform, badgeId: badgeToShare?.id }),
      });
      queryClient.invalidateQueries({ queryKey: ["badges"] });
      queryClient.invalidateQueries({ queryKey: ["gamification"] });
    } catch (error) {
      console.error("Failed to track share:", error);
    }
  };

  const showcaseBadges = showcaseBadgesData?.showcaseBadges || [];
  const nextAchievement = nextAchievementData?.nextAchievement;

  const unlockedAchievements: UserAchievement[] = achievementsData?.achievements || [];
  const unlockedKeys = new Set(unlockedAchievements.map(a => a.achievement.key));
  const unlockedMap = new Map(unlockedAchievements.map(a => [a.achievement.key, a]));

  const badgeProgress: UserBadgeProgress[] = BADGES.map((badge) => {
    const isUnlocked = unlockedKeys.has(badge.id);
    const userAchievement = unlockedMap.get(badge.id);
    
    if (!badgeData?.badgeData) {
      return {
        badge,
        unlocked: isUnlocked,
        unlockedAt: userAchievement?.unlockedAt,
        progress: isUnlocked ? 100 : 0,
        currentValue: 0,
        requiredValue: badge.requirement.value,
      };
    }

    const data = badgeData.badgeData;
    let currentValue = 0;

    switch (badge.requirement.type) {
      case "wpm":
        currentValue = data.bestWpm || 0;
        break;
      case "accuracy":
        currentValue = data.bestAccuracy || 0;
        break;
      case "testCount":
        currentValue = data.totalTests || 0;
        break;
      case "streak":
        currentValue = Math.max(data.currentStreak || 0, data.bestStreak || 0);
        break;
      case "shares":
        currentValue = data.totalShares || 0;
        break;
      case "special":
        currentValue = isUnlocked ? 1 : 0;
        break;
    }

    const progress = isUnlocked 
      ? 100 
      : badge.requirement.value > 0 
        ? Math.min((currentValue / badge.requirement.value) * 100, 99.9) 
        : 0;

    return {
      badge,
      unlocked: isUnlocked,
      unlockedAt: userAchievement?.unlockedAt,
      progress,
      currentValue,
      requiredValue: badge.requirement.value,
    };
  });

  const unlockedCount = badgeProgress.filter((b) => b.unlocked).length;
  const totalPoints = gamificationData?.gamification?.totalPoints || 0;
  const level = gamificationData?.gamification?.level || 1;
  const xp = gamificationData?.gamification?.experiencePoints || 0;
  const xpForNextLevel = level * 100;
  const xpProgress = (xp % 100) / 100 * 100;

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
        <div className="flex items-start gap-6 p-6 rounded-2xl bg-card/70 backdrop-blur-md border border-border/50 shadow-xl">
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
                    Level {level}
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
                  <div>
                    <div className="text-3xl font-bold font-mono text-amber-500">{totalPoints}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Total XP</div>
                  </div>
                </>
              ) : (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="max-w-xs">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Level {level}</span>
                <span>{xp % 100} / 100 XP</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
            
            {unlockedCount > 0 && (
              <TooltipProvider delayDuration={200}>
                <div className="pt-3 border-t border-border/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-semibold">Badge Showcase</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm">Display your top achievements on your profile. Select up to 5 badges to showcase.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => {
                            setSelectedShowcaseBadges(showcaseBadges);
                            setShowShowcaseModal(true);
                          }}
                          data-testid="button-edit-showcase"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Customize your badge showcase</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {showcaseBadges.length > 0 ? (
                      showcaseBadges.map((badgeKey) => {
                        const badge = BADGES.find(b => b.id === badgeKey);
                        if (!badge) return null;
                        return (
                          <Tooltip key={badge.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "relative group flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all hover:scale-105 cursor-pointer",
                                  getTierBorder(badge.tier),
                                  `bg-gradient-to-br ${getTierColor(badge.tier)} bg-opacity-20`
                                )}
                                data-testid={`showcase-badge-${badge.id}`}
                              >
                                <div className={cn(
                                  "w-7 h-7 rounded-md flex items-center justify-center",
                                  `bg-gradient-to-br ${getTierColor(badge.tier)}`
                                )}>
                                  <BadgeIcon iconName={badge.icon} className="w-4 h-4 text-white drop-shadow-sm" />
                                </div>
                                <span className="text-sm font-medium">{badge.name}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-semibold">{badge.name}</p>
                                <p className="text-xs text-muted-foreground">{badge.description}</p>
                                <div className="flex items-center gap-2 pt-1">
                                  <Badge variant="outline" className="text-[10px] capitalize" style={{ borderColor: badge.color, color: badge.color }}>
                                    {badge.tier}
                                  </Badge>
                                  <span className="text-xs text-primary">+{badge.points} XP</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                        <Sparkles className="w-4 h-4" />
                        <p>No badges showcased yet. Click Edit to select up to 5 badges to display!</p>
                      </div>
                    )}
                  </div>
                </div>
              </TooltipProvider>
            )}
          </div>
        </div>

        {nextAchievement && (
          <Card 
            className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card/80 to-purple-500/5 backdrop-blur-md shadow-lg shadow-primary/10 hover:border-primary/50 transition-all duration-300"
            data-testid="next-badge-widget"
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div 
                    className={cn(
                      "w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-lg",
                      "bg-gradient-to-br from-muted/80 to-muted border-2 border-border/50"
                    )}
                    style={{ 
                      boxShadow: `0 8px 32px ${nextAchievement.color}20`,
                    }}
                  >
                    {nextAchievement.icon}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Target className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Next Badge to Unlock
                    </span>
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-1.5 py-0 capitalize"
                      style={{ 
                        borderColor: nextAchievement.color,
                        color: nextAchievement.color
                      }}
                      data-testid="next-badge-tier"
                    >
                      {nextAchievement.tier}
                    </Badge>
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] px-1.5 py-0"
                      data-testid="next-badge-points"
                    >
                      +{nextAchievement.points} XP
                    </Badge>
                  </div>
                  
                  <h3 className="text-xl font-bold truncate" data-testid="next-badge-name">
                    {nextAchievement.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1" data-testid="next-badge-description">
                    {nextAchievement.description}
                  </p>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-mono font-semibold text-primary" data-testid="next-badge-progress-text">
                        {nextAchievement.currentValue} / {nextAchievement.targetValue}
                        <span className="text-muted-foreground ml-2">({nextAchievement.progress}%)</span>
                      </span>
                    </div>
                    <Progress 
                      value={nextAchievement.progress} 
                      className="h-3 bg-secondary [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-purple-500"
                      data-testid="next-badge-progress"
                    />
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="shrink-0"
                  onClick={() => setLocation("/")}
                  data-testid="next-badge-start-typing"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {chartData.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border/50 bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle>WPM History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
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

            <Card className="border-border/50 bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle>Accuracy Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <RechartsTooltip 
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

        <Card className="border-border/50 bg-card/60 backdrop-blur-md">
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

        <Card className="border-border/50 bg-card/60 backdrop-blur-md">
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
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Star className="w-5 h-5 text-amber-500" />
                      <span className="text-sm font-semibold">
                        {totalPoints} XP
                      </span>
                    </div>
                    <Badge variant="outline" className="text-base px-4 py-2">
                      {unlockedCount} / {TOTAL_BADGES} Unlocked
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="speed">Speed</TabsTrigger>
                <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
                <TabsTrigger value="consistency">Consistency</TabsTrigger>
                <TabsTrigger value="streak">Streaks</TabsTrigger>
                <TabsTrigger value="special">Special</TabsTrigger>
                <TabsTrigger value="secret" className="text-indigo-400">Secret</TabsTrigger>
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
                      unlockedAt={item.unlockedAt}
                      onShare={item.unlocked ? handleBadgeShare : undefined}
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
                        unlockedAt={item.unlockedAt}
                        onShare={item.unlocked ? handleBadgeShare : undefined}
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
                        unlockedAt={item.unlockedAt}
                        onShare={item.unlocked ? handleBadgeShare : undefined}
                      />
                    ))}
                </div>
              </TabsContent>
              <TabsContent value="consistency" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {badgeProgress
                    .filter((item) => item.badge.category === "consistency")
                    .map((item) => (
                      <BadgeCard
                        key={item.badge.id}
                        badge={item.badge}
                        unlocked={item.unlocked}
                        progress={item.progress}
                        currentValue={item.currentValue}
                        unlockedAt={item.unlockedAt}
                        onShare={item.unlocked ? handleBadgeShare : undefined}
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
                        unlockedAt={item.unlockedAt}
                        onShare={item.unlocked ? handleBadgeShare : undefined}
                      />
                    ))}
                </div>
              </TabsContent>
              <TabsContent value="special" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {badgeProgress
                    .filter((item) => item.badge.category === "special")
                    .map((item) => (
                      <BadgeCard
                        key={item.badge.id}
                        badge={item.badge}
                        unlocked={item.unlocked}
                        progress={item.progress}
                        currentValue={item.currentValue}
                        unlockedAt={item.unlockedAt}
                        onShare={item.unlocked ? handleBadgeShare : undefined}
                      />
                    ))}
                </div>
              </TabsContent>
              <TabsContent value="secret" className="mt-6">
                <div className="mb-4 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-sm text-indigo-400">
                    Secret badges are hidden until you unlock them. Explore different ways to practice typing to discover them!
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {badgeProgress
                    .filter((item) => item.badge.category === "secret")
                    .map((item) => (
                      <BadgeCard
                        key={item.badge.id}
                        badge={item.badge}
                        unlocked={item.unlocked}
                        progress={item.progress}
                        currentValue={item.currentValue}
                        unlockedAt={item.unlockedAt}
                        onShare={item.unlocked ? handleBadgeShare : undefined}
                      />
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Dialog open={showShowcaseModal} onOpenChange={setShowShowcaseModal}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="showcase-modal">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Select Badges to Showcase
              </DialogTitle>
              <DialogDescription>
                Choose up to 5 unlocked badges to display prominently on your profile. These badges will be visible to other users.
              </DialogDescription>
            </DialogHeader>
            
            <TooltipProvider delayDuration={300}>
              <div className="flex-1 overflow-hidden flex flex-col py-4">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {selectedShowcaseBadges.length} / 5 badges selected
                      </span>
                      {selectedShowcaseBadges.length === 5 && (
                        <Badge variant="secondary" className="text-[10px]">Maximum reached</Badge>
                      )}
                    </div>
                  </div>
                  {selectedShowcaseBadges.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedShowcaseBadges([])}
                          data-testid="button-clear-selection"
                        >
                          Clear All
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove all selected badges</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {badgeProgress
                      .filter((item) => item.unlocked)
                      .map((item) => {
                        const isSelected = selectedShowcaseBadges.includes(item.badge.id);
                        const canSelect = selectedShowcaseBadges.length < 5 || isSelected;
                        
                        return (
                          <Tooltip key={item.badge.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md",
                                  isSelected 
                                    ? `${getTierBorder(item.badge.tier)} bg-gradient-to-br ${getTierColor(item.badge.tier)} bg-opacity-10 shadow-sm` 
                                    : "border-border hover:border-primary/50 bg-background",
                                  !canSelect && "opacity-50 cursor-not-allowed hover:shadow-none"
                                )}
                                onClick={() => {
                                  if (!canSelect) return;
                                  if (isSelected) {
                                    setSelectedShowcaseBadges(prev => prev.filter(k => k !== item.badge.id));
                                  } else {
                                    setSelectedShowcaseBadges(prev => [...prev, item.badge.id]);
                                  }
                                }}
                                data-testid={`showcase-select-${item.badge.id}`}
                              >
                                <div className={cn(
                                  "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
                                  `bg-gradient-to-br ${getTierColor(item.badge.tier)}`
                                )}>
                                  <BadgeIcon iconName={item.badge.icon} className="w-6 h-6 text-white drop-shadow-md" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm truncate">{item.badge.name}</div>
                                  <div className="text-xs text-muted-foreground line-clamp-1">{item.badge.description}</div>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <Badge 
                                      variant="outline" 
                                      className="text-[10px] px-1.5 py-0 capitalize"
                                      style={{ borderColor: item.badge.color, color: item.badge.color }}
                                    >
                                      {item.badge.tier}
                                    </Badge>
                                    <span className="text-[10px] text-primary font-medium">+{item.badge.points} XP</span>
                                  </div>
                                </div>
                                <div className={cn(
                                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                                  isSelected 
                                    ? "bg-primary border-primary" 
                                    : "border-muted-foreground/30 hover:border-primary/50"
                                )}>
                                  {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[250px]">
                              <div className="space-y-1.5">
                                <p className="font-semibold">{item.badge.name}</p>
                                <p className="text-xs text-muted-foreground">{item.badge.description}</p>
                                <p className="text-[10px] text-muted-foreground">{tierDescriptions[item.badge.tier] || "Achievement"}</p>
                                {item.unlockedAt && (
                                  <p className="text-[10px] text-green-500">
                                    Unlocked: {new Date(item.unlockedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                  </div>
                </div>
                
                {badgeProgress.filter(item => item.unlocked).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="font-medium">No badges unlocked yet!</p>
                    <p className="text-sm mt-2 max-w-xs mx-auto">Complete typing tests and reach milestones to earn badges you can showcase.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => {
                        setShowShowcaseModal(false);
                        setLocation("/");
                      }}
                    >
                      Start Typing
                    </Button>
                  </div>
                )}
              </div>
            </TooltipProvider>
            
            <div className="flex justify-between items-center gap-3 pt-4 border-t flex-shrink-0">
              <div className="text-xs text-muted-foreground">
                {badgeProgress.filter(item => item.unlocked).length} badge{badgeProgress.filter(item => item.unlocked).length !== 1 ? 's' : ''} available
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowShowcaseModal(false)}
                  data-testid="button-cancel-showcase"
                >
                  Cancel
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        onClick={() => showcaseMutation.mutate(selectedShowcaseBadges)}
                        disabled={showcaseMutation.isPending}
                        data-testid="button-save-showcase"
                      >
                        {showcaseMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Save Showcase
                          </>
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {selectedShowcaseBadges.length > 0 && selectedShowcaseBadges.length < 3 && (
                    <TooltipContent>
                      <p>Select at least 3 badges to save</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {badgeToShare && (
          <BadgeShareCard
            badge={badgeToShare}
            username={user?.username}
            unlockedAt={badgeProgress.find(b => b.badge.id === badgeToShare.id)?.unlockedAt}
            isOpen={showBadgeShareCard}
            onClose={() => {
              setShowBadgeShareCard(false);
              setBadgeToShare(null);
            }}
            onShareTracked={handleShareTracked}
          />
        )}
      </div>
  );
}
