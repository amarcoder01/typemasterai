// Browser Push Notification Manager
// Handles service worker registration, push subscription, and permission requests

export class NotificationManager {
  private static instance: NotificationManager;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  // Check if browser supports notifications
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  // Get current permission status
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  // Register service worker
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.warn('[Notifications] Push notifications not supported');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register(
        '/service-worker.js',
        { scope: '/' }
      );

      console.log('[Notifications] Service Worker registered:', this.registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      return this.registration;
    } catch (error) {
      console.error('[Notifications] Service Worker registration failed:', error);
      return null;
    }
  }

  // Request notification permission from user
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.warn('[Notifications] Push notifications not supported');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('[Notifications] Permission status:', permission);
      return permission;
    } catch (error) {
      console.error('[Notifications] Permission request failed:', error);
      return 'denied';
    }
  }

  // Subscribe to push notifications
  async subscribe(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.registerServiceWorker();
    }

    if (!this.registration) {
      console.error('[Notifications] No service worker registration');
      return null;
    }

    try {
      const convertedKey = this.urlBase64ToUint8Array(vapidPublicKey);

      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      console.log('[Notifications] Push subscription created:', this.subscription);
      return this.subscription;
    } catch (error) {
      console.error('[Notifications] Push subscription failed:', error);
      return null;
    }
  }

  // Get existing subscription
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.registerServiceWorker();
    }

    if (!this.registration) {
      return null;
    }

    try {
      this.subscription = await this.registration.pushManager.getSubscription();
      return this.subscription;
    } catch (error) {
      console.error('[Notifications] Failed to get subscription:', error);
      return null;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    const subscription = await this.getSubscription();

    if (!subscription) {
      console.log('[Notifications] No active subscription to unsubscribe');
      return true;
    }

    try {
      const result = await subscription.unsubscribe();
      console.log('[Notifications] Unsubscribed successfully:', result);
      this.subscription = null;
      return result;
    } catch (error) {
      console.error('[Notifications] Unsubscribe failed:', error);
      return false;
    }
  }

  // Save subscription to server
  async saveSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      console.log('[Notifications] Subscription saved to server');
      return true;
    } catch (error) {
      console.error('[Notifications] Failed to save subscription:', error);
      return false;
    }
  }

  // Remove subscription from server
  async removeSubscriptionFromServer(): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      console.log('[Notifications] Subscription removed from server');
      return true;
    } catch (error) {
      console.error('[Notifications] Failed to remove subscription:', error);
      return false;
    }
  }

  // Complete flow: Request permission, subscribe, and save to server
  async enableNotifications(vapidPublicKey: string): Promise<{
    success: boolean;
    permission?: NotificationPermission;
    subscription?: PushSubscription;
    error?: string;
  }> {
    try {
      // Check support
      if (!this.isSupported()) {
        return {
          success: false,
          error: 'Push notifications are not supported in your browser',
        };
      }

      // Request permission
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          permission,
          error: 'Notification permission was denied',
        };
      }

      // Subscribe to push
      const subscription = await this.subscribe(vapidPublicKey);
      if (!subscription) {
        return {
          success: false,
          permission,
          error: 'Failed to create push subscription',
        };
      }

      // Save to server
      const saved = await this.saveSubscriptionToServer(subscription);
      if (!saved) {
        return {
          success: false,
          permission,
          subscription,
          error: 'Failed to save subscription to server',
        };
      }

      return {
        success: true,
        permission,
        subscription,
      };
    } catch (error: any) {
      console.error('[Notifications] Enable notifications failed:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  // Complete flow: Unsubscribe and remove from server
  async disableNotifications(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Remove from server first
      await this.removeSubscriptionFromServer();

      // Then unsubscribe locally
      const unsubscribed = await this.unsubscribe();

      return {
        success: unsubscribed,
        error: unsubscribed ? undefined : 'Failed to unsubscribe',
      };
    } catch (error: any) {
      console.error('[Notifications] Disable notifications failed:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  // Show a test notification (for testing purposes)
  async showTestNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.registration) {
      console.error('[Notifications] No service worker registration');
      return;
    }

    try {
      const notificationOptions: NotificationOptions = {
        body: options?.body || 'This is a test notification',
        icon: options?.icon || '/icon-192x192.png',
        badge: options?.badge || '/icon-72x72.png',
        data: options?.data || { url: '/' },
        ...options,
      };

      await this.registration.showNotification(title, notificationOptions);
      console.log('[Notifications] Test notification shown');
    } catch (error) {
      console.error('[Notifications] Failed to show test notification:', error);
    }
  }

  // Helper: Convert VAPID public key from Base64 to Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();
