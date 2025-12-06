import type { IStorage } from './storage';
import type { NotificationScheduler } from './notification-scheduler';
import type { TestResult, Achievement } from '@shared/schema';

interface AchievementCheck {
  key: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  points: number;
  icon: string;
  color: string;
  check: (stats: UserStats) => boolean;
}

interface UserStats {
  totalTests: number;
  bestWpm: number;
  avgWpm: number;
  avgAccuracy: number;
  currentStreak: number;
  bestStreak: number;
  lastTestResult?: TestResult;
  totalShares?: number;
}

export class AchievementService {
  private storage: IStorage;
  private notificationScheduler?: NotificationScheduler;
  
  // Achievement definitions
  private achievements: AchievementCheck[] = [
    // Speed Achievements
    {
      key: 'speed_rookie_30',
      name: 'Speed Rookie',
      description: 'Reach 30 WPM',
      category: 'speed',
      tier: 'bronze',
      points: 10,
      icon: 'Zap',
      color: 'amber',
      check: (stats) => stats.bestWpm >= 30,
    },
    {
      key: 'speed_novice_50',
      name: 'Speed Novice',
      description: 'Reach 50 WPM',
      category: 'speed',
      tier: 'silver',
      points: 25,
      icon: 'Zap',
      color: 'amber',
      check: (stats) => stats.bestWpm >= 50,
    },
    {
      key: 'speed_expert_80',
      name: 'Speed Expert',
      description: 'Reach 80 WPM',
      category: 'speed',
      tier: 'gold',
      points: 50,
      icon: 'Zap',
      color: 'amber',
      check: (stats) => stats.bestWpm >= 80,
    },
    {
      key: 'speed_master_100',
      name: 'Speed Master',
      description: 'Reach 100 WPM',
      category: 'speed',
      tier: 'platinum',
      points: 100,
      icon: 'Zap',
      color: 'amber',
      check: (stats) => stats.bestWpm >= 100,
    },
    {
      key: 'speed_legend_120',
      name: 'Speed Legend',
      description: 'Reach 120 WPM',
      category: 'speed',
      tier: 'diamond',
      points: 200,
      icon: 'Zap',
      color: 'amber',
      check: (stats) => stats.bestWpm >= 120,
    },

    // Accuracy Achievements
    {
      key: 'accuracy_precise_95',
      name: 'Precision Seeker',
      description: 'Achieve 95% accuracy',
      category: 'accuracy',
      tier: 'bronze',
      points: 15,
      icon: 'Target',
      color: 'blue',
      check: (stats) => stats.avgAccuracy >= 95,
    },
    {
      key: 'accuracy_perfect_98',
      name: 'Near Perfect',
      description: 'Achieve 98% accuracy',
      category: 'accuracy',
      tier: 'gold',
      points: 75,
      icon: 'Target',
      color: 'blue',
      check: (stats) => stats.avgAccuracy >= 98,
    },
    {
      key: 'accuracy_flawless_100',
      name: 'Flawless Typist',
      description: 'Achieve 100% accuracy',
      category: 'accuracy',
      tier: 'diamond',
      points: 250,
      icon: 'Target',
      color: 'blue',
      check: (stats) => stats.lastTestResult?.accuracy === 100,
    },

    // Streak Achievements
    {
      key: 'streak_committed_7',
      name: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      category: 'streak',
      tier: 'bronze',
      points: 20,
      icon: 'Flame',
      color: 'orange',
      check: (stats) => stats.currentStreak >= 7,
    },
    {
      key: 'streak_dedicated_30',
      name: 'Monthly Dedication',
      description: 'Maintain a 30-day streak',
      category: 'streak',
      tier: 'silver',
      points: 50,
      icon: 'Flame',
      color: 'orange',
      check: (stats) => stats.currentStreak >= 30,
    },
    {
      key: 'streak_master_100',
      name: 'Streak Master',
      description: 'Maintain a 100-day streak',
      category: 'streak',
      tier: 'gold',
      points: 150,
      icon: 'Flame',
      color: 'orange',
      check: (stats) => stats.currentStreak >= 100,
    },
    {
      key: 'streak_legend_365',
      name: 'Year-Long Dedication',
      description: 'Maintain a 365-day streak',
      category: 'streak',
      tier: 'diamond',
      points: 500,
      icon: 'Flame',
      color: 'orange',
      check: (stats) => stats.currentStreak >= 365,
    },

    // Consistency Achievements
    {
      key: 'consistency_beginner_10',
      name: 'Getting Started',
      description: 'Complete 10 tests',
      category: 'consistency',
      tier: 'bronze',
      points: 10,
      icon: 'TrendingUp',
      color: 'green',
      check: (stats) => stats.totalTests >= 10,
    },
    {
      key: 'consistency_regular_50',
      name: 'Regular Typist',
      description: 'Complete 50 tests',
      category: 'consistency',
      tier: 'silver',
      points: 25,
      icon: 'TrendingUp',
      color: 'green',
      check: (stats) => stats.totalTests >= 50,
    },
    {
      key: 'consistency_dedicated_100',
      name: 'Dedicated Practitioner',
      description: 'Complete 100 tests',
      category: 'consistency',
      tier: 'gold',
      points: 50,
      icon: 'TrendingUp',
      color: 'green',
      check: (stats) => stats.totalTests >= 100,
    },
    {
      key: 'consistency_veteran_500',
      name: 'Typing Veteran',
      description: 'Complete 500 tests',
      category: 'consistency',
      tier: 'platinum',
      points: 150,
      icon: 'TrendingUp',
      color: 'green',
      check: (stats) => stats.totalTests >= 500,
    },
    {
      key: 'consistency_master_1000',
      name: 'Typing Master',
      description: 'Complete 1000 tests',
      category: 'consistency',
      tier: 'diamond',
      points: 300,
      icon: 'TrendingUp',
      color: 'green',
      check: (stats) => stats.totalTests >= 1000,
    },

    // Special Achievements
    {
      key: 'special_first_test',
      name: 'First Steps',
      description: 'Complete your first typing test',
      category: 'special',
      tier: 'bronze',
      points: 5,
      icon: 'Star',
      color: 'purple',
      check: (stats) => stats.totalTests >= 1,
    },
    {
      key: 'special_speed_accuracy',
      name: 'Speed & Precision',
      description: 'Achieve 80 WPM with 95% accuracy',
      category: 'special',
      tier: 'platinum',
      points: 200,
      icon: 'Award',
      color: 'purple',
      check: (stats) => stats.lastTestResult ? 
        stats.lastTestResult.wpm >= 80 && stats.lastTestResult.accuracy >= 95 : false,
    },

    // Social Sharing Achievements
    {
      key: 'social_first_share',
      name: 'Social Butterfly',
      description: 'Share your first typing result',
      category: 'special',
      tier: 'bronze',
      points: 15,
      icon: 'Share2',
      color: 'cyan',
      check: (stats) => (stats.totalShares ?? 0) >= 1,
    },
    {
      key: 'social_sharer_10',
      name: 'Community Champion',
      description: 'Share 10 typing results',
      category: 'special',
      tier: 'silver',
      points: 50,
      icon: 'Share2',
      color: 'cyan',
      check: (stats) => (stats.totalShares ?? 0) >= 10,
    },
    {
      key: 'social_influencer_25',
      name: 'Typing Influencer',
      description: 'Share 25 typing results',
      category: 'special',
      tier: 'gold',
      points: 100,
      icon: 'Share2',
      color: 'cyan',
      check: (stats) => (stats.totalShares ?? 0) >= 25,
    },
  ];

