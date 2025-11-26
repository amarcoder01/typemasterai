import { DateTime } from 'luxon';
import type { IStorage } from './storage';
import type { InsertNotificationJob } from '@shared/schema';

export class NotificationJobGenerator {
  constructor(private storage: IStorage) {}

  async generateDailyReminderJobs(): Promise<number> {
    let totalGenerated = 0;
    let offset = 0;
    const batchSize = 200;

    while (true) {
      const userBatch = await this.storage.getUsersWithNotificationPreferences(
        'daily_reminder',
        offset,
        batchSize
      );

      if (userBatch.length === 0) break;

      const jobs: InsertNotificationJob[] = [];
      const now = DateTime.utc();

      for (const { user, preferences } of userBatch) {
        if (!preferences.dailyReminderTime) continue;

        const [hours, minutes] = preferences.dailyReminderTime.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) continue;

        const userTimezone = user.timezone || 'UTC';
        let nextSend = DateTime.now()
          .setZone(userTimezone)
          .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

        if (nextSend <= now) {
          nextSend = nextSend.plus({ days: 1 });
        }

        jobs.push({
          userId: user.id,
          notificationType: 'daily_reminder',
          sendAtUtc: nextSend.toUTC().toJSDate(),
          status: 'pending',
          attemptCount: 0,
          payloadMeta: {
            streak: user.currentStreak,
            username: user.username,
            timezone: userTimezone,
          },
        });
      }

      if (jobs.length > 0) {
        await this.storage.createNotificationJobs(jobs);
        totalGenerated += jobs.length;
      }

      offset += batchSize;
      if (userBatch.length < batchSize) break;
    }

    return totalGenerated;
  }

  async generateStreakWarningJobs(): Promise<number> {
    let totalGenerated = 0;
    let offset = 0;
    const batchSize = 200;

    while (true) {
      const userBatch = await this.storage.getUsersWithNotificationPreferences(
        'streak_warning',
        offset,
        batchSize
      );

      if (userBatch.length === 0) break;

      const jobs: InsertNotificationJob[] = [];
      const now = DateTime.utc();

      for (const { user } of userBatch) {
        if (user.currentStreak === 0) continue;

        const todayStart = await this.getUserTestsToday(user.id);
        if (todayStart) continue;

        const userTimezone = user.timezone || 'UTC';
        let nextSend = DateTime.now()
          .setZone(userTimezone)
          .set({ hour: 18, minute: 0, second: 0, millisecond: 0 });

        if (nextSend <= now) {
          nextSend = nextSend.plus({ days: 1 });
        }

        jobs.push({
          userId: user.id,
          notificationType: 'streak_warning',
          sendAtUtc: nextSend.toUTC().toJSDate(),
          status: 'pending',
          attemptCount: 0,
          payloadMeta: {
            streak: user.currentStreak,
            username: user.username,
            timezone: userTimezone,
          },
        });
      }

      if (jobs.length > 0) {
        await this.storage.createNotificationJobs(jobs);
        totalGenerated += jobs.length;
      }

      offset += batchSize;
      if (userBatch.length < batchSize) break;
    }

    return totalGenerated;
  }

  async generateWeeklySummaryJobs(): Promise<number> {
    let totalGenerated = 0;
    let offset = 0;
    const batchSize = 200;

    while (true) {
      const userBatch = await this.storage.getUsersWithNotificationPreferences(
        'weekly_summary',
        offset,
        batchSize
      );

      if (userBatch.length === 0) break;

      const jobs: InsertNotificationJob[] = [];
      const now = DateTime.utc();

      for (const { user } of userBatch) {
        const userTimezone = user.timezone || 'UTC';
        let nextSunday = DateTime.now()
          .setZone(userTimezone)
          .set({ weekday: 7, hour: 19, minute: 0, second: 0, millisecond: 0 });

        if (nextSunday <= now) {
          nextSunday = nextSunday.plus({ weeks: 1 });
        }

        jobs.push({
          userId: user.id,
          notificationType: 'weekly_summary',
          sendAtUtc: nextSunday.toUTC().toJSDate(),
          status: 'pending',
          attemptCount: 0,
          payloadMeta: {
            username: user.username,
            timezone: userTimezone,
          },
        });
      }

      if (jobs.length > 0) {
        await this.storage.createNotificationJobs(jobs);
        totalGenerated += jobs.length;
      }

      offset += batchSize;
      if (userBatch.length < batchSize) break;
    }

    return totalGenerated;
  }

  async regenerateAllJobs(): Promise<{ daily: number; streak: number; weekly: number }> {
    console.log('[JobGenerator] Starting job regeneration...');

    const dailyCount = await this.generateDailyReminderJobs();
    console.log(`[JobGenerator] Generated ${dailyCount} daily reminder jobs`);

    const streakCount = await this.generateStreakWarningJobs();
    console.log(`[JobGenerator] Generated ${streakCount} streak warning jobs`);

    const weeklyCount = await this.generateWeeklySummaryJobs();
    console.log(`[JobGenerator] Generated ${weeklyCount} weekly summary jobs`);

    return { daily: dailyCount, streak: streakCount, weekly: weeklyCount };
  }

  private async getUserTestsToday(userId: string): Promise<boolean> {
    const results = await this.storage.getUserTestResults(userId, 1);
    if (results.length === 0) return false;

    const lastTest = results[0];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return lastTest.createdAt >= todayStart;
  }

  async cleanupOldJobs(): Promise<number> {
    const deleted = await this.storage.deleteCompletedJobsOlderThan(7);
    console.log(`[JobGenerator] Cleaned up ${deleted} old completed jobs`);
    return deleted;
  }
}
