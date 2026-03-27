/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

declare let self: ServiceWorkerGlobalScope;

// Badge API type declarations
// Reference: https://developer.mozilla.org/en-US/docs/Web/API/Badging_API
interface NavigatorBadge {
  setAppBadge(count?: number): Promise<void>;
  clearAppBadge(): Promise<void>;
}

declare global {
  interface Navigator extends NavigatorBadge { }
  interface WorkerNavigator extends NavigatorBadge { }
}

// Custom types for events to avoid 'any'
interface SyncEvent extends Event {
  readonly tag: string;
  waitUntil(f: Promise<any>): void;
}

interface PushSubscriptionChangeEvent extends Event {
  readonly oldSubscription?: PushSubscription;
  readonly newSubscription?: PushSubscription;
}

// Use the injected manifest from VitePWA
precacheAndRoute(self.__WB_MANIFEST);

// Cleanup outdated caches
cleanupOutdatedCaches();

// Claim clients immediately
self.skipWaiting();
clientsClaim();

// ============================================
// FIREBASE CLOUD MESSAGING (FCM)
// ============================================

// Firebase configuration
// These should ideally be environment variables, but for the service worker 
// with injectManifest, we'll hardcode them or use a build-time replacement.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Debug logging for SW (standard logs are visible in Application tab > Service Workers)
console.log('[SW-FCM] Config check:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasProjectId: !!firebaseConfig.projectId,
  hasAppId: !!firebaseConfig.appId,
});

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('[SW-FCM] Missing required Firebase configuration. Background messaging will not work.');
} else {
  try {
    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    // Handle background messages
    onBackgroundMessage(messaging, (payload) => {
      console.log('[SW-FCM] Received background message:', payload);
      
      if (payload.notification) {
        const { title, body } = payload.notification;
        self.registration.showNotification(title || 'Nexa Esports', {
          body: body || '',
          icon: '/nexa-logo-ramadan.jpg',
          badge: '/pwa-192x192.png',
          data: payload.data,
        });
      }
    });
    console.log('[SW-FCM] Background messaging initialized');
  } catch (error) {
    console.error('[SW-FCM] Initialization failed:', error);
  }
}

// ============================================
// OFFLINE EXPERIENCE & NETWORK INTERCEPTION
// ============================================

// Cache API responses with NetworkFirst strategy (try network, fallback to cache)
// This ensures fresh data when online, but still works offline
// Only cache Supabase API requests from our configured project
registerRoute(
  ({ url }) => {
    // Check if this is a Supabase API request
    const isSupabaseRequest = url.hostname.endsWith('.supabase.co') ||
      url.hostname.endsWith('.supabase.in');
    const isApiPath = url.pathname.includes('/rest/v1/') ||
      url.pathname.includes('/functions/v1/');

    // Don't cache requests with highly dynamic query parameters (like gte.timestamp)
    // as they will rarely hit the cache and can cause 'no-response' errors
    const hasDynamicQueries = url.search.includes('gte.') ||
      url.search.includes('lte.') ||
      url.search.includes('now');

    return isSupabaseRequest && isApiPath && !hasDynamicQueries;
  },
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      {
        // Custom plugin to only cache successful GET responses
        cacheWillUpdate: async ({ response }) => {
          if (response && response.status === 200 && response.type === 'basic') {
            return response;
          }
          return null;
        },
      },
    ],
  })
);

// ============================================
// PUSH NOTIFICATIONS
// ============================================

// Function to update app badge count using Badge API
// Reference: https://developer.mozilla.org/en-US/docs/Web/API/Badging_API
async function updateBadge(count: number): Promise<void> {
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
    }
  } catch (error) {
    console.warn('Badge API not supported or failed:', error);
  }
}

// Push notification event listener
// Reference: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
self.addEventListener('push', (event: PushEvent) => {
  console.log('[Service Worker] Push event received');

  if (!event.data) {
    console.log('[Service Worker] Push event received but no data');
    return;
  }

  const showNotification = async () => {
    try {
      let data;

      // Try to parse as JSON, fall back to text
      try {
        data = event.data?.json();
      } catch {
        const text = event.data?.text();
        data = { title: 'Nexa Esports', body: text };
      }

      console.log('[Service Worker] Push notification data:', data);

      const title = data.title || 'Nexa Esports';

      // NotificationOptions following MDN Web Notifications API
      // Reference: https://developer.mozilla.org/en-US/docs/Web/API/Notification/Notification
      const options: any = {
        body: data.body || data.message || '',
        icon: data.icon || '/nexa-logo-ramadan.jpg',
        badge: data.badge || '/pwa-192x192.png', // Smaller badge for notification tray
        tag: data.tag || `nexa-notification-${Date.now()}`,
        data: {
          ...data.data,
          url: data.data?.url || data.url || '/dashboard',
          timestamp: data.data?.timestamp || Date.now(),
        },
        actions: (data.actions || [
          { action: 'open', title: 'Open' },
          { action: 'dismiss', title: 'Dismiss' }
        ]) as any,
        requireInteraction: data.requireInteraction ?? false,
        silent: data.silent ?? false,
        // Vibration pattern for mobile devices (MDN Vibration API)
        // Reference: https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
        vibrate: data.vibrate || [100, 50, 100],
        // Timestamp for notification ordering
        timestamp: data.timestamp || Date.now(),
        // Renotify when using the same tag to alert user of update
        renotify: data.renotify ?? true,
      };

      // Add image if provided (large image in notification body)
      if (data.image) {
        options.image = data.image;
      }

      // Show the notification
      await self.registration.showNotification(title, options);

      // Update app badge using Badge API
      await updateBadge(1);

      console.log('[Service Worker] Notification shown successfully');
    } catch (error) {
      console.error('[Service Worker] Error processing push notification:', error);

      // Show a fallback notification if parsing fails
      await self.registration.showNotification('Nexa Esports', {
        body: 'You have a new notification',
        icon: '/nexa-logo-ramadan.jpg',
        badge: '/pwa-192x192.png',
        tag: 'nexa-fallback',
      });
    }
  };

  event.waitUntil(showNotification());
});

