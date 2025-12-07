import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, User as UserIcon, TrendingUp, MapPin, Keyboard, Edit, Award, Flame, Star, Target, ChevronRight, Trophy, Sparkles, Check, Zap, Share2, Moon, Sunrise, Rocket, Timer, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BADGES, TOTAL_BADGES, type UserBadgeProgress, getTierColor, getTierBorder, type Badge as BadgeType } from "@shared/badges";
import { BadgeCard } from "@/components/badge-card";
import { BadgeShareCard } from "@/components/badge-share-card";

function ProfileHeaderSkeleton() {
  return (
    <div className="flex items-start gap-6 p-6 rounded-2xl bg-card/70 backdrop-blur-md border border-border/50 shadow-xl">
      <Skeleton className="w-24 h-24 rounded-full" />
      <div className="flex-1 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
            <div className="flex items-center gap-4 mt-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="flex gap-8">
          <div>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-14" />
          </div>
          <div>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
        <div className="max-w-xs space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="flex gap-8">
      <div>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-14" />
      </div>
      <div>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  );
}

function BadgeCardSkeleton() {
  return (
    <div className="p-4 rounded-xl border-2 border-border/50 bg-card/50 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-2 w-full" />
    </div>
  );
}


function ErrorState({ 
  message, 
  onRetry, 
  isRetrying,
  testId = "button-retry"
}: { 
  message: string; 
  onRetry: () => void; 
  isRetrying?: boolean;
  testId?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 bg-destructive/5 border border-destructive/20 rounded-lg">
      <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5 text-destructive" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRetry}
        disabled={isRetrying}
        data-testid={testId}
      >
        {isRetrying ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Retrying...
          </>
        ) : (
          <>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-2" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            Retry
          </>
        )}
      </Button>
    </div>
  );
}

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

  const { data: statsData, error: statsError, isLoading: statsLoading, refetch: refetchStats, isFetching: statsRefetching } = useQuery({
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

  const { data: badgeData, error: badgeError, isLoading: badgeLoading, refetch: refetchBadges, isFetching: badgeRefetching } = useQuery({
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

  const { data: achievementsData, error: achievementsError, isLoading: achievementsLoading, refetch: refetchAchievements, isFetching: achievementsRefetching } = useQuery({
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

  const { data: gamificationData, error: gamificationError, isLoading: gamificationLoading, refetch: refetchGamification, isFetching: gamificationRefetching } = useQuery({
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
        <div className="max-w-3xl mx-auto px-4 sm:px-0">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 sm:p-12">
              <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-bold">View Your Typing Stats</h2>
                  <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                    Sign in to access your personal profile, track your progress over time, and see detailed analytics of your typing performance.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-md pt-4">
                  <div className="p-3 sm:p-4 bg-background/50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-primary">📊</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">Charts</div>
                  </div>
                  <div className="p-3 sm:p-4 bg-background/50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-primary">📈</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">History</div>
                  </div>
                  <div className="p-3 sm:p-4 bg-background/50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-primary">🏆</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">Stats</div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4 w-full sm:w-auto">
                  <Button onClick={() => setLocation("/register")} size="lg" className="w-full sm:w-auto">
                    Create Account
                  </Button>
                  <Button onClick={() => setLocation("/login")} variant="outline" size="lg" className="w-full sm:w-auto">
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

  return (
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-0">
        <TooltipProvider delayDuration={200}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl bg-card/70 backdrop-blur-md border border-border/50 shadow-xl">
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-background shadow-xl cursor-pointer shrink-0">
                <AvatarFallback className={cn(user.avatarColor || "bg-primary", "text-primary-foreground text-2xl sm:text-3xl")}>
                  {user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>Your profile avatar</p>
            </TooltipContent>
          </Tooltip>
          <div className="flex-1 space-y-3 w-full text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 sm:gap-0">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-username">{user.username}</h1>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20 cursor-help" data-testid="badge-level">
                        Level {level}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="font-semibold">Your Level</p>
                      <p className="text-xs text-muted-foreground mt-1">Levels are earned by gaining XP. Each level requires 100 XP. Keep typing to level up!</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-muted-foreground mt-1" data-testid="text-email">{user.email}</p>
                {user.bio && (
                  <p className="text-foreground/80 mt-2 max-w-2xl" data-testid="text-bio">{user.bio}</p>
                )}
                <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                  {user.country && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help" data-testid="text-country">
                          <MapPin className="w-4 h-4" />
                          <span>{user.country}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your location</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {user.keyboardLayout && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help" data-testid="text-keyboard">
                          <Keyboard className="w-4 h-4" />
                          <span>{user.keyboardLayout}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your keyboard layout</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {stats && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help" data-testid="text-tests-count">{stats.totalTests} Tests Completed</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total typing tests you've completed</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setLocation("/profile/edit")} data-testid="button-edit-profile">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Customize your avatar, bio, and preferences</p>
                </TooltipContent>
              </Tooltip>
            </div>
            {statsError ? (
              <ErrorState 
                message="Failed to load stats. Please try again." 
                onRetry={() => refetchStats()} 
                isRetrying={statsRefetching}
                testId="button-retry-stats"
              />
            ) : statsLoading ? (
              <StatsSkeleton />
            ) : stats ? (
              <div className="flex justify-center sm:justify-start gap-6 sm:gap-8 flex-wrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help text-center sm:text-left" data-testid="stat-avg-wpm">
                      <div className="text-2xl sm:text-3xl font-bold font-mono">{stats.avgWpm || 0}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Avg WPM</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-semibold">Average Words Per Minute</p>
                    <p className="text-xs text-muted-foreground mt-1">Your average typing speed across all tests. Higher is better!</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help text-center sm:text-left" data-testid="stat-best-wpm">
                      <div className="text-2xl sm:text-3xl font-bold font-mono text-primary">{stats.bestWpm || 0}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Best WPM</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-semibold">Personal Best Speed</p>
                    <p className="text-xs text-muted-foreground mt-1">Your highest typing speed ever recorded. Keep practicing to beat it!</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help text-center sm:text-left" data-testid="stat-total-xp">
                      <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-500">{totalPoints}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Total XP</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-semibold">Experience Points</p>
                    <p className="text-xs text-muted-foreground mt-1">Earn XP by completing tests, unlocking badges, and maintaining streaks. XP contributes to your level!</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <StatsSkeleton />
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="max-w-xs mx-auto sm:mx-0 cursor-help" data-testid="level-progress">
                  <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mb-1">
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
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-semibold">Level Progress</p>
                <p className="text-xs text-muted-foreground mt-1">Earn 100 XP to reach the next level. Complete tests and unlock badges to earn XP faster!</p>
              </TooltipContent>
            </Tooltip>
            
            {unlockedCount > 0 && (
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
      </TooltipProvider>
      </div>
  );
}
