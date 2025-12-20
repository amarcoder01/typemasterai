import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { notificationManager } from '@/lib/notification-manager';
import { useQuery } from '@tanstack/react-query';

/**
 * NotificationSync Component
 * Handles background synchronization of push notifications.
 * Automatically subscribes the user if they have granted browser permission.
 */
export function NotificationSync() {
    const { user } = useAuth();

    // Fetch VAPID key
    const { data: vapidData } = useQuery<{ publicKey: string }>({
        queryKey: ['/api/notifications/vapid-public-key'],
        enabled: !!user,
    });

    useEffect(() => {
        const syncNotifications = async () => {
            if (!user || !vapidData?.publicKey) return;

            const permission = notificationManager.getPermissionStatus();
            const isExplicitlyDisabled = localStorage.getItem('notifications_disabled') === 'true';

            // If permission is granted but we don't know if we're subscribed locally,
            // try to sync with the server, unless the user explicitly disabled on this device.
            if (permission === 'granted' && !isExplicitlyDisabled) {
                const subscription = await notificationManager.getSubscription();

                if (!subscription) {
                    console.log('[NotificationSync] Permission granted but no local subscription found. Subscribing...');
                    await notificationManager.enableNotifications(vapidData.publicKey);
                } else {
                    // Verify with server (manager might already handle this, but being explicit)
                    // ensure it's saved.
                    await notificationManager.saveSubscriptionToServer(subscription);
                }
            }
        };

        syncNotifications();
    }, [user, vapidData]);

    return null; // This component has no UI
}