  constructor(storage: IStorage, notificationScheduler?: NotificationScheduler) {
    this.storage = storage;
    this.notificationScheduler = notificationScheduler;
  }

  /**
   * Initialize achievement system by seeding achievements in database
   */
  async initializeAchievements(): Promise<void> {
    try {
      console.log('[Achievements] Initializing achievement system...');
      
      for (const achievement of this.achievements) {
        const existing = await this.storage.getAchievementByKey(achievement.key);
        
        if (!existing) {
          await this.storage.createAchievement({
            key: achievement.key,
            name: achievement.name,
            description: achievement.description,
            category: achievement.category,
            tier: achievement.tier,
            requirement: { type: 'custom', check: achievement.key },
            points: achievement.points,
            icon: achievement.icon,
            color: achievement.color,
            isSecret: false,
            isActive: true,
          });
        }
      }
      
      console.log('[Achievements] Achievement system initialized');
    } catch (error) {
      console.error('[Achievements] Initialization error:', error);
    }
  }

  /**
   * Check for new achievement unlocks after a test
   * Returns an array of newly unlocked achievements for celebration UI
   */
  async checkAchievements(userId: string, testResult: TestResult): Promise<AchievementCheck[]> {
    const newlyUnlocked: AchievementCheck[] = [];
    
    try {
      // Get user stats
      const stats = await this.storage.getUserStats(userId);
      const badgeData = await this.storage.getUserBadgeData(userId);
      
      if (!stats) return newlyUnlocked;

      const userStats: UserStats = {
        totalTests: stats.totalTests,
        bestWpm: stats.bestWpm,
        avgWpm: stats.avgWpm,
        avgAccuracy: stats.avgAccuracy,
        currentStreak: badgeData?.currentStreak || 0,
        bestStreak: badgeData?.bestStreak || 0,
        lastTestResult: testResult,
      };

      // Get user's existing achievements
      const userAchievements = await this.storage.getUserAchievements(userId);
      const unlockedKeys = new Set(userAchievements.map(ua => ua.achievement.key));

      // Check each achievement
      for (const achievement of this.achievements) {
        // Skip if already unlocked
        if (unlockedKeys.has(achievement.key)) {
          continue;
        }

        // Check if user qualifies for this achievement
        if (achievement.check(userStats)) {
          await this.unlockAchievement(userId, achievement, testResult.id);
          newlyUnlocked.push(achievement);
        }
      }
    } catch (error) {
      console.error('[Achievements] Check error:', error);
    }
    
    return newlyUnlocked;
  }

