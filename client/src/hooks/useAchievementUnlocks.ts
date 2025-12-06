import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useAchievementCelebration, type UnlockedAchievement } from "@/components/achievement-celebration";

interface UserAchievementData {
  id: number;
  unlockedAt: string;
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

const tierIcons: Record<string, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
  diamond: "👑",
};

export function useAchievementUnlocks() {
  const { user } = useAuth();
  const { celebrate } = useAchievementCelebration();
  const previousAchievementIds = useRef<Set<number>>(new Set());
  const initialized = useRef(false);

  const { data: achievements } = useQuery<{ achievements: UserAchievementData[] }>({
    queryKey: ["user-achievements"],
    queryFn: async () => {
      const response = await fetch("/api/achievements", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch achievements");
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  useEffect(() => {
    if (!achievements?.achievements || !user) return;

    const currentIds = new Set(achievements.achievements.map((a) => a.id));

    if (!initialized.current) {
      previousAchievementIds.current = currentIds;
      initialized.current = true;
      return;
    }

    const newAchievements = achievements.achievements.filter(
      (a) => !previousAchievementIds.current.has(a.id)
    );

    if (newAchievements.length > 0) {
      const formattedAchievements: UnlockedAchievement[] = newAchievements.map((a) => ({
        id: a.achievement.key,
        name: a.achievement.name,
        description: a.achievement.description,
        icon: tierIcons[a.achievement.tier] || a.achievement.icon,
        tier: a.achievement.tier as UnlockedAchievement["tier"],
        points: a.achievement.points,
        category: a.achievement.category,
      }));

      formattedAchievements.forEach((achievement) => celebrate(achievement));
    }

    previousAchievementIds.current = currentIds;
  }, [achievements, user, celebrate]);

  return {
    achievements: achievements?.achievements || [],
    totalAchievements: achievements?.achievements.length || 0,
  };
}

export function useCheckNewAchievements() {
  const { user } = useAuth();
  const { celebrateMultiple } = useAchievementCelebration();

  const checkForNewAchievements = async (): Promise<number> => {
    if (!user) return 0;

    try {
      const response = await fetch("/api/achievements/check-new", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) return 0;

      const data = await response.json();
      
      if (data.newAchievements && data.newAchievements.length > 0) {
        const formattedAchievements: UnlockedAchievement[] = data.newAchievements.map((a: any) => ({
          id: a.key,
          name: a.name,
          description: a.description,
          icon: tierIcons[a.tier] || a.icon,
          tier: a.tier as UnlockedAchievement["tier"],
          points: a.points,
          category: a.category,
        }));

        celebrateMultiple(formattedAchievements);
        return formattedAchievements.length;
      }

      return 0;
    } catch (error) {
      console.error("Failed to check for new achievements:", error);
      return 0;
    }
  };

  return { checkForNewAchievements };
}
