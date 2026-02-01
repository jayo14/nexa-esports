# Firebase Cloud Messaging (FCM) Push Notifications Setup Guide

## Overview
This application supports push notifications through Firebase Cloud Messaging (FCM) for both web (PWA) and native mobile platforms (iOS and Android via Capacitor).

## Architecture

### Push Notification Flow
```
┌─────────────┐
│   User App  │
│  (Frontend) │
└──────┬──────┘
       │ 1. Request notification permission
       │ 2. Get FCM token / Web Push subscription
       │ 3. Save to Supabase
       ▼
┌──────────────┐
│  Supabase DB │
│  push_subs   │
└──────┬───────┘
       │
       ▼
┌────────────────┐     4. Admin sends notification
│ Supabase Edge  │◄────────────────────────
│   Function     │
└────────┬───────┘
         │ 5a. Send via FCM (native)
         │ 5b. Send via Web Push (PWA)
         ▼
┌─────────────────┐
│  User Devices   │
│ iOS/Android/Web │
└─────────────────┘
```

### Supported Platforms
1. **Web (PWA)**: Using Web Push API with VAPID keys
2. **iOS**: Using FCM via Capacitor Push Notifications plugin
3. **Android**: Using FCM via Capacitor Push Notifications plugin

## Required Environment Variables

### Frontend Variables (Vite - add to `.env`)

These variables are used by the frontend Firebase SDK:

```bash
# Firebase Web App Configuration
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_FIREBASE_VAPID_KEY=BAbCdEfGhIjKlMnOpQrStUvWxYz1234567890

# Web Push VAPID Public Key (for PWA)
VITE_VAPID_PUBLIC_KEY=BAbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

**Where to find these:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (⚙️ icon)
4. Under **Your apps**, select or add a Web app
5. Copy the configuration values
6. For VAPID key: Go to **Cloud Messaging** tab > **Web configuration** > **Web Push certificates**

### Backend Variables (Supabase Edge Functions)

These variables are used by the Supabase Edge Function for server-side push notifications:

#### Option 1: VAPID Keys (for Web Push)
```bash
# Web Push VAPID Keys
VAPID_PUBLIC_KEY=BAbCdEfGhIjKlMnOpQrStUvWxYz1234567890
VAPID_PRIVATE_KEY=yOuR_PrIvAtE_VaPiD_KeY_HeRe
VAPID_EMAIL=mailto:your-email@example.com
```

**Generate VAPID keys:**
```bash
npx web-push generate-vapid-keys
```

#### Option 2: Firebase Service Account (for FCM native push)
```bash
# Firebase Service Account for FCM v1 API
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

**Where to find these:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (⚙️ icon)
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download the JSON file
7. Extract values:
   - `FIREBASE_PROJECT_ID`: `project_id` field
   - `FIREBASE_PRIVATE_KEY`: `private_key` field (keep the \n characters)
   - `FIREBASE_CLIENT_EMAIL`: `client_email` field

**Setting in Supabase:**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** > **Edge Functions**
4. Add each variable as a secret

## Setup Instructions

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project**
3. Enter project name and follow the wizard
4. Enable Google Analytics (optional)

### Step 2: Enable Cloud Messaging

1. In Firebase Console, go to your project
2. Click on **Cloud Messaging** in the left sidebar (under Build)
3. Note: FCM is enabled by default in new Firebase projects

### Step 3: Configure Web App

1. In Firebase Console, go to **Project Settings**
2. Scroll to **Your apps** section
3. Click **Add app** > **Web** (</>) icon
4. Register your app:
   - App nickname: "NeXa Esports Web"
   - Check "Also set up Firebase Hosting" (optional)
5. Copy the configuration object
6. Click **Continue to console**

### Step 4: Get Web Push Certificate (VAPID Key)

1. In Firebase Console, go to **Project Settings**
2. Click on **Cloud Messaging** tab
3. Scroll to **Web configuration** section
4. Under **Web Push certificates**, click **Generate key pair**
5. Copy the key pair (this is your `VITE_FIREBASE_VAPID_KEY`)

### Step 5: Setup iOS (Optional)

