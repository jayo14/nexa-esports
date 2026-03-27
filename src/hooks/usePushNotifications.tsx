import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { arrayBufferToBase64, urlBase64ToUint8Array } from '@/lib/pushUtils';

export interface PushSubscription {
  id?: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  created_at?: string;
}

// Permission states as per MDN Notification API
// Reference: https://developer.mozilla.org/en-US/docs/Web/API/Notification/permission
type NotificationPermissionState = 'default' | 'granted' | 'denied';

// Badge API type declarations
// Reference: https://developer.mozilla.org/en-US/docs/Web/API/Badging_API
interface NavigatorBadge {
  setAppBadge(count?: number): Promise<void>;
  clearAppBadge(): Promise<void>;
}

declare global {
  interface Navigator extends NavigatorBadge { }
}

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>('default');
  const { toast } = useToast();

  // Check browser support for required APIs
  // Reference: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
  const checkSupport = useCallback(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);

    if (supported) {
      setPermissionState(Notification.permission as NotificationPermissionState);
    }

    return supported;
  }, []);

  useEffect(() => {
    if (checkSupport()) {
      checkSubscription();
    }
  }, [checkSupport]);

  // Listen for subscription changes from service worker
  useEffect(() => {
    if (!isSupported) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        console.log('Push subscription changed, re-checking...');
        checkSubscription();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [isSupported]);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        setIsSubscribed(true);

        // Convert to our format using getKey method
        // Reference: https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription/getKey
        const p256dh = existingSubscription.getKey('p256dh');
        const auth = existingSubscription.getKey('auth');

        if (p256dh && auth) {
          setSubscription({
            user_id: '', // Will be set when user logs in
            endpoint: existingSubscription.endpoint,
            p256dh_key: arrayBufferToBase64(p256dh),
            auth_key: arrayBufferToBase64(auth)
          });
        }
      } else {
        setIsSubscribed(false);
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error checking push subscription:', error);
      setIsSubscribed(false);
    }
  };

  const subscribe = async (userId: string) => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser. Please try Chrome, Firefox, or Edge.",
        variant: "destructive"
      });
      return false;
    }

    // Check if VAPID key is configured
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.error('VAPID public key not configured');
      toast({
        title: "Configuration Error",
        description: "Push notifications are not properly configured. Please contact support.",
        variant: "destructive"
      });
      return false;
    }

    setIsLoading(true);
    try {
      // Request permission using Notification API
      // Reference: https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission
      const permission = await Notification.requestPermission();
      setPermissionState(permission as NotificationPermissionState);

      if (permission !== 'granted') {
        const message = permission === 'denied'
          ? "Notifications are blocked. Please enable them in your browser settings."
          : "Please allow notifications to receive updates about events and announcements.";

        toast({
          title: "Permission Required",
          description: message,
          variant: "destructive"
        });
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription and unsubscribe if needed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        // Update existing subscription in database
        const p256dh = existingSubscription.getKey('p256dh');
        const auth = existingSubscription.getKey('auth');

        if (p256dh && auth) {
          const subscriptionData: PushSubscription = {
            user_id: userId,
            endpoint: existingSubscription.endpoint,
            p256dh_key: arrayBufferToBase64(p256dh),
            auth_key: arrayBufferToBase64(auth)
          };

          const { error } = await supabase
            .from('push_subscriptions')
            .upsert(subscriptionData, {
              onConflict: 'user_id',
              ignoreDuplicates: false
            });

          if (error) throw error;

          setSubscription(subscriptionData);
          setIsSubscribed(true);

          toast({
            title: "Success",
            description: "Push notifications enabled successfully"
          });

          return true;
        }
      }

      // Subscribe to push notifications using Push API
      // Reference: https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, // Required - ensures notifications are visible to user
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      // Get subscription keys
      const p256dh = pushSubscription.getKey('p256dh');
      const auth = pushSubscription.getKey('auth');

      if (!p256dh || !auth) {
        throw new Error('Failed to get subscription keys');
      }

      const subscriptionData: PushSubscription = {
        user_id: userId,
        endpoint: pushSubscription.endpoint,
        p256dh_key: arrayBufferToBase64(p256dh),
        auth_key: arrayBufferToBase64(auth)
      };

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      setSubscription(subscriptionData);
      setIsSubscribed(true);

      toast({
        title: "Success",
        description: "Push notifications enabled successfully"
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);

      // Provide more specific error messages
      let errorMessage = "Failed to enable push notifications. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = "Notification permission was denied.";
        } else if (error.message.includes('key')) {
          errorMessage = "Invalid push notification configuration.";
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (userId: string) => {
    setIsLoading(true);
    try {
      // Remove from database first
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Database error:', error);
        // Continue with local unsubscription even if database fails
      }

      // Unsubscribe from push manager
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();

      if (pushSubscription) {
        await pushSubscription.unsubscribe();
      }

      // Clear app badge using Badge API
      // Reference: https://developer.mozilla.org/en-US/docs/Web/API/Badging_API
      if ('clearAppBadge' in navigator) {
        await navigator.clearAppBadge();
      }

      setSubscription(null);
      setIsSubscribed(false);

      toast({
        title: "Success",
        description: "Push notifications disabled"
      });

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast({
        title: "Error",
        description: "Failed to disable push notifications",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Test if notification can be shown (for debugging)
  const testNotification = async () => {
    if (!isSupported || !isSubscribed) {
      toast({
        title: "Cannot Test",
        description: "Push notifications are not enabled",
        variant: "destructive"
      });
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Test Notification', {
        body: 'This is a test notification from NeXa Esports',
        icon: '/nexa-logo-ramadan.jpg',
        badge: '/pwa-192x192.png',
        tag: 'test-notification',
        vibrate: [100, 50, 100],
        requireInteraction: false
      });
      return true;
    } catch (error) {
      console.error('Error showing test notification:', error);
      return false;
    }
  };

  return {
    isSupported,
    isSubscribed,
    subscription,
    isLoading,
    permissionState,
    subscribe,
    unsubscribe,
    testNotification,
    checkSubscription
  };
};