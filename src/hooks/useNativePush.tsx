import { useEffect, useState, useCallback } from 'react';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useNativePush = () => {
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsSupported(Capacitor.isNativePlatform());
  }, []);

  const registerPush = useCallback(async (userId: string) => {
    if (!Capacitor.isNativePlatform()) return;

    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      toast({
        title: "Permission Denied",
        description: "Push notifications permission was denied. You won't receive updates.",
        variant: "destructive"
      });
      return;
    }

    await PushNotifications.register();

    // Listeners
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token: ' + token.value);
      setToken(token.value);
      
      // Save token to Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          token: token.value,
          platform: Capacitor.getPlatform(),
          // For native push, we don't need endpoint/p256dh/auth
          endpoint: 'capacitor-native',
          p256dh_key: 'native',
          auth_key: 'native'
        }, { 
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving native push token:', error);
      }
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push received: ' + JSON.stringify(notification));
        // You can show a local toast or update UI here if the app is in foreground
      },
    );

    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
        // Handle notification click, e.g., navigate to a specific page
      },
    );
  }, [toast]);

  const unregisterPush = useCallback(async (userId: string) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await PushNotifications.removeAllListeners();
      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);
        
      setToken(null);
    } catch (e) {
      console.error('Error unregistering push:', e);
    }
  }, []);

  return {
    isSupported,
    token,
    registerPush,
    unregisterPush
  };
};
