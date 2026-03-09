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

// Firebase configuration for FCM v1 API
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');
const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY');
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL');

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Get Google OAuth2 Access Token for FCM v1 API
 * Uses service account credentials to generate a JWT token
 */
async function getFcmAccessToken(): Promise<string | null> {
  if (!FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PROJECT_ID) {
    console.warn('[FCM] Firebase service account credentials not configured');
    return null;
  }

  try {
    // Create JWT for Google OAuth2
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const payload = {
      iss: FIREBASE_CLIENT_EMAIL,
      sub: FIREBASE_CLIENT_EMAIL,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiry,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    };

    // Use Web Crypto API to sign JWT
    // Note: For production, consider using a JWT library like 'djwt'
    // This is a simplified implementation
    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const message = `${headerB64}.${payloadB64}`;

    // Import private key
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const keyData = await crypto.subtle.importKey(
      'pkcs8',
      new TextEncoder().encode(privateKey),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    // Sign the JWT
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      keyData,
      encoder.encode(message)
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const jwt = `${message}.${signatureB64}`;

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error('[FCM] Error getting access token:', error);
    return null;
  }
}

/**
 * Send FCM push notification using v1 API
 */
async function sendFcmNotification(token: string, notification: any): Promise<boolean> {
  const accessToken = await getFcmAccessToken();

  if (!accessToken) {
    console.error('[FCM] No access token available');
    return false;
  }

  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;

  const message = {
    message: {
      token,
      notification: {
        title: notification.title,
        body: notification.message || notification.body || '',
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'nexa_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      webpush: {
        notification: {
          icon: notification.icon || '/nexa-logo-ramadan.jpg',
          badge: '/pwa-192x192.png',
        },
      },
    },
  };

  try {
    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[FCM] Send failed:', error);
      return false;
    }

    console.log('[FCM] Notification sent successfully');
    return true;
  } catch (error) {
    console.error('[FCM] Error sending notification:', error);
    return false;
  }
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
        // CASE 1: FCM Token (Native Push via Firebase)
        if (sub.token && sub.token !== 'native' && sub.token.length > 50) {
          console.log(`[FCM] Sending push to user ${sub.user_id}`);

          const success = await sendFcmNotification(sub.token, notification);

          if (!success) {
            // Token might be invalid, mark for deletion
            subscriptionsToDelete.push(sub.user_id);
            return { success: false, userId: sub.user_id, error: 'FCM failed', type: 'fcm' };
          }

          return { success: true, userId: sub.user_id, type: 'fcm' };
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
              icon: notification.icon || '/nexa-logo-ramadan.jpg',
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
            return { success: false, userId: sub.user_id, error: pushError.message, type: 'web' };
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