1. In Firebase Console, go to **Project Settings**
2. Click **Add app** > **iOS** icon
3. Enter iOS bundle ID (from your `ios/App/App.xcodeproj`)
4. Download `GoogleService-Info.plist`
5. Add file to `ios/App/App/` directory
6. Follow Capacitor setup instructions

### Step 6: Setup Android (Optional)

1. In Firebase Console, go to **Project Settings**
2. Click **Add app** > **Android** icon
3. Enter Android package name (from `android/app/build.gradle`)
4. Download `google-services.json`
5. Add file to `android/app/` directory

### Step 7: Generate VAPID Keys for Web Push

```bash
# Install web-push globally (if not installed)
npm install -g web-push

# Generate keys
npx web-push generate-vapid-keys

# Output:
# =======================================
# Public Key:
# BAbCdEfGhIjKlMnOpQrStUvWxYz...
#
# Private Key:
# yOuR_PrIvAtE_VaPiD_KeY_HeRe
# =======================================
```

### Step 8: Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Fill in all Firebase variables from steps above
3. Add VAPID keys for web push
4. For Supabase Edge Functions, add secrets:

```bash
# Using Supabase CLI
supabase secrets set FIREBASE_PROJECT_ID=your-project-id
supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
supabase secrets set FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@...
supabase secrets set VAPID_PUBLIC_KEY=BAbCdEfGhIjKlMnOpQr...
supabase secrets set VAPID_PRIVATE_KEY=yOuR_PrIvAtE_VaPiD...
supabase secrets set VAPID_EMAIL=mailto:your-email@example.com
```

### Step 9: Update Service Worker Configuration

The Firebase service worker (`public/firebase-messaging-sw.js`) needs Firebase config at runtime.

**Option A: Environment variable replacement (recommended)**

Update your build script to replace placeholders:

```json
{
  "scripts": {
    "build": "vite build && node scripts/replace-firebase-config.js"
  }
}
```

Create `scripts/replace-firebase-config.js`:

```javascript
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../dist/firebase-messaging-sw.js');
const swContent = fs.readFileSync(swPath, 'utf8');

const replaced = swContent
  .replace('__FIREBASE_API_KEY__', process.env.VITE_FIREBASE_API_KEY)
  .replace('__FIREBASE_AUTH_DOMAIN__', process.env.VITE_FIREBASE_AUTH_DOMAIN)
  .replace('__FIREBASE_PROJECT_ID__', process.env.VITE_FIREBASE_PROJECT_ID)
  .replace('__FIREBASE_STORAGE_BUCKET__', process.env.VITE_FIREBASE_STORAGE_BUCKET)
  .replace('__FIREBASE_MESSAGING_SENDER_ID__', process.env.VITE_FIREBASE_MESSAGING_SENDER_ID)
  .replace('__FIREBASE_APP_ID__', process.env.VITE_FIREBASE_APP_ID);

fs.writeFileSync(swPath, replaced);
console.log('Firebase service worker configured successfully!');
```

**Option B: Hard-code values** (less secure, not recommended for production)

Edit `public/firebase-messaging-sw.js` and replace placeholders directly.

### Step 10: Deploy Edge Function

```bash
# Deploy the send-push-notification function
supabase functions deploy send-push-notification

# Or deploy all functions
supabase functions deploy
```

## Usage

### 1. Request Permission (Frontend)

```typescript
import { subscribeToPushNotifications, isFCMConfigured } from '@/lib/firebase';

// Check if FCM is configured
if (isFCMConfigured()) {
  // Request permission and subscribe
  const success = await subscribeToPushNotifications(userId);
  if (success) {
    console.log('Push notifications enabled!');
  }
}
```

### 2. Send Notification (Backend/Admin)

```typescript
import { sendPushNotification } from '@/lib/pushNotifications';

// Send to specific users
await sendPushNotification(
  ['user-id-1', 'user-id-2'],
  {
    title: 'New Tournament!',
    message: 'Join the NeXa Clan Tournament starting now!',
    data: {
      url: '/tournaments/123',
      type: 'tournament',
    },
  }
);

// Broadcast to all users
await sendBroadcastPushNotification({
  title: 'System Announcement',
  message: 'Server maintenance tonight at 11 PM',
});
```

