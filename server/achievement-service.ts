import type { IStorage } from './storage';
import type { NotificationScheduler } from './notification-scheduler';
import type { TestResult, Achievement } from '@shared/schema';
import { BADGES, type Badge } from '@shared/badges';

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

/**
 * Build AchievementCheck array from shared BADGES definitions
 * This ensures frontend and backend use a single source of truth
 */
function buildAchievementChecks(): AchievementCheck[] {
  return BADGES.map((badge: Badge): AchievementCheck => {
    const { id, name, description, icon, category, tier, points, color, requirement, isSecret } = badge;
    
    let check: (stats: UserStats) => boolean;
    let getProgress: ((stats: UserStats) => number) | undefined;
    let target: number | undefined = requirement.value > 0 ? requirement.value : undefined;
    
    switch (requirement.type) {
      case 'wpm':
        check = (stats) => stats.bestWpm >= requirement.value;
        getProgress = (stats) => Math.min(100, (stats.bestWpm / requirement.value) * 100);
        break;
        
      case 'accuracy':
        if (id === 'accuracy_flawless_100') {
          check = (stats) => stats.lastTestResult?.accuracy === 100;
          getProgress = (stats) => stats.lastTestResult ? Math.min(100, stats.lastTestResult.accuracy) : stats.avgAccuracy;
        } else {
          check = (stats) => stats.avgAccuracy >= requirement.value;
          getProgress = (stats) => Math.min(100, (stats.avgAccuracy / requirement.value) * 100);
        }
        break;
        
      case 'testCount':
        check = (stats) => stats.totalTests >= requirement.value;
        getProgress = requirement.value === 1 
          ? (stats) => stats.totalTests >= 1 ? 100 : 0
          : (stats) => Math.min(100, (stats.totalTests / requirement.value) * 100);
        break;
        
      case 'streak':
        check = (stats) => stats.currentStreak >= requirement.value;
        getProgress = (stats) => Math.min(100, (stats.currentStreak / requirement.value) * 100);
        break;
        
      case 'shares':
        check = (stats) => (stats.totalShares ?? 0) >= requirement.value;
        getProgress = requirement.value === 1
          ? (stats) => (stats.totalShares ?? 0) >= 1 ? 100 : 0
          : (stats) => Math.min(100, ((stats.totalShares ?? 0) / requirement.value) * 100);
        break;
        
      case 'special':
        if (id === 'special_speed_accuracy') {
          check = (stats) => stats.lastTestResult ? 
            stats.lastTestResult.wpm >= 80 && stats.lastTestResult.accuracy >= 95 : false;
          getProgress = (stats) => {
            if (!stats.lastTestResult) return 0;
            const speedProgress = Math.min(100, (stats.lastTestResult.wpm / 80) * 100);
            const accuracyProgress = Math.min(100, (stats.lastTestResult.accuracy / 95) * 100);
            return Math.min(speedProgress, accuracyProgress);
          };
        } else {
          check = () => false;
        }
        break;
        
      case 'secret':
        switch (id) {
          case 'secret_night_owl':
            check = (stats) => {
              const hour = stats.testHour ?? -1;
              return hour >= 0 && hour < 4;
            };
            break;
          case 'secret_early_bird':
            check = (stats) => {
              const hour = stats.testHour ?? -1;
              return hour >= 5 && hour < 7;
            };
            break;
          case 'secret_speed_demon':
            check = (stats) => stats.best100WpmInFirst10Tests === true;
            break;
          case 'secret_perfectionist':
            target = 5;
            check = (stats) => (stats.consecutivePerfectAccuracy ?? 0) >= 5;
            getProgress = (stats) => Math.min(100, ((stats.consecutivePerfectAccuracy ?? 0) / 5) * 100);
            break;
          case 'secret_marathon_runner':
            target = 10;
            check = (stats) => (stats.testsCompletedToday ?? 0) >= 10;
            getProgress = (stats) => Math.min(100, ((stats.testsCompletedToday ?? 0) / 10) * 100);
            break;
          default:
            check = () => false;
        }
        break;
        
      default:
        check = () => false;
    }
    
    return {
      key: id,
      name,
      description,
      category,
      tier,
      points,
      icon,
      color,
      check,
      getProgress,
      target,
      isSecret,
    };
  });
}

export class AchievementService {
  private storage: IStorage;
  private notificationScheduler?: NotificationScheduler;
  
  private achievements: AchievementCheck[] = buildAchievementChecks();

  constructor(storage: IStorage, notificationScheduler?: NotificationScheduler) {
    this.storage = storage;
    this.notificationScheduler = notificationScheduler;
  }