  /**
   * Check for social sharing achievements
   */
  async checkSocialAchievements(userId: string, totalShares: number): Promise<void> {
    try {
      const userStats: UserStats = {
        totalTests: 0,
        bestWpm: 0,
        avgWpm: 0,
        avgAccuracy: 0,
        currentStreak: 0,
        bestStreak: 0,
        totalShares: totalShares,
      };

      // Get user's existing achievements
      const userAchievements = await this.storage.getUserAchievements(userId);
      const unlockedKeys = new Set(userAchievements.map(ua => ua.achievement.key));

      // Check only social achievements
      const socialAchievements = this.achievements.filter(a => a.key.startsWith('social_'));
      
      for (const achievement of socialAchievements) {
        if (unlockedKeys.has(achievement.key)) {
          continue;
        }

        if (achievement.check(userStats)) {
          await this.unlockAchievement(userId, achievement, 0);
        }
      }
    } catch (error) {
      console.error('[Achievements] Social check error:', error);
    }
  }

  /**
   * Unlock an achievement for a user
   */
  private async unlockAchievement(
    userId: string,
    achievement: AchievementCheck,
    testResultId: number
  ): Promise<void> {
    try {
      // Get achievement from database
      const dbAchievement = await this.storage.getAchievementByKey(achievement.key);
      if (!dbAchievement) {
        console.error(`[Achievements] Achievement ${achievement.key} not found in database`);
        return;
      }

      // Unlock the achievement
      await this.storage.unlockAchievement(userId, dbAchievement.id, testResultId);
      console.log(`[Achievements] Unlocked ${achievement.name} for user ${userId}`);

      // Update gamification profile
      let gamification = await this.storage.getUserGamification(userId);
      if (!gamification) {
        gamification = await this.storage.createUserGamification({
          userId,
          totalPoints: 0,
          level: 1,
          experiencePoints: 0,
          totalAchievements: 0,
          totalChallengesCompleted: 0,
        });
      }

      // Add points and XP
      const newPoints = gamification.totalPoints + achievement.points;
      const newXP = gamification.experiencePoints + achievement.points;
      const newAchievementCount = gamification.totalAchievements + 1;
      
      // Calculate level (100 XP per level)
      const newLevel = Math.floor(newXP / 100) + 1;

      await this.storage.updateUserGamification(userId, {
        totalPoints: newPoints,
        experiencePoints: newXP,
        level: newLevel,
        totalAchievements: newAchievementCount,
      });

      // Send notification
      if (this.notificationScheduler) {
        await this.notificationScheduler.notifyAchievementUnlock(userId, {
          name: achievement.name,
          description: achievement.description,
          tier: achievement.tier,
          points: achievement.points,
          icon: achievement.icon,
        });
      }
    } catch (error) {
      console.error('[Achievements] Unlock error:', error);
    }
  }
}