### 3. Handle Foreground Messages

```typescript
import { onForegroundMessage } from '@/lib/firebase';

// Listen for messages when app is open
onForegroundMessage((payload) => {
  console.log('Received message:', payload);
  
  // Show custom notification or toast
  toast({
    title: payload.notification.title,
    description: payload.notification.body,
  });
});
```

## Testing

### Test Web Push (PWA)

1. Open app in Chrome/Firefox (desktop or mobile)
2. Open DevTools > Application > Service Workers
3. Check "Update on reload"
4. Click "Allow" when prompted for notifications
5. Send test notification from admin panel
6. Check browser notifications

### Test FCM (Native)

1. Build app for iOS/Android:
   ```bash
   npm run cap:build
   npm run cap:open-ios  # or cap:open-android
   ```
2. Run on device/simulator
3. Allow notifications when prompted
4. Send test notification from admin panel
5. Check device notifications

### Debug Mode

Enable debug logging:

```typescript
// In firebase.ts
const firebaseApp = initializeApp(firebaseConfig);
const messaging = getMessaging(firebaseApp);

// Enable debug mode
import { isSupported, getToken } from 'firebase/messaging';
isSupported().then(supported => {
  console.log('[FCM] Messaging supported:', supported);
});
```

## Troubleshooting

### Common Issues

#### 1. "Firebase not configured" error
- **Cause**: Environment variables missing or incorrect
- **Solution**: Verify all `VITE_FIREBASE_*` variables are set correctly

#### 2. Service worker registration fails
- **Cause**: HTTPS required for service workers
- **Solution**: Use localhost for development or deploy to HTTPS domain

#### 3. FCM token not generated
- **Cause**: VAPID key mismatch or missing
- **Solution**: Ensure `VITE_FIREBASE_VAPID_KEY` matches Firebase console

#### 4. Notifications not received on iOS
- **Cause**: APNs certificate not configured
- **Solution**: Add APNs authentication key in Firebase Console > Project Settings > Cloud Messaging

#### 5. Edge function fails with "OAuth2 error"
- **Cause**: Firebase service account credentials incorrect
- **Solution**: Re-download service account JSON and update Supabase secrets

### Debug Checklist

- [ ] Firebase project created and enabled
- [ ] All environment variables set correctly
- [ ] VAPID keys generated and match between frontend/backend
- [ ] Service worker registered successfully (`navigator.serviceWorker.ready`)
- [ ] Notification permission granted (`Notification.permission === 'granted'`)
- [ ] FCM token/subscription saved to database
- [ ] Supabase Edge Function secrets configured
- [ ] Edge function deployed and running
- [ ] Browser/device supports notifications

## Security Considerations

1. **Never commit real Firebase credentials to Git**
   - Add `.env` to `.gitignore`
   - Use `.env.example` as template only

2. **Rotate keys regularly**
   - Generate new VAPID keys periodically
   - Update Firebase service account credentials

3. **Validate notification payloads**
   - Sanitize user input in notification messages
   - Limit notification frequency to prevent spam

4. **Use Firebase Security Rules**
   - Restrict who can send push notifications
   - Implement rate limiting

## Cost Considerations

- **FCM**: Free for unlimited messages
- **Web Push**: Free (VAPID-based)
- **Supabase Edge Functions**: Included in free tier (up to 500K requests/month)

## Additional Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Web Push API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Summary

With FCM properly configured, your app will support:
- ✅ Web push notifications (PWA)
- ✅ iOS push notifications (native)
- ✅ Android push notifications (native)
- ✅ Targeted notifications to specific users
- ✅ Broadcast notifications to all users
- ✅ Foreground and background notifications
- ✅ Click handling with deep linking

**Minimum Required Environment Variables:**
- Frontend: 8 variables (`VITE_FIREBASE_*`)
- Backend: 6 variables (3 for VAPID + 3 for FCM)
- Total: 14 environment variables for full functionality
