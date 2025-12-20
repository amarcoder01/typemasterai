// TypeMasterAI Service Worker - PWA & Push Notifications
const CACHE_NAME = 'typemaster-v1';
const urlsToCache = [
  '/',
  '/offline.html'
];

// Install Service Worker and cache resources
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy: Network First, fallback to Cache
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension and other protocols
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response before caching
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request).then(response => {
          if (response) {
            return response;
          }
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// Push Notification Handler
self.addEventListener('push', event => {
  console.log('[Service Worker] Push notification received');
  
  let notificationData = {
    title: 'TypeMasterAI',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: []
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        data: {
          url: payload.url || notificationData.data.url,
          timestamp: Date.now(),
          type: payload.type,
          ...payload.data
        },
        tag: payload.tag || `notification-${Date.now()}`,
        requireInteraction: payload.requireInteraction || false
      };

      // Add context-specific actions
      if (payload.type === 'daily_reminder') {
        notificationData.actions = [
          { action: 'start_test', title: 'Start Test', icon: '/icon-96x96.png' },
          { action: 'dismiss', title: 'Later' }
        ];
      } else if (payload.type === 'streak_warning') {
        notificationData.actions = [
          { action: 'save_streak', title: 'Save Streak!', icon: '/icon-96x96.png' },
          { action: 'dismiss', title: 'Ignore' }
        ];
      } else if (payload.type === 'race_invite') {
        notificationData.actions = [
          { action: 'join_race', title: 'Join Race', icon: '/icon-96x96.png' },
          { action: 'dismiss', title: 'Decline' }
        ];
      } else if (payload.type === 'achievement_unlocked') {
        notificationData.actions = [
          { action: 'view_achievement', title: 'View', icon: '/icon-96x96.png' }
        ];
      } else {
        notificationData.actions = [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' }
        ];
      }
    } catch (error) {
      console.error('[Service Worker] Error parsing push payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click:', event.action);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const action = event.action;

  // Handle different actions
  if (action === 'dismiss') {
    // Just close the notification
    return;
  }

  // Track notification click
  if (event.notification.data?.notificationId) {
    fetch('/api/notifications/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: event.notification.data.notificationId,
        action: action || 'default'
      })
    }).catch(err => console.error('[Service Worker] Failed to track click:', err));
  }

  // Determine target URL based on action
  let targetUrl = urlToOpen;
  if (action === 'start_test' || action === 'save_streak') {
    targetUrl = '/';
  } else if (action === 'join_race') {
    targetUrl = event.notification.data?.raceUrl || '/multiplayer';
  } else if (action === 'view_achievement') {
    targetUrl = '/profile';
  } else if (action === 'view') {
    targetUrl = urlToOpen;
  }

  // Open or focus window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Check if there's already a window open
        for (let client of windowClients) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle Push Subscription Changes (e.g., expired)
self.addEventListener('pushsubscriptionchange', event => {
  console.log('[Service Worker] Push subscription changed');
  
  // First fetch the VAPID public key from the server
  event.waitUntil(
    fetch('/api/notifications/vapid-public-key')
      .then(res => res.json())
      .then(({ publicKey }) => {
        if (!publicKey) {
          throw new Error('No VAPID public key available');
        }
        return self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
      })
      .then(subscription => {
        console.log('[Service Worker] Re-subscribed to push');
        return fetch('/api/notifications/update-subscription', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(subscription)
        });
      })
      .catch(error => {
        console.error('[Service Worker] Re-subscription failed:', error);
      })
  );
});

// Background Sync (for offline actions)
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-test-results') {
    event.waitUntil(syncTestResults());
  }
});

// Helper: Sync test results when online
async function syncTestResults() {
  try {
    const cache = await caches.open('pending-requests');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        await fetch(request.clone());
        await cache.delete(request);
      } catch (error) {
        console.error('[Service Worker] Failed to sync request:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

// Helper: Convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

console.log('[Service Worker] Loaded successfully');
