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
      
      // Get all users who have daily reminders enabled
      // In a real implementation, you'd query the database for users who:
      // 1. Have push notifications enabled
      // 2. Have daily reminders enabled
      // 3. Haven't practiced today
      // 4. Current time matches their preferred reminder time
      
      // For now, this is a placeholder that would be implemented
      // with proper user queries and time zone handling
      
      console.log('[Scheduler] Daily reminder check completed');
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
      
      // Query users who:
      // 1. Have an active streak
      // 2. Haven't practiced today
      // 3. Have streak warnings enabled
      // 4. Less than 6 hours remaining until midnight
      
      // For each user, send a warning notification
      
      console.log('[Scheduler] Streak warning check completed');
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
        
        // Query all users who have weekly summaries enabled
        // Calculate their stats for the past week
        // Send summary notification
        
        console.log('[Scheduler] Weekly summaries sent');
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
