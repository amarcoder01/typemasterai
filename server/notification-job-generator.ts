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
      const nowUtc = DateTime.utc();

      for (const { user, preferences } of userBatch) {
        if (!preferences.dailyReminderTime) continue;

        const [hours, minutes] = preferences.dailyReminderTime.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) continue;

        const userTimezone = user.timezone || 'UTC';
        let nextSend = DateTime.now()
          .setZone(userTimezone)
          .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

        const nextSendUtc = nextSend.toUTC();
        if (nextSendUtc <= nowUtc) {
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
      const nowUtc = DateTime.utc();

      for (const { user, preferences } of userBatch) {
        if (user.currentStreak === 0) continue;

        const userTimezone = user.timezone || 'UTC';
        const nowUserZone = DateTime.now().setZone(userTimezone);

        if (user.lastTestDate) {
          const lastTestUserZone = DateTime.fromJSDate(user.lastTestDate).setZone(userTimezone);
          if (lastTestUserZone.hasSame(nowUserZone, 'day')) {
            continue;
          }
        }

        const reminderTime = preferences.dailyReminderTime || '09:00';
        const [reminderHour, reminderMinute] = reminderTime.split(':').map(Number);
        
        const reminderToday = nowUserZone.set({ 
          hour: reminderHour, 
          minute: reminderMinute || 0, 
          second: 0, 
          millisecond: 0 
        });
        
        const PRIMARY_BUFFER_HOURS = 8;
        const MIN_BUFFER_MINUTES = 60;
        
        const baseline = reminderToday.plus({ hours: PRIMARY_BUFFER_HOURS });
        const minBuffer = reminderToday.plus({ minutes: MIN_BUFFER_MINUTES });
        
        let deadline = DateTime.max(baseline, minBuffer);
        
        const sameDayCap = reminderToday.set({ 
          hour: 23, 
          minute: 45, 
          second: 0, 
          millisecond: 0 
        });
        
        if (deadline.hasSame(reminderToday, 'day') && deadline > sameDayCap) {
          deadline = sameDayCap;
        }
        
        if (!deadline.isValid) {
          console.error(`[JobGenerator] Invalid deadline for user ${user.id}, skipping`);
          continue;
        }
        
        let nextSend = deadline;
        const nextSendUtc = nextSend.toUTC();
        if (nextSendUtc <= nowUtc) {
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
      const nowUtc = DateTime.utc();

      for (const { user } of userBatch) {
        const userTimezone = user.timezone || 'UTC';
        let nextSunday = DateTime.now()
          .setZone(userTimezone)
          .set({ weekday: 7, hour: 19, minute: 0, second: 0, millisecond: 0 });

        const nextSundayUtc = nextSunday.toUTC();
        if (nextSundayUtc <= nowUtc) {
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


  async cleanupOldJobs(): Promise<number> {
    const deleted = await this.storage.deleteCompletedJobsOlderThan(7);
    console.log(`[JobGenerator] Cleaned up ${deleted} old completed jobs`);
    return deleted;
  }
}
