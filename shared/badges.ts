export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "speed" | "accuracy" | "consistency" | "milestone" | "streak";
  requirement: {
    type: "wpm" | "accuracy" | "testCount" | "streak" | "bestStreak";
    value: number;
  };
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const BADGES: Badge[] = [
  // Speed Badges
  {
    id: "speed_40",
    name: "Getting Started",
    description: "Reach 40 WPM",
    icon: "🏃",
    category: "speed",
    requirement: { type: "wpm", value: 40 },
    rarity: "common",
  },
  {
    id: "speed_60",
    name: "Speed Demon",
    description: "Reach 60 WPM",
    icon: "⚡",
    category: "speed",
    requirement: { type: "wpm", value: 60 },
    rarity: "rare",
  },
  {
    id: "speed_80",
    name: "Lightning Fingers",
    description: "Reach 80 WPM",
    icon: "🔥",
    category: "speed",
    requirement: { type: "wpm", value: 80 },
    rarity: "epic",
  },
  {
    id: "speed_100",
    name: "Typing Master",
    description: "Reach 100 WPM",
    icon: "👑",
    category: "speed",
    requirement: { type: "wpm", value: 100 },
    rarity: "legendary",
  },
  {
    id: "speed_120",
    name: "Superhuman",
    description: "Reach 120+ WPM",
    icon: "🚀",
    category: "speed",
    requirement: { type: "wpm", value: 120 },
    rarity: "legendary",
  },

  // Accuracy Badges
  {
    id: "accuracy_95",
    name: "Precision Typist",
    description: "Achieve 95% accuracy",
    icon: "🎯",
    category: "accuracy",
    requirement: { type: "accuracy", value: 95 },
    rarity: "common",
  },
  {
    id: "accuracy_98",
    name: "Near Perfect",
    description: "Achieve 98% accuracy",
    icon: "💎",
    category: "accuracy",
    requirement: { type: "accuracy", value: 98 },
    rarity: "rare",
  },
  {
    id: "accuracy_99",
    name: "Perfectionist",
    description: "Achieve 99%+ accuracy",
    icon: "✨",
    category: "accuracy",
    requirement: { type: "accuracy", value: 99 },
    rarity: "epic",
  },

  // Milestone Badges
  {
    id: "tests_10",
    name: "First Steps",
    description: "Complete 10 tests",
    icon: "🌱",
    category: "milestone",
    requirement: { type: "testCount", value: 10 },
    rarity: "common",
  },
  {
    id: "tests_50",
    name: "Dedicated",
    description: "Complete 50 tests",
    icon: "🌟",
    category: "milestone",
    requirement: { type: "testCount", value: 50 },
    rarity: "rare",
  },
  {
    id: "tests_100",
    name: "Centurion",
    description: "Complete 100 tests",
    icon: "🏆",
    category: "milestone",
    requirement: { type: "testCount", value: 100 },
    rarity: "epic",
  },
  {
    id: "tests_500",
    name: "Typing Legend",
    description: "Complete 500 tests",
    icon: "👾",
    category: "milestone",
    requirement: { type: "testCount", value: 500 },
    rarity: "legendary",
  },
  {
    id: "tests_1000",
    name: "Elite Typist",
    description: "Complete 1000 tests",
    icon: "🎖️",
    category: "milestone",
    requirement: { type: "testCount", value: 1000 },
    rarity: "legendary",
  },

  // Streak Badges
  {
    id: "streak_3",
    name: "On Fire",
    description: "3 day streak",
    icon: "🔥",
    category: "streak",
    requirement: { type: "streak", value: 3 },
    rarity: "common",
  },
  {
    id: "streak_7",
    name: "Committed",
    description: "7 day streak",
    icon: "📅",
    category: "streak",
    requirement: { type: "streak", value: 7 },
    rarity: "rare",
  },
  {
    id: "streak_30",
    name: "Unstoppable",
    description: "30 day streak",
    icon: "💪",
    category: "streak",
    requirement: { type: "streak", value: 30 },
    rarity: "epic",
  },
  {
    id: "streak_100",
    name: "Consistency King",
    description: "100 day streak",
    icon: "👑",
    category: "streak",
    requirement: { type: "bestStreak", value: 100 },
    rarity: "legendary",
  },
];

export function getRarityColor(rarity: Badge["rarity"]): string {
  switch (rarity) {
    case "common":
      return "from-slate-400 to-slate-600";
    case "rare":
      return "from-blue-400 to-blue-600";
    case "epic":
      return "from-purple-400 to-purple-600";
    case "legendary":
      return "from-amber-400 to-amber-600";
  }
}

export function getRarityBorder(rarity: Badge["rarity"]): string {
  switch (rarity) {
    case "common":
      return "border-slate-500";
    case "rare":
      return "border-blue-500";
    case "epic":
      return "border-purple-500";
    case "legendary":
      return "border-amber-500";
  }
}

export interface UserBadgeProgress {
  badge: Badge;
  unlocked: boolean;
  progress: number; // 0-100
  currentValue: number;
  requiredValue: number;
}
