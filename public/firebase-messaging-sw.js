// Firebase Cloud Messaging Service Worker
// This service worker handles background push notifications
// Reference: https://firebase.google.com/docs/cloud-messaging/js/receive

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// These values will be replaced by environment variables at build time
// or can be configured through the app's initialization
const firebaseConfig = {
  apiKey: '__FIREBASE_API_KEY__',
  authDomain: '__FIREBASE_AUTH_DOMAIN__',
  projectId: '__FIREBASE_PROJECT_ID__',
  storageBucket: '__FIREBASE_STORAGE_BUCKET__',
  messagingSenderId: '__FIREBASE_MESSAGING_SENDER_ID__',
  appId: '__FIREBASE_APP_ID__',
};

// Check if config is placeholder (not replaced)
const isConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('__');

if (isConfigured) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
      console.log('[FCM SW] Received background message:', payload);

      const notificationTitle = payload.notification?.title || payload.data?.title || 'NeXa Esports';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'You have a new notification',
        icon: payload.notification?.icon || payload.data?.icon || '/nexa-logo-ramadan.jpg',
        badge: '/pwa-192x192.png',
        tag: payload.data?.tag || 'nexa-notification',
        data: payload.data || {},
        requireInteraction: false,
        actions: [
          {
            action: 'open',
            title: 'Open',
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
          },
        ],
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (error) {
    console.error('[FCM SW] Error initializing Firebase:', error);
  }
} else {
  console.warn('[FCM SW] Firebase not configured. Set environment variables.');
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open the app or navigate to specific URL
  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: event.notification.data,
          });
          return client.focus();
        }
      }

      // Open new window if no matching client found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Log service worker activation
self.addEventListener('activate', (event) => {
  console.log('[FCM SW] Service worker activated');
});
