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
  getProgress?: (stats: UserStats) => number;
  target?: number;
  isSecret?: boolean;
}

export interface NearCompletionAchievement {
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

interface UserStats {
  totalTests: number;
  bestWpm: number;
  avgWpm: number;
  avgAccuracy: number;
  currentStreak: number;
  bestStreak: number;
  lastTestResult?: TestResult;
  totalShares?: number;
  testHour?: number;
  consecutivePerfectAccuracy?: number;
  testsCompletedToday?: number;
  best100WpmInFirst10Tests?: boolean;
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
      target: 30,
      check: (stats) => stats.bestWpm >= 30,
      getProgress: (stats) => Math.min(100, (stats.bestWpm / 30) * 100),
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
      target: 50,
      check: (stats) => stats.bestWpm >= 50,
      getProgress: (stats) => Math.min(100, (stats.bestWpm / 50) * 100),
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
      target: 80,
      check: (stats) => stats.bestWpm >= 80,
      getProgress: (stats) => Math.min(100, (stats.bestWpm / 80) * 100),
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
      target: 100,
      check: (stats) => stats.bestWpm >= 100,
      getProgress: (stats) => Math.min(100, (stats.bestWpm / 100) * 100),
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
      target: 120,
      check: (stats) => stats.bestWpm >= 120,
      getProgress: (stats) => Math.min(100, (stats.bestWpm / 120) * 100),
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
      target: 95,
      check: (stats) => stats.avgAccuracy >= 95,
      getProgress: (stats) => Math.min(100, (stats.avgAccuracy / 95) * 100),
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
      target: 98,
      check: (stats) => stats.avgAccuracy >= 98,
      getProgress: (stats) => Math.min(100, (stats.avgAccuracy / 98) * 100),
    },
    {
      key: 'accuracy_flawless_100',
      name: 'Flawless Typist',
      description: 'Achieve 100% accuracy in a single test',
      category: 'accuracy',
      tier: 'diamond',
      points: 250,
      icon: 'Target',
      color: 'blue',
      target: 100,
      check: (stats) => stats.lastTestResult?.accuracy === 100,
      getProgress: (stats) => stats.lastTestResult ? Math.min(100, stats.lastTestResult.accuracy) : stats.avgAccuracy,
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
      target: 7,
      check: (stats) => stats.currentStreak >= 7,
      getProgress: (stats) => Math.min(100, (stats.currentStreak / 7) * 100),
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
      target: 30,
      check: (stats) => stats.currentStreak >= 30,
      getProgress: (stats) => Math.min(100, (stats.currentStreak / 30) * 100),
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
      target: 100,
      check: (stats) => stats.currentStreak >= 100,
      getProgress: (stats) => Math.min(100, (stats.currentStreak / 100) * 100),
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
      target: 365,
      check: (stats) => stats.currentStreak >= 365,
      getProgress: (stats) => Math.min(100, (stats.currentStreak / 365) * 100),
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
      target: 10,
      check: (stats) => stats.totalTests >= 10,
      getProgress: (stats) => Math.min(100, (stats.totalTests / 10) * 100),
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
      target: 50,
      check: (stats) => stats.totalTests >= 50,
      getProgress: (stats) => Math.min(100, (stats.totalTests / 50) * 100),
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
      target: 100,
      check: (stats) => stats.totalTests >= 100,
      getProgress: (stats) => Math.min(100, (stats.totalTests / 100) * 100),
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
      target: 500,
      check: (stats) => stats.totalTests >= 500,
      getProgress: (stats) => Math.min(100, (stats.totalTests / 500) * 100),
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
      target: 1000,
      check: (stats) => stats.totalTests >= 1000,
      getProgress: (stats) => Math.min(100, (stats.totalTests / 1000) * 100),
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
      target: 1,
      check: (stats) => stats.totalTests >= 1,
      getProgress: (stats) => stats.totalTests >= 1 ? 100 : 0,
    },
    {
      key: 'special_speed_accuracy',
      name: 'Speed & Precision',
      description: 'Achieve 80 WPM with 95% accuracy in one test',
      category: 'special',
      tier: 'platinum',
      points: 200,
      icon: 'Award',
      color: 'purple',
      check: (stats) => stats.lastTestResult ? 
        stats.lastTestResult.wpm >= 80 && stats.lastTestResult.accuracy >= 95 : false,
      getProgress: (stats) => {
        if (!stats.lastTestResult) return 0;
        const speedProgress = Math.min(100, (stats.lastTestResult.wpm / 80) * 100);
        const accuracyProgress = Math.min(100, (stats.lastTestResult.accuracy / 95) * 100);
        return Math.min(speedProgress, accuracyProgress);
      },
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
      target: 1,
      check: (stats) => (stats.totalShares ?? 0) >= 1,
      getProgress: (stats) => (stats.totalShares ?? 0) >= 1 ? 100 : 0,
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
      target: 10,
      check: (stats) => (stats.totalShares ?? 0) >= 10,
      getProgress: (stats) => Math.min(100, ((stats.totalShares ?? 0) / 10) * 100),
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
      target: 25,
      check: (stats) => (stats.totalShares ?? 0) >= 25,
      getProgress: (stats) => Math.min(100, ((stats.totalShares ?? 0) / 25) * 100),
    },

