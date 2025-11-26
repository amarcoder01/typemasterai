import type { IStorage } from './storage';
import { NotificationService } from './notification-service';

export class NotificationScheduler {
  private storage: IStorage;
  private notificationService: NotificationService;
  private intervals: NodeJS.Timeout[] = [];

  constructor(storage: IStorage) {
    this.storage = storage;
    this.notificationService = new NotificationService(storage);
  }

  /**
   * Start all scheduled notification tasks
   */
  start() {
    console.log('[Scheduler] Starting notification scheduler...');

    // Daily reminder checks (every hour)
    const dailyReminderInterval = setInterval(() => {
      this.checkDailyReminders().catch(console.error);
    }, 60 * 60 * 1000); // Every hour
    this.intervals.push(dailyReminderInterval);

    // Streak warning checks (every 2 hours)
    const streakWarningInterval = setInterval(() => {
      this.checkStreakWarnings().catch(console.error);
    }, 2 * 60 * 60 * 1000); // Every 2 hours
    this.intervals.push(streakWarningInterval);

    // Weekly summary (check once per hour, send on Sunday evening)
    const weeklySummaryInterval = setInterval(() => {
      this.checkWeeklySummaries().catch(console.error);
    }, 60 * 60 * 1000); // Every hour
    this.intervals.push(weeklySummaryInterval);

    // Run immediate check on startup
    setTimeout(() => {
      this.checkDailyReminders().catch(console.error);
      this.checkStreakWarnings().catch(console.error);
    }, 5000); // After 5 seconds

    console.log('[Scheduler] Notification scheduler started');
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    console.log('[Scheduler] Stopping notification scheduler...');
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }

  /**
   * Check and send daily practice reminders
   */
  private async checkDailyReminders() {
    try {
      console.log('[Scheduler] Checking daily reminders...');
      
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;
      
      // Query users who should receive daily reminders
      // This is a simplified version - in production, you'd want to handle timezones properly
      const eligibleUsers = await this.storage.getUsersForDailyReminders(currentHour);
      
      console.log(`[Scheduler] Found ${eligibleUsers.length} users eligible for daily reminders`);
      
      let sent = 0;
      for (const user of eligibleUsers) {
        try {
          const avgWpm = await this.storage.getUserAverageWpm(user.id);
          
          await this.notificationService.sendDailyReminder(user.id, {
            streak: user.currentStreak,
            avgWpm: avgWpm || 0,
          });
          sent++;
        } catch (error) {
          console.error(`[Scheduler] Failed to send daily reminder to user ${user.id}:`, error);
        }
      }
      
      console.log(`[Scheduler] Daily reminder check completed: ${sent}/${eligibleUsers.length} sent`);
    } catch (error) {
      console.error('[Scheduler] Daily reminder check error:', error);
    }
  }

  /**
   * Check and send streak warnings
   */
  private async checkStreakWarnings() {
    try {
      console.log('[Scheduler] Checking streak warnings...');
      
      const now = new Date();
      const currentHour = now.getHours();
      
      // Only send streak warnings in the evening (6PM-11PM)
      if (currentHour < 18 || currentHour > 23) {
        return;
      }
      
      // Query users at risk of losing their streak
      const usersAtRisk = await this.storage.getUsersWithStreakAtRisk();
      
      console.log(`[Scheduler] Found ${usersAtRisk.length} users at risk of losing streak`);
      
      let sent = 0;
      for (const user of usersAtRisk) {
        try {
          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999);
          const hoursLeft = Math.ceil((endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60));
          
          await this.notificationService.sendStreakWarning(
            user.id, 
            user.currentStreak || 0,
            hoursLeft
          );
          sent++;
        } catch (error) {
          console.error(`[Scheduler] Failed to send streak warning to user ${user.id}:`, error);
        }
      }
      
      console.log(`[Scheduler] Streak warning check completed: ${sent}/${usersAtRisk.length} sent`);
    } catch (error) {
      console.error('[Scheduler] Streak warning check error:', error);
    }
  }

  /**
   * Check and send weekly summaries
   */
  private async checkWeeklySummaries() {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday
      const hour = now.getHours();

      // Send weekly summaries on Sunday evening (8 PM)
      if (dayOfWeek === 0 && hour === 20) {
        console.log('[Scheduler] Sending weekly summaries...');
        
        // Get all users who have weekly summaries enabled
        const eligibleUsers = await this.storage.getUsersForWeeklySummary();
        
        console.log(`[Scheduler] Sending weekly summaries to ${eligibleUsers.length} users`);
        
        let sent = 0;
        for (const user of eligibleUsers) {
          try {
            // Get user's weekly stats from the last 7 days
            const weeklyStats = await this.storage.getWeeklySummaryStats(user.id);
            
            if (weeklyStats.testsCompleted > 0) {
              await this.notificationService.sendWeeklySummary(user.id, {
                testsCompleted: weeklyStats.testsCompleted,
                avgWpm: weeklyStats.avgWpm,
                avgAccuracy: weeklyStats.avgAccuracy,
                improvement: weeklyStats.improvement,
                rank: weeklyStats.rank,
              });
              sent++;
            }
          } catch (error) {
            console.error(`[Scheduler] Failed to send weekly summary to user ${user.id}:`, error);
          }
        }
        
        console.log(`[Scheduler] Weekly summaries sent: ${sent}/${eligibleUsers.length} completed`);
      }
    } catch (error) {
      console.error('[Scheduler] Weekly summary check error:', error);
    }
  }

  /**
   * Send achievement unlock notification
   */
  async notifyAchievementUnlock(
    userId: string,
    achievement: {
      name: string;
      description: string;
      tier: string;
      points: number;
      icon: string;
    }
  ): Promise<void> {
    const shouldSend = await this.notificationService.shouldSendNotification(
      userId,
      'achievement_unlock'
    );

    if (shouldSend) {
      await this.notificationService.sendAchievementUnlock(userId, achievement);
    }
  }

  /**
   * Send challenge notification
   */
  async notifyChallengeUpdate(
    userId: string,
    challenge: {
      title: string;
      description: string;
      type: 'started' | 'progress' | 'completed';
      progress?: number;
      target?: number;
      reward?: number;
    }
  ): Promise<void> {
    const notificationType = `challenge_${challenge.type}`;
    const shouldSend = await this.notificationService.shouldSendNotification(
      userId,
      notificationType
    );

    if (shouldSend) {
      await this.notificationService.sendChallengeNotification(userId, challenge);
    }
  }

  /**
   * Send leaderboard update notification
   */
  async notifyLeaderboardUpdate(
    userId: string,
    update: {
      category: string;
      oldRank: number;
      newRank: number;
      totalUsers: number;
    }
  ): Promise<void> {
    // Only notify for rank improvements
    if (update.newRank >= update.oldRank) {
      return;
    }

    const shouldSend = await this.notificationService.shouldSendNotification(
      userId,
      'leaderboard_update'
    );

    if (shouldSend) {
      await this.notificationService.sendLeaderboardUpdate(userId, update);
    }
  }

  /**
   * Send race invite notification
   */
  async notifyRaceInvite(
    userId: string,
    invite: {
      inviterName: string;
      roomCode: string;
      mode: string;
    }
  ): Promise<void> {
    const shouldSend = await this.notificationService.shouldSendNotification(
      userId,
      'race_invite'
    );

    if (shouldSend) {
      await this.notificationService.sendRaceInvite(userId, invite);
    }
  }
}