  /**
   * Initialize achievement system by seeding achievements in database
   * @throws Error if critical initialization fails
   */
  async initializeAchievements(): Promise<void> {
    console.log('[Achievements] Initializing achievement system...');
    let created = 0;
    let existing = 0;
    const errors: Array<{ key: string; error: unknown }> = [];
    
    for (const achievement of this.achievements) {
      try {
        const existingAchievement = await this.storage.getAchievementByKey(achievement.key);
        
        if (!existingAchievement) {
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
          created++;
        } else {
          existing++;
        }
      } catch (error) {
        errors.push({ key: achievement.key, error });
        console.error(`[Achievements] Failed to initialize achievement ${achievement.key}:`, error);
      }
    }
    
    console.log(`[Achievements] Achievement system initialized: ${created} created, ${existing} existing, ${errors.length} errors`);
    
    if (errors.length > 0) {
      console.error(`[Achievements] Failed achievements: ${errors.map(e => e.key).join(', ')}`);
      if (errors.length === this.achievements.length) {
        throw new Error('Achievement system initialization completely failed - no achievements could be created');
      }
    }
  }

  /**
   * Check for new achievement unlocks after a test
   * Returns an array of newly unlocked achievements for celebration UI
   */
  async checkAchievements(userId: string, testResult: TestResult): Promise<AchievementCheck[]> {
    const newlyUnlocked: AchievementCheck[] = [];
    const errors: Array<{ achievement: string; error: unknown }> = [];
    
    try {
      // Get user stats
      const stats = await this.storage.getUserStats(userId);
      const badgeData = await this.storage.getUserBadgeData(userId);
      
      if (!stats) {
        console.warn(`[Achievements] No stats found for user ${userId}, skipping achievement check`);
        return newlyUnlocked;
      }

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
        try {
          if (achievement.check(userStats)) {
            await this.unlockAchievement(userId, achievement, testResult.id);
            newlyUnlocked.push(achievement);
          }
        } catch (unlockError) {
          errors.push({ achievement: achievement.key, error: unlockError });
          console.error(`[Achievements] Failed to unlock ${achievement.key} for user ${userId}:`, unlockError);
        }
      }

      // Log summary of any errors that occurred during unlock attempts
      if (errors.length > 0) {
        console.error(`[Achievements] ${errors.length} unlock error(s) for user ${userId}:`, 
          errors.map(e => e.achievement).join(', '));
      }
    } catch (error) {
      console.error(`[Achievements] Critical error checking achievements for user ${userId}, testResult ${testResult.id}:`, error);
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
      // Get user's timezone for accurate time-based achievements
      const user = await this.storage.getUser(userId);
      const userTimezone = user?.timezone || 'UTC';
      
      // Get hour from test result's createdAt in user's timezone
      const testDate = testResult.createdAt ? new Date(testResult.createdAt) : new Date();
      const hourFormatter = new Intl.DateTimeFormat('en-US', { 
        timeZone: userTimezone, 
        hour: 'numeric', 
        hour12: false 
      });
      const testHour = parseInt(hourFormatter.format(testDate), 10);

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

      // Calculate tests completed today in user's timezone
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const todayStr = dateFormatter.format(new Date());
      const testsCompletedToday = recentTests.filter(test => {
        const testDay = test.createdAt ? new Date(test.createdAt) : null;
        if (!testDay) return false;
        const testDayStr = dateFormatter.format(testDay);
        return testDayStr === todayStr;
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
      console.error(`[Achievements] Failed to calculate extended stats for user ${userId}, testResult ${testResult.id}:`, error);
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
    const errors: Array<{ achievement: string; error: unknown }> = [];
    
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

        try {
          if (achievement.check(userStats)) {
            await this.unlockAchievement(userId, achievement, 0);
          }
        } catch (unlockError) {
          errors.push({ achievement: achievement.key, error: unlockError });
          console.error(`[Achievements] Failed to unlock social achievement ${achievement.key} for user ${userId}:`, unlockError);
        }
      }

      if (errors.length > 0) {
        console.error(`[Achievements] ${errors.length} social unlock error(s) for user ${userId}:`, 
          errors.map(e => e.achievement).join(', '));
      }
    } catch (error) {
      console.error(`[Achievements] Critical error checking social achievements for user ${userId}:`, error);
    }
  }

  /**
   * Unlock an achievement for a user
   * @throws Error if the unlock fails - caller should handle this
   */
  private async unlockAchievement(
    userId: string,
    achievement: AchievementCheck,
    testResultId: number
  ): Promise<void> {
    // Get achievement from database
    const dbAchievement = await this.storage.getAchievementByKey(achievement.key);
    if (!dbAchievement) {
      throw new Error(`Achievement ${achievement.key} not found in database - ensure initializeAchievements() was called`);
    }

    // Unlock the achievement
    await this.storage.unlockAchievement(userId, dbAchievement.id, testResultId);
    console.log(`[Achievements] Unlocked ${achievement.name} for user ${userId}`);

    // Update gamification profile
    try {
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
    } catch (gamificationError) {
      // Gamification update failure is non-critical - achievement was still unlocked
      console.error(`[Achievements] Failed to update gamification for user ${userId} after unlocking ${achievement.key}:`, gamificationError);
    }

    // Send notification (non-critical)
    try {
      if (this.notificationScheduler) {
        await this.notificationScheduler.notifyAchievementUnlock(userId, {
          name: achievement.name,
          description: achievement.description,
          tier: achievement.tier,
          points: achievement.points,
          icon: achievement.icon,
        });
      }
    } catch (notificationError) {
      console.error(`[Achievements] Failed to send notification for ${achievement.key} to user ${userId}:`, notificationError);
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
