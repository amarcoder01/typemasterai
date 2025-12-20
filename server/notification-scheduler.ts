import { DateTime } from 'luxon';
import type { IStorage } from './storage';
import { NotificationService } from './notification-service';
import { NotificationJobGenerator } from './notification-job-generator';
import type { NotificationJob } from '@shared/schema';

export class NotificationScheduler {
  private storage: IStorage;
  private notificationService: NotificationService;
  private jobGenerator: NotificationJobGenerator;
  private intervals: NodeJS.Timeout[] = [];
  private isProcessing = false;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.notificationService = new NotificationService(storage);
    this.jobGenerator = new NotificationJobGenerator(storage);
  }

  /**
   * Start all scheduled notification tasks
   */
  async start() {
    console.log('[Scheduler] Starting notification scheduler...');

    await this.initialJobGeneration();

    const tickInterval = setInterval(() => {
      this.processDueJobs().catch(console.error);
    }, 60 * 1000);
    this.intervals.push(tickInterval);

    const regenerationInterval = setInterval(() => {
      this.regenerateJobs().catch(console.error);
    }, 24 * 60 * 60 * 1000);
    this.intervals.push(regenerationInterval);

    const cleanupInterval = setInterval(() => {
      this.jobGenerator.cleanupOldJobs().catch(console.error);
    }, 6 * 60 * 60 * 1000);
    this.intervals.push(cleanupInterval);

    // Cleanup old notification history daily
    const historyCleanupInterval = setInterval(() => {
      this.cleanupNotificationHistory().catch(console.error);
    }, 24 * 60 * 60 * 1000);
    this.intervals.push(historyCleanupInterval);

    setTimeout(() => {
      this.processDueJobs().catch(console.error);
    }, 5000);

    console.log('[Scheduler] Notification scheduler started with minute-precision');
  }

  /**
   * Cleanup old notification history to prevent database bloat
   */
  private async cleanupNotificationHistory(): Promise<void> {
    try {
      const deleted = await this.storage.cleanupOldNotificationHistory(30); // Keep 30 days
      console.log(`[Scheduler] Cleaned up ${deleted} old notification history records`);
    } catch (error) {
      console.error('[Scheduler] Notification history cleanup failed:', error);
    }
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
   * Initial job generation on startup
   */
  private async initialJobGeneration() {
    try {
      console.log('[Scheduler] Running initial job generation...');
      await this.jobGenerator.regenerateAllJobs();
    } catch (error) {
      console.error('[Scheduler] Initial job generation failed:', error);
    }
  }

  /**
   * Process due notification jobs
   */
  private async processDueJobs() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const now = DateTime.utc().toJSDate();
      const batchSize = 100;

      const dueJobs = await this.storage.claimDueNotificationJobs(now, batchSize);

      if (dueJobs.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`[Scheduler] Processing ${dueJobs.length} due jobs`);

      const results = await Promise.allSettled(
        dueJobs.map(job => this.processJob(job))
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`[Scheduler] Job batch completed: ${succeeded} succeeded, ${failed} failed`);
    } catch (error) {
      console.error('[Scheduler] Error processing due jobs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single notification job
   */
  private async processJob(job: NotificationJob): Promise<void> {
    try {
      const meta = job.payloadMeta as Record<string, any> || {};

      switch (job.notificationType) {
        case 'daily_reminder': {
          const avgWpm = await this.storage.getUserAverageWpm(job.userId);
          await this.notificationService.sendDailyReminder(job.userId, {
            streak: meta.streak || 0,
            avgWpm: avgWpm || 0,
          });
          break;
        }

        case 'streak_warning': {
          const user = await this.storage.getUser(job.userId);
          if (!user) break;

          const userTimezone = meta.timezone || 'UTC';
          const nowUserZone = DateTime.now().setZone(userTimezone);

          if (user.lastTestDate) {
            const lastTestUserZone = DateTime.fromJSDate(user.lastTestDate).setZone(userTimezone);
            if (lastTestUserZone.hasSame(nowUserZone, 'day')) {
              break;
            }
          }

          const endOfDay = nowUserZone.endOf('day');
          const hoursLeft = Math.ceil(endOfDay.diff(nowUserZone, 'hours').hours);

          await this.notificationService.sendStreakWarning(
            job.userId,
            user.currentStreak || 0,
            hoursLeft
          );
          break;
        }

        case 'weekly_summary': {
          const weeklyStats = await this.storage.getWeeklySummaryStats(job.userId);

          if (weeklyStats.testsCompleted > 0) {
            await this.notificationService.sendWeeklySummary(job.userId, {
              testsCompleted: weeklyStats.testsCompleted,
              avgWpm: weeklyStats.avgWpm,
              avgAccuracy: weeklyStats.avgAccuracy,
              improvement: weeklyStats.improvement,
              rank: weeklyStats.rank,
            });
          }
          break;
        }

        case 'tip_of_the_day': {
          // Curated typing tips for daily motivation
          const tips = [
            { title: 'Home Row Foundation', content: 'Keep your fingers on ASDF and JKL; keys. Return to home position after each keystroke for consistent speed.', category: 'technique' },
            { title: 'Look at the Screen', content: 'Train yourself to look at the screen, not your keyboard. This builds muscle memory faster.', category: 'technique' },
            { title: 'Posture Matters', content: 'Sit up straight with elbows at 90°. Your wrists should float slightly above the keyboard.', category: 'posture' },
            { title: 'Accuracy Over Speed', content: 'Focus on accuracy first. Speed naturally follows as your muscle memory improves.', category: 'accuracy' },
            { title: 'Regular Breaks', content: 'Take a 5-minute break every 30 minutes to prevent fatigue and maintain peak performance.', category: 'practice' },
            { title: 'Warm Up Daily', content: 'Start each session with a slow, accuracy-focused warm-up before pushing for speed.', category: 'practice' },
            { title: 'Use All Fingers', content: 'Each finger has assigned keys. Using the correct finger builds faster, more reliable muscle memory.', category: 'technique' },
            { title: 'Rhythm is Key', content: 'Type with a steady rhythm rather than bursts. Consistent tempo reduces errors.', category: 'speed' },
            { title: 'Practice Weak Spots', content: 'Identify your problem keys and practice them specifically. Targeted practice shows faster improvement.', category: 'practice' },
            { title: 'Stay Relaxed', content: 'Tension slows you down. Keep your hands, arms, and shoulders relaxed while typing.', category: 'technique' },
            { title: 'Track Your Progress', content: 'Review your analytics regularly. Seeing improvement is motivating and helps identify areas to work on.', category: 'motivation' },
            { title: 'Challenge Yourself', content: 'Once comfortable, try harder modes like punctuation, numbers, or code typing to level up.', category: 'practice' },
          ];

          // Pick a tip based on the day to ensure variety
          const dayOfYear = DateTime.now().ordinal;
          const tipIndex = dayOfYear % tips.length;
          const tip = tips[tipIndex];

          await this.notificationService.sendTipOfTheDay(job.userId, tip);
          break;
        }

        default:
          throw new Error(`Unknown notification type: ${job.notificationType}`);
      }

      await this.storage.markJobCompleted(job.id);

      const nextJobTime = this.calculateNextJobTime(job);
      if (nextJobTime) {
        await this.storage.createNotificationJobs([{
          userId: job.userId,
          notificationType: job.notificationType,
          sendAtUtc: nextJobTime,
          status: 'pending',
          attemptCount: 0,
          payloadMeta: job.payloadMeta as any,
        }]);
      }
    } catch (error) {
      console.error(`[Scheduler] Failed to process job ${job.id}:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (job.attemptCount < 3) {
        const retryDelay = Math.pow(2, job.attemptCount) * 5;
        const retryTime = DateTime.utc().plus({ minutes: retryDelay }).toJSDate();
        await this.storage.rescheduleJob(job.id, retryTime);
      } else {
        await this.storage.markJobFailed(job.id, errorMessage);
      }

      throw error;
    }
  }

  /**
   * Calculate next job time for recurring notifications
   */
  private calculateNextJobTime(job: NotificationJob): Date | null {
    const meta = job.payloadMeta as Record<string, any> || {};
    const userTimezone = meta.timezone || 'UTC';

    switch (job.notificationType) {
      case 'daily_reminder': {
        const currentSendTime = DateTime.fromJSDate(job.sendAtUtc).setZone(userTimezone);
        return currentSendTime.plus({ days: 1 }).toUTC().toJSDate();
      }

      case 'streak_warning': {
        const currentSendTime = DateTime.fromJSDate(job.sendAtUtc).setZone(userTimezone);
        return currentSendTime.plus({ days: 1 }).toUTC().toJSDate();
      }

      case 'weekly_summary': {
        const currentSendTime = DateTime.fromJSDate(job.sendAtUtc).setZone(userTimezone);
        return currentSendTime.plus({ weeks: 1 }).toUTC().toJSDate();
      }

      case 'tip_of_the_day': {
        const currentSendTime = DateTime.fromJSDate(job.sendAtUtc).setZone(userTimezone);
        return currentSendTime.plus({ days: 1 }).toUTC().toJSDate();
      }

      default:
        return null;
    }
  }

  /**
   * Regenerate all notification jobs (run daily)
   */
  private async regenerateJobs() {
    try {
      console.log('[Scheduler] Running daily job regeneration...');
      await this.jobGenerator.regenerateAllJobs();
    } catch (error) {
      console.error('[Scheduler] Job regeneration failed:', error);
    }
  }

  /**
   * Legacy methods for backward compatibility (kept for achievements, challenges, etc.)
   */

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

  /**
   * Send personal record notification
   */
  async notifyPersonalRecord(
    userId: string,
    record: {
      wpm: number;
      previousBest: number;
      accuracy: number;
      mode: string;
    }
  ): Promise<void> {
    const shouldSend = await this.notificationService.shouldSendNotification(
      userId,
      'personal_record'
    );

    if (shouldSend) {
      await this.notificationService.sendPersonalRecord(userId, record);
    }
  }

  /**
   * Send streak milestone notification
   */
  async notifyStreakMilestone(
    userId: string,
    milestone: {
      streak: number;
      reward?: number;
    }
  ): Promise<void> {
    const shouldSend = await this.notificationService.shouldSendNotification(
      userId,
      'streak_milestone'
    );

    if (shouldSend) {
      await this.notificationService.sendStreakMilestone(userId, milestone);
    }
  }

  /**
   * Send race starting notification
   */
  async notifyRaceStarting(
    userId: string,
    race: {
      roomCode: string;
      startsIn: number;
      participants: number;
    }
  ): Promise<void> {
    const shouldSend = await this.notificationService.shouldSendNotification(
      userId,
      'race_starting'
    );

    if (shouldSend) {
      await this.notificationService.sendRaceStarting(userId, race);
    }
  }

  /**
   * Send tip of the day notification
   */
  async notifyTipOfTheDay(
    userId: string,
    tip: {
      title: string;
      content: string;
      category: string;
    }
  ): Promise<void> {
    const shouldSend = await this.notificationService.shouldSendNotification(
      userId,
      'tip_of_the_day'
    );

    if (shouldSend) {
      await this.notificationService.sendTipOfTheDay(userId, tip);
    }
  }
}
