import webpush from 'web-push';
import type { 
  PushSubscription, 
  InsertNotificationHistory, 
  NotificationHistory 
} from '@shared/schema';
import type { IStorage } from './storage';

// VAPID Configuration
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:no-reply@typemasterai.com';

// Log VAPID status (non-blocking - app runs fine without push notifications)
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.log('[NotificationService] VAPID keys not configured - push notifications will be disabled');
  console.log('[NotificationService] To enable push notifications, set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY');
}

// Initialize web-push with VAPID keys
const VAPID_KEYS_AVAILABLE = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (VAPID_KEYS_AVAILABLE) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('✓ Push notification service initialized with VAPID keys');
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  tag?: string;
  requireInteraction?: boolean;
}

export interface SendNotificationOptions {
  userId: string;
  type: string;
  payload: NotificationPayload;
  ttl?: number; // Time to live in seconds
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
}

export class NotificationService {
  // In-memory deduplication cache: Map<dedupeKey, timestamp>
  private recentNotifications: Map<string, number> = new Map();
  private readonly DEDUPE_WINDOW_MS = 60 * 1000; // 1 minute deduplication window
  private lastCleanup = Date.now();

  constructor(private storage: IStorage) {
    // Cleanup old entries periodically
    setInterval(() => this.cleanupDedupeCache(), 5 * 60 * 1000);
  }

