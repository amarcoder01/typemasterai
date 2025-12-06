export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "speed" | "accuracy" | "consistency" | "streak" | "special";
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  points: number;
  color: string;
  requirement: {
    type: "wpm" | "accuracy" | "testCount" | "streak" | "special" | "shares";
    value: number;
  };
}

export const BADGES: Badge[] = [
  // Speed Achievements (5)
  {
    id: "speed_rookie_30",
    name: "Speed Rookie",
    description: "Reach 30 WPM",
    icon: "Zap",
    category: "speed",
    tier: "bronze",
    points: 10,
    color: "amber",
    requirement: { type: "wpm", value: 30 },
  },
  {
    id: "speed_novice_50",
    name: "Speed Novice",
    description: "Reach 50 WPM",
    icon: "Zap",
    category: "speed",
    tier: "silver",
    points: 25,
    color: "amber",
    requirement: { type: "wpm", value: 50 },
  },
  {
    id: "speed_expert_80",
    name: "Speed Expert",
    description: "Reach 80 WPM",
    icon: "Zap",
    category: "speed",
    tier: "gold",
    points: 50,
    color: "amber",
    requirement: { type: "wpm", value: 80 },
  },
  {
    id: "speed_master_100",
    name: "Speed Master",
    description: "Reach 100 WPM",
    icon: "Zap",
    category: "speed",
    tier: "platinum",
    points: 100,
    color: "amber",
    requirement: { type: "wpm", value: 100 },
  },
  {
    id: "speed_legend_120",
    name: "Speed Legend",
    description: "Reach 120 WPM",
    icon: "Zap",
    category: "speed",
    tier: "diamond",
    points: 200,
    color: "amber",
    requirement: { type: "wpm", value: 120 },
  },

  // Accuracy Achievements (3)
  {
    id: "accuracy_precise_95",
    name: "Precision Seeker",
    description: "Achieve 95% accuracy",
    icon: "Target",
    category: "accuracy",
    tier: "bronze",
    points: 15,
    color: "blue",
    requirement: { type: "accuracy", value: 95 },
  },
  {
    id: "accuracy_perfect_98",
    name: "Near Perfect",
    description: "Achieve 98% accuracy",
    icon: "Target",
    category: "accuracy",
    tier: "gold",
    points: 75,
    color: "blue",
    requirement: { type: "accuracy", value: 98 },
  },
  {
    id: "accuracy_flawless_100",
    name: "Flawless Typist",
    description: "Achieve 100% accuracy in a single test",
    icon: "Target",
    category: "accuracy",
    tier: "diamond",
    points: 250,
    color: "blue",
    requirement: { type: "accuracy", value: 100 },
  },

  // Streak Achievements (4)
  {
    id: "streak_committed_7",
    name: "Week Warrior",
    description: "Maintain a 7-day streak",
    icon: "Flame",
    category: "streak",
    tier: "bronze",
    points: 20,
    color: "orange",
    requirement: { type: "streak", value: 7 },
  },
  {
    id: "streak_dedicated_30",
    name: "Monthly Dedication",
    description: "Maintain a 30-day streak",
    icon: "Flame",
    category: "streak",
    tier: "silver",
    points: 50,
    color: "orange",
    requirement: { type: "streak", value: 30 },
  },
  {
    id: "streak_master_100",
    name: "Streak Master",
    description: "Maintain a 100-day streak",
    icon: "Flame",
    category: "streak",
    tier: "gold",
    points: 150,
    color: "orange",
    requirement: { type: "streak", value: 100 },
  },
  {
    id: "streak_legend_365",
    name: "Year-Long Dedication",
    description: "Maintain a 365-day streak",
    icon: "Flame",
    category: "streak",
    tier: "diamond",
    points: 500,
    color: "orange",
    requirement: { type: "streak", value: 365 },
  },

  // Consistency Achievements (5)
  {
    id: "consistency_beginner_10",
    name: "Getting Started",
    description: "Complete 10 tests",
    icon: "TrendingUp",
    category: "consistency",
    tier: "bronze",
    points: 10,
    color: "green",
    requirement: { type: "testCount", value: 10 },
  },
  {
    id: "consistency_regular_50",
    name: "Regular Typist",
    description: "Complete 50 tests",
    icon: "TrendingUp",
    category: "consistency",
    tier: "silver",
    points: 25,
    color: "green",
    requirement: { type: "testCount", value: 50 },
  },
  {
    id: "consistency_dedicated_100",
    name: "Dedicated Practitioner",
    description: "Complete 100 tests",
    icon: "TrendingUp",
    category: "consistency",
    tier: "gold",
    points: 50,
    color: "green",
    requirement: { type: "testCount", value: 100 },
  },
  {
    id: "consistency_veteran_500",
    name: "Typing Veteran",
    description: "Complete 500 tests",
    icon: "TrendingUp",
    category: "consistency",
    tier: "platinum",
    points: 150,
    color: "green",
    requirement: { type: "testCount", value: 500 },
  },
  {
    id: "consistency_master_1000",
    name: "Typing Master",
    description: "Complete 1000 tests",
    icon: "TrendingUp",
    category: "consistency",
    tier: "diamond",
    points: 300,
    color: "green",
    requirement: { type: "testCount", value: 1000 },
  },

  // Special Achievements (5)
  {
    id: "special_first_test",
    name: "First Steps",
    description: "Complete your first typing test",
    icon: "Star",
    category: "special",
    tier: "bronze",
    points: 5,
    color: "purple",
    requirement: { type: "testCount", value: 1 },
  },
  {
    id: "special_speed_accuracy",
    name: "Speed & Precision",
    description: "Achieve 80 WPM with 95% accuracy in one test",
    icon: "Award",
    category: "special",
    tier: "platinum",
    points: 200,
    color: "purple",
    requirement: { type: "special", value: 0 },
  },
  {
    id: "social_first_share",
    name: "Social Butterfly",
    description: "Share your first typing result",
    icon: "Share2",
    category: "special",
    tier: "bronze",
    points: 15,
    color: "cyan",
    requirement: { type: "shares", value: 1 },
  },
  {
    id: "social_sharer_10",
    name: "Community Champion",
    description: "Share 10 typing results",
    icon: "Share2",
    category: "special",
    tier: "silver",
    points: 50,
    color: "cyan",
    requirement: { type: "shares", value: 10 },
  },
  {
    id: "social_influencer_25",
    name: "Typing Influencer",
    description: "Share 25 typing results",
    icon: "Share2",
    category: "special",
    tier: "gold",
    points: 100,
    color: "cyan",
    requirement: { type: "shares", value: 25 },
  },
];

export function getTierColor(tier: Badge["tier"]): string {
  switch (tier) {
    case "bronze":
      return "from-amber-600 to-amber-800";
    case "silver":
      return "from-slate-300 to-slate-500";
    case "gold":
      return "from-yellow-400 to-yellow-600";
    case "platinum":
      return "from-cyan-300 to-cyan-500";
    case "diamond":
      return "from-purple-400 to-pink-500";
  }
}

export function getTierBorder(tier: Badge["tier"]): string {
  switch (tier) {
    case "bronze":
      return "border-amber-600";
    case "silver":
      return "border-slate-400";
    case "gold":
      return "border-yellow-500";
    case "platinum":
      return "border-cyan-400";
    case "diamond":
      return "border-purple-400";
  }
}

export function getCategoryColor(category: Badge["category"]): string {
  switch (category) {
    case "speed":
      return "text-amber-500";
    case "accuracy":
      return "text-blue-500";
    case "consistency":
      return "text-green-500";
    case "streak":
      return "text-orange-500";
    case "special":
      return "text-purple-500";
  }
}

export interface UserBadgeProgress {
  badge: Badge;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  currentValue: number;
  requiredValue: number;
}

export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find(b => b.id === id);
}

export const TOTAL_BADGES = BADGES.length;
