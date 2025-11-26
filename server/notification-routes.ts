import { Router } from 'express';
import type { IStorage } from './storage';
import { NotificationService } from './notification-service';
import { insertPushSubscriptionSchema, insertNotificationPreferencesSchema, updateNotificationPreferencesSchema } from '@shared/schema';

export function createNotificationRoutes(storage: IStorage) {
  const router = Router();
  const notificationService = new NotificationService(storage);

  // Get VAPID public key for subscription
  router.get('/api/notifications/vapid-public-key', (req, res) => {
    const publicKey = notificationService.getPublicKey();
    res.json({ publicKey });
  });

  // Subscribe to push notifications
  router.post('/api/notifications/subscribe', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const validated = insertPushSubscriptionSchema.parse({
        ...req.body,
        userId: req.user.id,
        isActive: true,
      });

      // Check if subscription already exists
      const existing = await storage.findExistingSubscription(
        req.user.id,
        validated.endpoint
      );

      let subscription;
      if (existing) {
        // Update existing subscription
        subscription = existing;
      } else {
        // Create new subscription
        subscription = await storage.createPushSubscription(validated);
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
      const subscription = await storage.findExistingSubscription(req.user.id, endpoint);
      
      if (subscription) {
        await storage.deletePushSubscription(subscription.id);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('[Notifications] Unsubscribe error:', error);
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
  router.put('/api/notifications/preferences', async (req, res) => {
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
  router.post('/api/notifications/test', async (req, res) => {
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