  /**
   * Cleanup old entries from deduplication cache
   */
  private cleanupDedupeCache(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.recentNotifications.entries()) {
      if (now - timestamp > this.DEDUPE_WINDOW_MS) {
        this.recentNotifications.delete(key);
      }
    }
  }

  /**
   * Check if this notification was recently sent (deduplication)
   */
  private isDuplicate(userId: string, type: string, tag?: string): boolean {
    const key = `${userId}:${type}:${tag || 'default'}`;
    const now = Date.now();
    
    const lastSent = this.recentNotifications.get(key);
    if (lastSent && now - lastSent < this.DEDUPE_WINDOW_MS) {
      console.log(`[Notifications] Skipping duplicate ${type} for user ${userId}`);
      return true;
    }
    
    this.recentNotifications.set(key, now);
    return false;
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(options: SendNotificationOptions): Promise<{ sent: number; failed: number }> {
    const { userId, type, payload, ttl = 86400, urgency = 'normal' } = options;

    // Check if VAPID keys are configured
    if (!VAPID_KEYS_AVAILABLE) {
      console.warn('[NotificationService] Skipping notification - VAPID keys not configured');
      return { sent: 0, failed: 0 };
    }

    // Check for duplicate notification (prevent spam)
    if (this.isDuplicate(userId, type, payload.tag)) {
      return { sent: 0, failed: 0 };
    }

    // Get user's active push subscriptions
    const subscriptions = await this.storage.getUserPushSubscriptions(userId);
    
    if (subscriptions.length === 0) {
      console.log(`[Notifications] No subscriptions found for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Send to all user's devices
    for (const subscription of subscriptions) {
      try {
        const keys = subscription.keys as any;
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload),
          {
            TTL: ttl,
            urgency,
          }
        );

        // Record success in notification history
        await this.storage.createNotificationHistory({
          userId,
          type,
          title: payload.title,
          body: payload.body,
          data: payload.data as any,
          status: 'sent',
          sentAt: new Date(),
        });

        sent++;
      } catch (error: any) {
        console.error(`[Notifications] Failed to send to subscription ${subscription.id}:`, error);
        
        // If subscription expired or invalid, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await this.storage.deletePushSubscription(subscription.id);
          console.log(`[Notifications] Removed invalid subscription ${subscription.id}`);
        }

        // Record failure
        await this.storage.createNotificationHistory({
          userId,
          type,
          title: payload.title,
          body: payload.body,
          data: payload.data as any,
          status: 'failed',
          errorMessage: error.message,
          sentAt: new Date(),
        });

        failed++;
      }
    }

    console.log(`[Notifications] Sent to user ${userId}: ${sent} succeeded, ${failed} failed`);
    return { sent, failed };
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds: string[], type: string, payload: NotificationPayload): Promise<void> {
    const promises = userIds.map(userId =>
      this.sendToUser({ userId, type, payload })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Send daily practice reminder
   */
  async sendDailyReminder(userId: string, stats: { streak: number; avgWpm: number }): Promise<void> {
    const { streak, avgWpm } = stats;

    const messages = [
      `Keep your ${streak}-day streak alive! Time for your daily practice. 🔥`,
      `Your typing skills are calling! Current streak: ${streak} days. Let's go! 💪`,
      `Practice makes perfect! You're averaging ${avgWpm} WPM. Ready to improve? ⌨️`,
      `${streak} days strong! Don't break your streak - practice now! 🎯`,
    ];

    const payload: NotificationPayload = {
      title: 'Daily Practice Reminder',
      body: messages[Math.floor(Math.random() * messages.length)],
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: {
        url: '/practice',
        type: 'daily_reminder',
        streak,
      },
      tag: 'daily-reminder',
      actions: [
        { action: 'practice', title: 'Start Practicing' },
        { action: 'dismiss', title: 'Maybe Later' },
      ],
    };

    await this.sendToUser({ userId, type: 'daily_reminder', payload });
  }

  /**
   * Send streak warning (streak about to break)
   */
  async sendStreakWarning(userId: string, streak: number, hoursLeft: number): Promise<void> {
    const payload: NotificationPayload = {
      title: `⚠️ Streak Alert: ${streak} Days at Risk!`,
      body: `Only ${hoursLeft} hours left to keep your ${streak}-day streak! Practice now!`,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: {
        url: '/practice',
        type: 'streak_warning',
        streak,
        hoursLeft,
      },
      tag: 'streak-warning',
      requireInteraction: true,
      actions: [
        { action: 'practice', title: 'Save My Streak!' },
        { action: 'snooze', title: 'Remind Me in 1 Hour' },
      ],
    };

    await this.sendToUser({ 
      userId, 
      type: 'streak_warning', 
      payload,
      urgency: 'high',
    });
  }

  /**
   * Send weekly summary
   */
  async sendWeeklySummary(
    userId: string, 
    summary: {
      testsCompleted: number;
      avgWpm: number;
      avgAccuracy: number;
      improvement: number;
      rank: number;
    }
  ): Promise<void> {
    const { testsCompleted, avgWpm, avgAccuracy, improvement, rank } = summary;

    const improvementText = improvement > 0 
      ? `+${improvement.toFixed(1)} WPM improvement! 📈`
      : improvement < 0
      ? `${improvement.toFixed(1)} WPM this week 📊`
      : 'Steady progress! 📊';

    const payload: NotificationPayload = {
      title: '📊 Your Weekly Typing Report',
      body: `${testsCompleted} tests completed | ${avgWpm} WPM avg | ${avgAccuracy.toFixed(1)}% accuracy | ${improvementText}`,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      image: '/weekly-summary-chart.png', // Could be dynamically generated
      data: {
        url: '/analytics',
        type: 'weekly_summary',
        summary,
      },
      tag: 'weekly-summary',
      actions: [
        { action: 'view', title: 'View Full Report' },
        { action: 'share', title: 'Share Progress' },
      ],
    };

    await this.sendToUser({ userId, type: 'weekly_summary', payload });
  }

  /**
   * Send achievement unlock notification
   */
  async sendAchievementUnlock(
    userId: string,
    achievement: {
      name: string;
      description: string;
      tier: string;
      points: number;
      icon: string;
    }
  ): Promise<void> {
    const tierEmojis: Record<string, string> = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '💎',
      diamond: '👑',
    };

    const emoji = tierEmojis[achievement.tier] || '🏆';

    const payload: NotificationPayload = {
      title: `${emoji} Achievement Unlocked!`,
      body: `${achievement.name}: ${achievement.description} (+${achievement.points} points)`,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: {
        url: '/profile?tab=achievements',
        type: 'achievement_unlock',
        achievement,
      },
      tag: `achievement-${achievement.name}`,
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View Achievement' },
        { action: 'share', title: 'Share' },
      ],
    };

    await this.sendToUser({ 
      userId, 
      type: 'achievement_unlock', 
      payload,
      urgency: 'high',
    });
  }

  /**
   * Send challenge notification
   */
  async sendChallengeNotification(
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
    const { title, description, type, progress, target, reward } = challenge;

    let notificationTitle = '';
    let notificationBody = '';

    if (type === 'started') {
      notificationTitle = `🎯 New Challenge: ${title}`;
      notificationBody = description;
    } else if (type === 'progress') {
      notificationTitle = `📊 Challenge Progress: ${title}`;
      notificationBody = `${progress}/${target} - Keep going! You're ${Math.round((progress! / target!) * 100)}% there!`;
    } else {
      notificationTitle = `🎉 Challenge Complete: ${title}`;
      notificationBody = `Congratulations! You earned ${reward} points!`;
    }

    const payload: NotificationPayload = {
      title: notificationTitle,
      body: notificationBody,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: {
        url: '/challenges',
        type: `challenge_${type}`,
        challenge,
      },
      tag: `challenge-${title}`,
      actions: [
        { action: 'view', title: 'View Challenge' },
      ],
    };

    await this.sendToUser({ 
      userId, 
      type: `challenge_${type}`, 
      payload,
      urgency: type === 'completed' ? 'high' : 'normal',
    });
  }

  /**
   * Send leaderboard update notification
   */
  async sendLeaderboardUpdate(
    userId: string,
    update: {
      category: string;
      oldRank: number;
      newRank: number;
      totalUsers: number;
    }
  ): Promise<void> {
    const { category, oldRank, newRank, totalUsers } = update;

    const isImprovement = newRank < oldRank;
    const rankDiff = Math.abs(newRank - oldRank);

    const payload: NotificationPayload = {
      title: isImprovement 
        ? `🚀 You Moved Up the Leaderboard!`
        : `📊 Leaderboard Update`,
      body: isImprovement
        ? `You climbed ${rankDiff} spots in ${category}! Now #${newRank} of ${totalUsers}`
        : `Your rank in ${category}: #${newRank} of ${totalUsers}`,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: {
        url: '/leaderboard',
        type: 'leaderboard_update',
        update,
      },
      tag: 'leaderboard-update',
      actions: [
        { action: 'view', title: 'View Leaderboard' },
      ],
    };

    await this.sendToUser({ userId, type: 'leaderboard_update', payload });
  }

  /**
   * Send race invite notification
   */
  async sendRaceInvite(
    userId: string,
    invite: {
      inviterName: string;
      roomCode: string;
      mode: string;
    }
  ): Promise<void> {
    const { inviterName, roomCode, mode } = invite;

    const payload: NotificationPayload = {
      title: `🏁 Race Invitation!`,
      body: `${inviterName} invited you to a ${mode} typing race. Room: ${roomCode}`,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: {
        url: `/race/${roomCode}`,
        type: 'race_invite',
        invite,
      },
      tag: `race-invite-${roomCode}`,
      requireInteraction: true,
      actions: [
        { action: 'join', title: 'Join Race' },
        { action: 'decline', title: 'Decline' },
      ],
    };

    await this.sendToUser({ 
      userId, 
      type: 'race_invite', 
      payload,
      urgency: 'high',
      ttl: 3600, // 1 hour TTL for race invites
    });
  }

  /**
   * Send personal record notification
   */
  async sendPersonalRecord(
    userId: string,
    record: {
      wpm: number;
      previousBest: number;
      accuracy: number;
      mode: string;
    }
  ): Promise<void> {
    const { wpm, previousBest, accuracy, mode } = record;
    const improvement = wpm - previousBest;

    const payload: NotificationPayload = {
      title: `🏆 New Personal Record!`,
      body: `${wpm} WPM (+${improvement} WPM) with ${accuracy.toFixed(1)}% accuracy in ${mode} mode!`,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: {
        url: '/profile',
        type: 'personal_record',
        record,
      },
      tag: 'personal-record',
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View Stats' },
        { action: 'share', title: 'Share' },
      ],
    };

    await this.sendToUser({ 
      userId, 
      type: 'personal_record', 
      payload,
      urgency: 'high',
    });
  }

  /**
   * Send streak milestone notification
   */
  async sendStreakMilestone(
    userId: string,
    milestone: {
      streak: number;
      reward?: number;
    }
  ): Promise<void> {
    const { streak, reward } = milestone;

    const milestoneEmojis: Record<number, string> = {
      7: '🔥',
      14: '⚡',
      30: '💪',
      50: '🌟',
      100: '👑',
      365: '🏆',
    };

    const emoji = milestoneEmojis[streak] || '🎯';

    const payload: NotificationPayload = {
      title: `${emoji} ${streak}-Day Streak Milestone!`,
      body: reward 
        ? `Amazing! You've maintained a ${streak}-day streak! +${reward} bonus points!`
        : `Incredible dedication! You've typed for ${streak} days straight!`,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: {
        url: '/profile',
        type: 'streak_milestone',
        milestone,
      },
      tag: `streak-milestone-${streak}`,
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View Profile' },
        { action: 'share', title: 'Share Achievement' },
      ],
    };

    await this.sendToUser({ 
      userId, 
      type: 'streak_milestone', 
      payload,
      urgency: 'high',
    });
  }

  /**
   * Send race starting notification
   */
  async sendRaceStarting(
    userId: string,
    race: {
      roomCode: string;
      startsIn: number; // seconds
      participants: number;
    }
  ): Promise<void> {
    const { roomCode, startsIn, participants } = race;

    const payload: NotificationPayload = {
      title: `🏁 Race Starting Soon!`,
      body: `Your race with ${participants} participants starts in ${startsIn} seconds!`,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: {
        url: `/race/${roomCode}`,
        type: 'race_starting',
        race,
      },
      tag: `race-starting-${roomCode}`,
      requireInteraction: true,
      actions: [
        { action: 'join', title: 'Join Now' },
      ],
    };

    await this.sendToUser({ 
      userId, 
      type: 'race_starting', 
      payload,
      urgency: 'high',
      ttl: 60, // 1 minute TTL
    });
  }

  /**
   * Send tip of the day notification
   */
  async sendTipOfTheDay(
    userId: string,
    tip: {
      title: string;
      content: string;
      category: string;
    }
  ): Promise<void> {
    const { title, content, category } = tip;

    const categoryEmojis: Record<string, string> = {
      'technique': '⌨️',
      'posture': '🧘',
      'speed': '⚡',
      'accuracy': '🎯',
      'practice': '📚',
      'motivation': '💪',
    };

    const emoji = categoryEmojis[category] || '💡';

    const payload: NotificationPayload = {
      title: `${emoji} Tip: ${title}`,
      body: content,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: {
        url: '/learn',
        type: 'tip_of_the_day',
        tip,
      },
      tag: 'tip-of-the-day',
      actions: [
        { action: 'learn', title: 'Learn More' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    await this.sendToUser({ userId, type: 'tip_of_the_day', payload });
  }

  /**
   * Check if user should receive a notification based on preferences
   */
  async shouldSendNotification(userId: string, notificationType: string): Promise<boolean> {
    const prefs = await this.storage.getNotificationPreferences(userId);

    if (!prefs) {
      return false;
    }

    // Check quiet hours first (high-urgency notifications like race invites bypass this)
    const highUrgencyTypes = ['race_invite', 'race_starting'];
    if (!highUrgencyTypes.includes(notificationType)) {
      if (this.isInQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd, prefs.timezone)) {
        console.log(`[Notifications] Skipping ${notificationType} for user ${userId} - in quiet hours`);
        return false;
      }
    }

    // Check specific notification type preferences
    const typeMapping: Record<string, keyof typeof prefs> = {
      'daily_reminder': 'dailyReminder',
      'streak_warning': 'streakWarning',
      'streak_milestone': 'streakMilestone',
      'weekly_summary': 'weeklySummary',
      'achievement_unlock': 'achievementUnlocked',
      'challenge_started': 'challengeInvite',
      'challenge_progress': 'challengeInvite',
      'challenge_completed': 'challengeComplete',
      'leaderboard_update': 'leaderboardChange',
      'personal_record': 'newPersonalRecord',
      'race_invite': 'raceInvite',
      'race_starting': 'raceStarting',
      'tip_of_the_day': 'tipOfTheDay',
    };

    const prefKey = typeMapping[notificationType];
    if (prefKey && typeof prefs[prefKey] === 'boolean') {
      return prefs[prefKey] as boolean;
    }

    return true; // Default to true for unknown types
  }

  /**
   * Check if current time is within user's quiet hours
   */
  private isInQuietHours(
    quietHoursStart: string | null, 
    quietHoursEnd: string | null, 
    timezone: string | null
  ): boolean {
    if (!quietHoursStart || !quietHoursEnd) {
      return false;
    }

    try {
      const userTimezone = timezone || 'UTC';
      const now = new Date();
      
      // Get current hour and minute in user's timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
      const currentMinutes = currentHour * 60 + currentMinute;

      // Parse quiet hours (format: "HH:MM")
      const [startHour, startMinute] = quietHoursStart.split(':').map(Number);
      const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      // Handle overnight quiet hours (e.g., 22:00 to 07:00)
      if (startMinutes > endMinutes) {
        // Quiet hours span midnight
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      } else {
        // Same day quiet hours
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      }
    } catch (error) {
      console.error('[Notifications] Error checking quiet hours:', error);
      return false; // If error, allow notification
    }
  }

  /**
   * Get VAPID public key for client subscription
   */
  getPublicKey(): string {
    return VAPID_PUBLIC_KEY || '';
  }

  /**
   * Generate VAPID keys (for initial setup)
   */
  static generateVapidKeys() {
    return webpush.generateVAPIDKeys();
  }
}
