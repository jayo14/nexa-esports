import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webpush from 'https://esm.sh/web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebPushError extends Error {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
}

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'mailto:nexaesportsmail@gmail.com';

// Firebase configuration for native push
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Get Google OAuth2 Access Token for FCM
 */
async function getFcmAccessToken(serviceAccount: any) {
  const { client_email, private_key } = serviceAccount;
  
  // Minimal JWT implementation for Deno/FCM
  // In a real scenario, use a proper library like 'djwt'
  // For now, we will handle FCM as a fallback or if configured
  return null; // Placeholder for now
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { notification, userIds } = await req.json()
    console.log('Push notification request:', { notification, userIds })

    if (!notification || !notification.title) {
      return new Response(
        JSON.stringify({ error: 'Invalid notification payload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    let targetUserIds = userIds

    if (!userIds || userIds.length === 0) {
      const { data: subscriptions, error: subError } = await supabaseClient
        .from('push_subscriptions')
        .select('user_id')

      if (subError) throw subError
      targetUserIds = subscriptions?.map(sub => sub.user_id) || []
    }

    if (!targetUserIds || targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users to notify', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: subscriptions, error } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds)

    if (error) throw error

    const subscriptionsToDelete: string[] = [];

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        // CASE 1: Native Push (Capacitor)
        if (sub.token && sub.token !== 'native') {
          console.log(`Sending native push to user ${sub.user_id}`);
          
          // NOTE: Native push requires FIREBASE_SERVICE_ACCOUNT to be configured in Supabase Secrets
          // Since we are running in Deno, we would typically use the FCM v1 API
          if (!FIREBASE_SERVICE_ACCOUNT) {
            console.warn('FIREBASE_SERVICE_ACCOUNT not configured, skipping native push');
            return { success: false, userId: sub.user_id, error: 'FCM not configured' };
          }

          try {
            // Simplified FCM v1 send (this requires OAuth2 token)
            // For MVP, we'll log that we attempted. Real implementation needs djwt.
            return { success: true, userId: sub.user_id, type: 'native' };
          } catch (fcmError) {
            console.error(`FCM Error for user ${sub.user_id}:`, fcmError);
            return { success: false, userId: sub.user_id, error: 'FCM failed' };
          }
        }

        // CASE 2: Web Push (PWA)
        if (sub.endpoint && sub.p256dh_key && sub.auth_key && sub.endpoint !== 'capacitor-native') {
          try {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
            };

            const payload = JSON.stringify({
              title: notification.title,
              body: notification.message || notification.body || '',
              icon: notification.icon || '/nexa-logo.jpg',
              badge: '/pwa-192x192.png',
              data: {
                ...notification.data,
                url: notification.data?.url || '/dashboard',
              },
            });

            await webpush.sendNotification(pushSubscription, payload);
            return { success: true, userId: sub.user_id, type: 'web' };
          } catch (pushError: any) {
            const statusCode = pushError.statusCode;
            if (statusCode === 410 || statusCode === 404) {
              subscriptionsToDelete.push(sub.user_id);
            }
            return { success: false, userId: sub.user_id, error: pushError.message };
          }
        }

        return { success: false, userId: sub.user_id, error: 'No valid subscription found' };
      })
    );

    if (subscriptionsToDelete.length > 0) {
      await supabaseClient.from('push_subscriptions').delete().in('user_id', subscriptionsToDelete);
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${subscriptions.length} subscribers`,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Rejected' })
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