    // Secret Achievements (hidden until unlocked)
    {
      key: 'secret_night_owl',
      name: 'Night Owl',
      description: 'Complete a test between midnight and 4 AM',
      category: 'special',
      tier: 'gold',
      points: 75,
      icon: 'Moon',
      color: 'indigo',
      isSecret: true,
      check: (stats) => {
        const hour = stats.testHour ?? -1;
        return hour >= 0 && hour < 4;
      },
    },
    {
      key: 'secret_early_bird',
      name: 'Early Bird',
      description: 'Complete a test between 5 AM and 7 AM',
      category: 'special',
      tier: 'gold',
      points: 75,
      icon: 'Sunrise',
      color: 'yellow',
      isSecret: true,
      check: (stats) => {
        const hour = stats.testHour ?? -1;
        return hour >= 5 && hour < 7;
      },
    },
    {
      key: 'secret_speed_demon',
      name: 'Speed Demon',
      description: 'Achieve 100+ WPM within your first 10 tests',
      category: 'special',
      tier: 'platinum',
      points: 150,
      icon: 'Rocket',
      color: 'red',
      isSecret: true,
      check: (stats) => stats.best100WpmInFirst10Tests === true,
    },
    {
      key: 'secret_perfectionist',
      name: 'Perfectionist',
      description: 'Get 100% accuracy 5 times in a row',
      category: 'special',
      tier: 'diamond',
      points: 200,
      icon: 'Sparkles',
      color: 'pink',
      isSecret: true,
      target: 5,
      check: (stats) => (stats.consecutivePerfectAccuracy ?? 0) >= 5,
      getProgress: (stats) => Math.min(100, ((stats.consecutivePerfectAccuracy ?? 0) / 5) * 100),
    },
    {
      key: 'secret_marathon_runner',
      name: 'Marathon Runner',
      description: 'Complete 10 tests in a single day',
      category: 'special',
      tier: 'gold',
      points: 100,
      icon: 'Timer',
      color: 'emerald',
      isSecret: true,
      target: 10,
      check: (stats) => (stats.testsCompletedToday ?? 0) >= 10,
      getProgress: (stats) => Math.min(100, ((stats.testsCompletedToday ?? 0) / 10) * 100),
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
            isSecret: achievement.isSecret ?? false,
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

      // Calculate extended stats for secret achievements
      const extendedStats = await this.calculateExtendedStats(userId, testResult);

      const userStats: UserStats = {
        totalTests: stats.totalTests,
        bestWpm: stats.bestWpm,
        avgWpm: stats.avgWpm,
        avgAccuracy: stats.avgAccuracy,
        currentStreak: badgeData?.currentStreak || 0,
        bestStreak: badgeData?.bestStreak || 0,
        lastTestResult: testResult,
        ...extendedStats,
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
   * Calculate extended stats for secret achievements
   */
  private async calculateExtendedStats(
    userId: string,
    testResult: TestResult
  ): Promise<{
    testHour: number;
    consecutivePerfectAccuracy: number;
    testsCompletedToday: number;
    best100WpmInFirst10Tests: boolean;
  }> {
    try {
      // Get hour from test result's createdAt
      const testDate = testResult.createdAt ? new Date(testResult.createdAt) : new Date();
      const testHour = testDate.getHours();

      // Get user's recent test results to calculate extended stats
      const recentTests = await this.storage.getUserTestResults(userId, 100);
      
      // Calculate consecutive perfect accuracy
      let consecutivePerfectAccuracy = 0;
      for (const test of recentTests) {
        if (test.accuracy === 100) {
          consecutivePerfectAccuracy++;
        } else {
          break;
        }
      }

      // Calculate tests completed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const testsCompletedToday = recentTests.filter(test => {
        const testDay = test.createdAt ? new Date(test.createdAt) : null;
        if (!testDay) return false;
        testDay.setHours(0, 0, 0, 0);
        return testDay.getTime() === today.getTime();
      }).length;

      // Check if achieved 100+ WPM in first 10 tests
      const userStats = await this.storage.getUserStats(userId);
      const totalTests = userStats?.totalTests ?? 0;
      let best100WpmInFirst10Tests = false;
      
      if (totalTests <= 10) {
        // Still in first 10 tests, check if any test hit 100+ WPM
        const first10Tests = recentTests.slice(0, 10);
        best100WpmInFirst10Tests = first10Tests.some(test => test.wpm >= 100);
      }

      return {
        testHour,
        consecutivePerfectAccuracy,
        testsCompletedToday,
        best100WpmInFirst10Tests,
      };
    } catch (error) {
      console.error('[Achievements] Extended stats error:', error);
      return {
        testHour: -1,
        consecutivePerfectAccuracy: 0,
        testsCompletedToday: 0,
        best100WpmInFirst10Tests: false,
      };
    }
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

  /**
   * Get achievements that are near completion (80%+ progress but not yet unlocked)
   * Used for "Almost There" motivational notifications
   * @param lastTestResult - Optional: include latest test result for fresh data
   */
  async getNearCompletionAchievements(
    userId: string,
    minProgress: number = 80,
    lastTestResult?: TestResult
  ): Promise<NearCompletionAchievement[]> {
    const nearCompletion: NearCompletionAchievement[] = [];
    
    try {
      const stats = await this.storage.getUserStats(userId);
      const badgeData = await this.storage.getUserBadgeData(userId);
      
      if (!stats) return nearCompletion;

      // Use the better of stored bestWpm or current test WPM for fresh progress calculation
      const effectiveBestWpm = lastTestResult 
        ? Math.max(stats.bestWpm, lastTestResult.wpm) 
        : stats.bestWpm;

      const userStats: UserStats = {
        totalTests: stats.totalTests,
        bestWpm: effectiveBestWpm,
        avgWpm: stats.avgWpm,
        avgAccuracy: stats.avgAccuracy,
        currentStreak: badgeData?.currentStreak || 0,
        bestStreak: badgeData?.bestStreak || 0,
        lastTestResult,
      };

      const userAchievements = await this.storage.getUserAchievements(userId);
      const unlockedKeys = new Set(userAchievements.map(ua => ua.achievement.key));

      for (const achievement of this.achievements) {
        if (unlockedKeys.has(achievement.key)) {
          continue;
        }

        if (!achievement.getProgress) {
          continue;
        }

        const progress = achievement.getProgress(userStats);
        
        if (progress >= minProgress && progress < 100) {
          let currentValue = 0;
          const targetValue = achievement.target || 0;
          
          if (achievement.category === 'speed') {
            currentValue = userStats.bestWpm;
          } else if (achievement.category === 'accuracy') {
            currentValue = Math.round(userStats.avgAccuracy);
          } else if (achievement.category === 'streak') {
            currentValue = userStats.currentStreak;
          } else if (achievement.category === 'consistency') {
            currentValue = userStats.totalTests;
          } else if (achievement.key.startsWith('social_')) {
            currentValue = userStats.totalShares || 0;
          } else if (achievement.key === 'special_speed_accuracy' && lastTestResult) {
            // For combo achievements, show progress as percentage
            currentValue = Math.round(progress);
          }

          nearCompletion.push({
            key: achievement.key,
            name: achievement.name,
            description: achievement.description,
            category: achievement.category,
            tier: achievement.tier,
            points: achievement.points,
            icon: achievement.icon,
            color: achievement.color,
            progress: Math.round(progress),
            currentValue: Math.max(0, Math.round(currentValue)),
            targetValue,
          });
        }
      }

      nearCompletion.sort((a, b) => b.progress - a.progress);

    } catch (error) {
      console.error('[Achievements] Near completion check error:', error);
    }
    
    return nearCompletion;
  }

  /**
   * Get the closest achievement to unlock for guidance
   */
  async getNextAchievementToUnlock(userId: string): Promise<NearCompletionAchievement | null> {
    try {
      const stats = await this.storage.getUserStats(userId);
      const badgeData = await this.storage.getUserBadgeData(userId);
      
      if (!stats) return null;

      const userStats: UserStats = {
        totalTests: stats.totalTests,
        bestWpm: stats.bestWpm,
        avgWpm: stats.avgWpm,
        avgAccuracy: stats.avgAccuracy,
        currentStreak: badgeData?.currentStreak || 0,
        bestStreak: badgeData?.bestStreak || 0,
      };

      const userAchievements = await this.storage.getUserAchievements(userId);
      const unlockedKeys = new Set(userAchievements.map(ua => ua.achievement.key));

      let closest: { achievement: AchievementCheck; progress: number; currentValue: number } | null = null;

      for (const achievement of this.achievements) {
        if (unlockedKeys.has(achievement.key)) {
          continue;
        }

        if (!achievement.getProgress) {
          continue;
        }

        const progress = achievement.getProgress(userStats);
        
        if (progress < 100 && (!closest || progress > closest.progress)) {
          let currentValue = 0;
          
          if (achievement.category === 'speed') {
            currentValue = userStats.bestWpm;
          } else if (achievement.category === 'accuracy') {
            currentValue = userStats.avgAccuracy;
          } else if (achievement.category === 'streak') {
            currentValue = userStats.currentStreak;
          } else if (achievement.category === 'consistency') {
            currentValue = userStats.totalTests;
          }

          closest = { achievement, progress, currentValue };
        }
      }

      if (!closest) return null;

      return {
        key: closest.achievement.key,
        name: closest.achievement.name,
        description: closest.achievement.description,
        category: closest.achievement.category,
        tier: closest.achievement.tier,
        points: closest.achievement.points,
        icon: closest.achievement.icon,
        color: closest.achievement.color,
        progress: Math.round(closest.progress),
        currentValue: Math.round(closest.currentValue),
        targetValue: closest.achievement.target || 0,
      };
    } catch (error) {
      console.error('[Achievements] Next achievement error:', error);
      return null;
    }
  }
}
