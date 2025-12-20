import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { IStorage } from './storage';
import { NotificationService } from './notification-service';
import type { NotificationScheduler } from './notification-scheduler';
import { insertPushSubscriptionSchema, insertNotificationPreferencesSchema, updateNotificationPreferencesSchema } from '@shared/schema';

export function createNotificationRoutes(storage: IStorage, notificationScheduler?: NotificationScheduler) {
  const router = Router();
  const notificationService = new NotificationService(storage);

  // Rate limiters for notification endpoints
  const subscriptionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 subscription attempts per 15 minutes
    message: { error: 'Too many subscription attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const testNotificationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // 3 test notifications per 5 minutes
    message: { error: 'Too many test notifications, please wait a few minutes' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const preferencesLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // 20 preference updates per minute
    message: { error: 'Too many preference updates, please slow down' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const challengeLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 challenge operations per minute
    message: { error: 'Too many challenge operations, please slow down' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Get VAPID public key for subscription
  router.get('/api/notifications/vapid-public-key', (req, res) => {
    const publicKey = notificationService.getPublicKey();
    res.json({ publicKey });
  });

  // Subscribe to push notifications
  router.post('/api/notifications/subscribe', subscriptionLimiter, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      // Validate subscription endpoint URL
      const { endpoint } = req.body;
      if (!endpoint || typeof endpoint !== 'string') {
        return res.status(400).json({ error: 'Invalid subscription: missing endpoint' });
      }

      // Validate endpoint is a valid URL from a known push service
      try {
        const url = new URL(endpoint);
        const validHosts = [
          'fcm.googleapis.com',
          'updates.push.services.mozilla.com',
          'wns.windows.com',
          'push.apple.com',
          'web.push.apple.com',
        ];
        const isValidHost = validHosts.some(host => url.hostname.includes(host) || url.hostname.endsWith('.push.services.mozilla.com'));
        if (!isValidHost && process.env.NODE_ENV === 'production') {
          console.warn(`[Notifications] Suspicious push endpoint: ${url.hostname}`);
          // Allow but log for monitoring - some browsers use different endpoints
        }
      } catch {
        return res.status(400).json({ error: 'Invalid subscription: malformed endpoint URL' });
      }

      const validated = insertPushSubscriptionSchema.parse({
        ...req.body,
        userId: req.user.id,
        isActive: true,
        userAgent: req.headers['user-agent'] || null,
      });

      // Check if subscription already exists
      const existing = await storage.findExistingSubscription(
        req.user.id,
        validated.endpoint
      );

      let subscription;
      if (existing) {
        // Update existing subscription with new keys (they may have changed)
        await storage.deletePushSubscription(existing.id);
        subscription = await storage.createPushSubscription(validated);
        console.log(`[Notifications] Refreshed subscription for user ${req.user.id}`);
      } else {
        // Create new subscription
        subscription = await storage.createPushSubscription(validated);
        console.log(`[Notifications] New subscription for user ${req.user.id}`);
      }

      res.json({ success: true, subscription });
    } catch (error: any) {
      console.error('[Notifications] Subscribe error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Unsubscribe from push notifications
  router.post('/api/notifications/unsubscribe', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const { endpoint } = req.body;
      
      if (endpoint) {
        // If endpoint provided, delete specific subscription
        const subscription = await storage.findExistingSubscription(req.user.id, endpoint);
        if (subscription) {
          await storage.deletePushSubscription(subscription.id);
        }
      } else {
        // If no endpoint, delete all subscriptions for user
        const subscriptions = await storage.getUserPushSubscriptions(req.user.id);
        for (const sub of subscriptions) {
          await storage.deletePushSubscription(sub.id);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('[Notifications] Unsubscribe error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Update existing push subscription (for subscription changes)
  router.put('/api/notifications/update-subscription', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const validated = insertPushSubscriptionSchema.parse({
        ...req.body,
        userId: req.user.id,
        isActive: true,
      });

      // Delete old subscriptions and create new one
      const existingSubscriptions = await storage.getUserPushSubscriptions(req.user.id);
      for (const sub of existingSubscriptions) {
        await storage.deletePushSubscription(sub.id);
      }

      const subscription = await storage.createPushSubscription(validated);
      console.log('[Notifications] Subscription updated for user:', req.user.id);

      res.json({ success: true, subscription });
    } catch (error: any) {
      console.error('[Notifications] Update subscription error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Get user's notification preferences
  router.get('/api/notifications/preferences', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      let prefs = await storage.getNotificationPreferences(req.user.id);
      
      // Create default preferences if none exist
      if (!prefs) {
        prefs = await storage.createNotificationPreferences({
          userId: req.user.id,
        });
      }

      res.json(prefs);
    } catch (error: any) {
      console.error('[Notifications] Get preferences error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update notification preferences
  router.put('/api/notifications/preferences', preferencesLimiter, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      // Validate request body with Zod schema
      const validatedPrefs = updateNotificationPreferencesSchema.parse(req.body);
      
      console.log('[Notifications] Received preferences update:', JSON.stringify(validatedPrefs, null, 2));
      const prefs = await storage.updateNotificationPreferences(
        req.user.id,
        validatedPrefs
      );
      console.log('[Notifications] Saved preferences:', JSON.stringify(prefs, null, 2));

      res.json(prefs);
    } catch (error: any) {
      console.error('[Notifications] Update preferences error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Get notification history
  router.get('/api/notifications/history', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getUserNotificationHistory(req.user.id, limit);
      res.json(history);
    } catch (error: any) {
      console.error('[Notifications] Get history error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mark notification as clicked
  router.post('/api/notifications/:id/clicked', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationClicked(notificationId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Notifications] Mark clicked error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Send test notification
  router.post('/api/notifications/test', testNotificationLimiter, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      await notificationService.sendToUser({
        userId: req.user.id,
        type: 'test',
        payload: {
          title: '🔔 Test Notification',
          body: 'This is a test notification from TypeMasterAI!',
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          data: { url: '/' },
        },
      });

      res.json({ success: true, message: 'Test notification sent' });
    } catch (error: any) {
      console.error('[Notifications] Send test error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user achievements
  router.get('/api/achievements', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const userAchievements = await storage.getUserAchievements(req.user.id);
      const allAchievements = await storage.getAllAchievements();
      
      res.json({
        unlocked: userAchievements,
        all: allAchievements,
      });
    } catch (error: any) {
      console.error('[Achievements] Get error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get active challenges
  router.get('/api/challenges/active', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const dailyChallenge = await storage.getActiveChallenge('daily');
      const weeklyChallenge = await storage.getActiveChallenge('weekly');
      
      let dailyProgress = null;
      let weeklyProgress = null;
      
      if (dailyChallenge) {
        dailyProgress = await storage.getUserChallengeProgress(req.user.id, dailyChallenge.id);
      }
      
      if (weeklyChallenge) {
        weeklyProgress = await storage.getUserChallengeProgress(req.user.id, weeklyChallenge.id);
      }

      res.json({
        daily: dailyChallenge ? { ...dailyChallenge, progress: dailyProgress } : null,
        weekly: weeklyChallenge ? { ...weeklyChallenge, progress: weeklyProgress } : null,
      });
    } catch (error: any) {
      console.error('[Challenges] Get active error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update challenge progress
  router.post('/api/challenges/:id/progress', challengeLimiter, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const challengeId = parseInt(req.params.id);
      const { progress } = req.body;

      if (typeof progress !== 'number' || progress < 0) {
        return res.status(400).json({ error: 'Invalid progress value' });
      }

      // Get the challenge details
      const dailyChallenge = await storage.getActiveChallenge('daily');
      const weeklyChallenge = await storage.getActiveChallenge('weekly');
      const challenge = dailyChallenge?.id === challengeId ? dailyChallenge : 
                        weeklyChallenge?.id === challengeId ? weeklyChallenge : null;

      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      // Get previous progress for notification logic
      const previousProgress = await storage.getUserChallengeProgress(req.user.id, challengeId);
      const previousValue = previousProgress?.progress || 0;

      // Update the progress
      const updatedProgress = await storage.updateChallengeProgress(req.user.id, challengeId, progress);

      // Check if challenge is now complete - goal is a JSONB object with target property
      const goalData = challenge.goal as { target?: number } || {};
      const target = goalData.target || 100;
      const isNowComplete = progress >= target && previousValue < target;

      if (isNowComplete) {
        // Mark challenge as complete
        await storage.completeChallenge(req.user.id, challengeId);
        
        // Update user gamification
        const gamification = await storage.getUserGamification(req.user.id);
        if (gamification) {
          await storage.updateUserGamification(req.user.id, {
            totalPoints: gamification.totalPoints + challenge.pointsReward,
            experiencePoints: gamification.experiencePoints + challenge.pointsReward,
            totalChallengesCompleted: gamification.totalChallengesCompleted + 1,
          });
        }

        // Send completion notification
        if (notificationScheduler) {
          try {
            await notificationScheduler.notifyChallengeUpdate(req.user.id, {
              title: challenge.title,
              description: challenge.description,
              type: 'completed',
              progress,
              target,
              reward: challenge.pointsReward,
            });
          } catch (notificationError) {
            console.error('[Notifications] Challenge completion notification failed:', notificationError);
          }
        }

        res.json({ 
          progress: updatedProgress, 
          completed: true, 
          reward: challenge.pointsReward,
          message: 'Challenge completed!' 
        });
      } else {
        // Send progress notification at 50% and 75% milestones
        const previousPercent = (previousValue / target) * 100;
        const currentPercent = (progress / target) * 100;
        
        if (notificationScheduler && 
            ((previousPercent < 50 && currentPercent >= 50) || 
             (previousPercent < 75 && currentPercent >= 75))) {
          try {
            await notificationScheduler.notifyChallengeUpdate(req.user.id, {
              title: challenge.title,
              description: challenge.description,
              type: 'progress',
              progress,
              target,
            });
          } catch (notificationError) {
            console.error('[Notifications] Challenge progress notification failed:', notificationError);
          }
        }

        res.json({ progress: updatedProgress, completed: false });
      }
    } catch (error: any) {
      console.error('[Challenges] Update progress error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Join a challenge (start tracking)
  router.post('/api/challenges/:id/join', challengeLimiter, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const challengeId = parseInt(req.params.id);

      // Get the challenge details
      const dailyChallenge = await storage.getActiveChallenge('daily');
      const weeklyChallenge = await storage.getActiveChallenge('weekly');
      const challenge = dailyChallenge?.id === challengeId ? dailyChallenge : 
                        weeklyChallenge?.id === challengeId ? weeklyChallenge : null;

      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      // Check if already joined
      const existing = await storage.getUserChallengeProgress(req.user.id, challengeId);
      if (existing) {
        return res.json({ progress: existing, message: 'Already joined this challenge' });
      }

      // Initialize progress at 0
      const progress = await storage.updateChallengeProgress(req.user.id, challengeId, 0);

      // Send challenge started notification
      if (notificationScheduler) {
        try {
          await notificationScheduler.notifyChallengeUpdate(req.user.id, {
            title: challenge.title,
            description: challenge.description,
            type: 'started',
          });
        } catch (notificationError) {
          console.error('[Notifications] Challenge started notification failed:', notificationError);
        }
      }

      res.json({ progress, message: 'Joined challenge successfully' });
    } catch (error: any) {
      console.error('[Challenges] Join error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user gamification profile
  router.get('/api/gamification/profile', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      let profile = await storage.getUserGamification(req.user.id);
      
      // Create default profile if none exists
      if (!profile) {
        profile = await storage.createUserGamification({
          userId: req.user.id,
          totalPoints: 0,
          level: 1,
          experiencePoints: 0,
          totalAchievements: 0,
          totalChallengesCompleted: 0,
        });
      }

      res.json(profile);
    } catch (error: any) {
      console.error('[Gamification] Get profile error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
