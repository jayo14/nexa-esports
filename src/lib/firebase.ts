// Firebase Cloud Messaging (FCM) Configuration
// This file initializes Firebase for push notifications
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics';
import { supabase } from '@/integrations/supabase/client';
import { arrayBufferToBase64 } from '@/lib/pushUtils';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Debug log for production (safe values)
console.log('[FCM] Firebase Config check:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasProjectId: !!firebaseConfig.projectId,
  hasAppId: !!firebaseConfig.appId,
  hasSenderId: !!firebaseConfig.messagingSenderId,
});

let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let analytics: Analytics | null = null;

/**
 * Initialize Firebase App
 */
export const initializeFirebase = (): FirebaseApp | null => {
  try {
    // Check if Firebase is already initialized
    if (getApps().length > 0) {
      firebaseApp = getApps()[0];
      return firebaseApp;
    }

    // Validate configuration
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.warn('[FCM] Firebase configuration not found in environment variables');
      return null;
    }

    firebaseApp = initializeApp(firebaseConfig);
    console.log('[FCM] Firebase initialized successfully');

    // Initialize Analytics if supported
    isSupported().then(yes => {
      if (yes) {
        analytics = getAnalytics(firebaseApp!);
        console.log('[FCM] Firebase Analytics initialized');
      }
    });

    return firebaseApp;
  } catch (error) {
    console.error('[FCM] Error initializing Firebase:', error);
    return null;
  }
};

/**
 * Get Firebase Messaging instance
 */
export const getFirebaseMessaging = (): Messaging | null => {
  try {
    if (!firebaseApp) {
      firebaseApp = initializeFirebase();
    }

    if (!firebaseApp) {
      return null;
    }

    if (!messaging) {
      messaging = getMessaging(firebaseApp);
    }

    return messaging;
  } catch (error) {
    console.error('[FCM] Error getting messaging instance:', error);
    return null;
  }
};

/**
 * Request notification permission and get FCM token
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('[FCM] Notification permission denied');
      return null;
    }

    const messagingInstance = getFirebaseMessaging();
    if (!messagingInstance) {
      console.warn('[FCM] Messaging instance not available');
      return null;
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('[FCM] VAPID key not found');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;

    let token: string | null = null;
    try {
      token = await getToken(messagingInstance, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
    } catch (tokenError: any) {
      if (tokenError.code === 'messaging/unsupported-browser') {
        console.error('[FCM] getToken failed: Browser does not support FCM or service worker is not registered correctly.', tokenError);
      } else if (tokenError.code === 'messaging/permission-blocked') {
        console.error('[FCM] getToken failed: Notification permission blocked by user or browser settings.', tokenError);
      } else if (tokenError.code === 'messaging/token-unsubscribe-failed') {
        console.error('[FCM] getToken failed: Failed to unsubscribe from previous token.', tokenError);
      } else {
        console.error('[FCM] getToken failed with unknown error:', tokenError);
      }
      return null;
    }

    if (!token) {
      throw new Error('FCM Token generation returned null');
    }

    console.log('[FCM] Token generated successfully');
    console.log('[FCM] Token obtained:', token);
    return token;
  } catch (error) {
    console.error('[FCM] Error requesting notification permission:', error);
    return null;
  }
};

/**
 * Subscribe to FCM push notifications
 */
export const subscribeToPushNotifications = async (userId: string): Promise<boolean> => {
  try {
    const token = await requestNotificationPermission();
    
    if (!token) {
      return false;
    }

    // Save token to database
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        token: token,
        endpoint: 'fcm',
        p256dh_key: '',
        auth_key: '',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('[FCM] Error saving subscription:', error);
      return false;
    }

    console.log('[FCM] Subscription saved successfully');
    return true;
  } catch (error) {
    console.error('[FCM] Error subscribing to push notifications:', error);
    return false;
  }
};

/**
 * Listen for foreground messages
 */
export const onForegroundMessage = (callback: (payload: any) => void) => {
  const messagingInstance = getFirebaseMessaging();
  
  if (!messagingInstance) {
    console.warn('[FCM] Cannot listen for messages: messaging not initialized');
    return () => {};
  }

  return onMessage(messagingInstance, (payload) => {
    console.log('[FCM] Foreground message received:', payload);
    callback(payload);
  });
};

/**
 * Check if FCM is properly configured
 */
export const isFCMConfigured = (): boolean => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    import.meta.env.VITE_FIREBASE_VAPID_KEY
  );
};
