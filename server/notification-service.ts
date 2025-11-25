import webpush from 'web-push';
import type { 
  PushSubscription, 
  InsertNotificationHistory, 
  NotificationHistory 
} from '@shared/schema';
import type { IStorage } from './storage';

// VAPID Configuration
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:notifications@typemasterai.com';

// Initialize web-push with VAPID keys
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
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
  constructor(private storage: IStorage) {}

  /**
   * Send push notification to a specific user
   */
  async sendToUser(options: SendNotificationOptions): Promise<{ sent: number; failed: number }> {
    const { userId, type, payload, ttl = 86400, urgency = 'normal' } = options;

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
   * Check if user should receive a notification based on preferences
   */
  async shouldSendNotification(userId: string, notificationType: string): Promise<boolean> {
    const prefs = await this.storage.getNotificationPreferences(userId);
    
    if (!prefs) {
      return false;
    }

    // Check specific notification type preferences
    const typeMapping: Record<string, keyof typeof prefs> = {
      'daily_reminder': 'dailyReminder',
      'streak_warning': 'streakWarning',
      'weekly_summary': 'weeklySummary',
      'achievement_unlock': 'achievementUnlocked',
      'challenge_started': 'challengeInvite',
      'challenge_progress': 'challengeInvite',
      'challenge_completed': 'challengeComplete',
      'leaderboard_update': 'leaderboardChange',
      'race_invite': 'raceInvite',
    };

    const prefKey = typeMapping[notificationType];
    if (prefKey && typeof prefs[prefKey] === 'boolean') {
      return prefs[prefKey] as boolean;
    }

    return true; // Default to true for unknown types
  }

  /**
   * Get VAPID public key for client subscription
   */
  getPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Generate VAPID keys (for initial setup)
   */
  static generateVapidKeys() {
    return webpush.generateVAPIDKeys();
  }
}