// Notification click event listener
// Reference: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/notificationclick_event
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[Service Worker] Notification clicked:', event.notification.tag);

  const notification = event.notification;
  const action = event.action;

  // Close the notification
  notification.close();

  // Clear the badge when notification is clicked
  event.waitUntil(updateBadge(0));

  // Handle different actions
  if (action === 'dismiss') {
    console.log('[Service Worker] Notification dismissed by user');
    return;
  }

  // Default action or 'open' action - open/focus the app
  const targetUrl = notification.data?.url || '/dashboard';
  const urlToOpen = new URL(targetUrl, self.location.origin).href;

  const promiseChain = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    // Check if there's already an open window with the app
    for (const windowClient of windowClients) {
      if (windowClient.url.startsWith(self.location.origin)) {
        // Focus the existing window and navigate to the URL
        return (windowClient as WindowClient).focus().then((client) => {
          if (client && 'navigate' in client) {
            return (client as WindowClient).navigate(urlToOpen);
          }
          return client;
        });
      }
    }
    // If no window is open, open a new one
    return self.clients.openWindow(urlToOpen);
  });

  event.waitUntil(promiseChain);
});

// Notification close event listener
// Reference: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/notificationclose_event
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  console.log('[Service Worker] Notification closed:', event.notification.tag);

  // Clear the badge when notification is dismissed
  event.waitUntil(updateBadge(0));
});

// Push subscription change event listener
self.addEventListener('pushsubscriptionchange', (event: Event) => {
  console.log('[Service Worker] Push subscription changed');

  const pscEvent = event as PushSubscriptionChangeEvent;

  // Re-subscribe with the same options
  const resubscribe = async () => {
    try {
      const subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: pscEvent.oldSubscription?.options?.applicationServerKey
      });

      console.log('[Service Worker] Re-subscribed successfully:', subscription.endpoint);

      // Notify the main app about the new subscription
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({
          type: 'PUSH_SUBSCRIPTION_CHANGED',
          subscription: subscription.toJSON()
        });
      });
    } catch (error) {
      console.error('[Service Worker] Failed to re-subscribe:', error);
    }
  };

  resubscribe();
});

// ============================================
// BACKGROUND SYNC
// ============================================

// Handle background sync for offline actions
self.addEventListener('sync', (event: Event) => {
  const syncEvent = event as SyncEvent;
  console.log('Background sync event:', syncEvent.tag);

  if (syncEvent.tag === 'sync-wallet-transactions') {
    syncEvent.waitUntil(syncWalletTransactions());
  } else if (syncEvent.tag === 'sync-attendance') {
    syncEvent.waitUntil(syncAttendanceData());
  }
});

// Sync wallet transactions when back online
async function syncWalletTransactions() {
  try {
    // Get pending transactions from IndexedDB or cache
    const cache = await caches.open('pending-transactions');
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        const response = await fetch(request.clone());
        if (response.ok) {
          await cache.delete(request);
          console.log('Successfully synced transaction:', request.url);
        }
      } catch (error) {
        console.error('Failed to sync transaction:', error);
      }
    }
  } catch (error) {
    console.error('Error in syncWalletTransactions:', error);
  }
}

// Sync attendance data when back online
async function syncAttendanceData() {
  try {
    const cache = await caches.open('pending-attendance');
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        const response = await fetch(request.clone());
        if (response.ok) {
          await cache.delete(request);
          console.log('Successfully synced attendance:', request.url);
        }
      } catch (error) {
        console.error('Failed to sync attendance:', error);
      }
    }
  } catch (error) {
    console.error('Error in syncAttendanceData:', error);
  }
}

// ============================================
// OFFLINE STATUS & MESSAGE HANDLING
// ============================================

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Handle cache clearing request
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    const clearCache = async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
      event.ports[0]?.postMessage({ success: true });
    };
    clearCache();
  }

  // Handle checking if app data is cached
  if (event.data && event.data.type === 'CHECK_CACHE_STATUS') {
    const checkCache = async () => {
      const hasCache = await caches.has('api-cache');
      event.ports[0]?.postMessage({ cached: hasCache });
    };
    checkCache();
  }
});

// Broadcast online/offline status to all clients
self.addEventListener('online', () => {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'ONLINE' });
    });
  });
});

// Broadcast offline status to all clients
self.addEventListener('offline', () => {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'OFFLINE' });
    });
  });
});

// Handle fetch errors and provide offline fallback
self.addEventListener('fetch', (event: FetchEvent) => {
  // Only handle navigation requests for offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return cached app shell for offline navigation
        return caches.match('/index.html').then(response => response || caches.match('/'));
      }) as Promise<Response>
    );
  }
});
