# Flutterwave Environment Variables - Quick Reference

## Required Environment Variables

All Flutterwave functions now use the following **short naming convention** for environment variables:

### For Supabase Edge Functions (Backend)

```bash
FLW_CLIENT_ID=your_flutterwave_client_id_here
FLW_CLIENT_SECRET=your_flutterwave_client_secret_here
FLW_ENCRYPTION_KEY=your_flutterwave_encryption_key_here
FLW_WEBHOOK_SECRET=your_webhook_secret_here
ENVIRONMENT=production
```

### For Vercel (if deploying frontend separately)

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Setting Environment Variables

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to: **Settings** → **Edge Functions** → **Secrets**
3. Add each environment variable with its value

### Option 2: Supabase CLI
```bash
supabase secrets set FLW_CLIENT_ID=<your_client_id>
supabase secrets set FLW_CLIENT_SECRET=<your_client_secret>
supabase secrets set FLW_ENCRYPTION_KEY=<your_encryption_key>
supabase secrets set FLW_WEBHOOK_SECRET=<your_webhook_secret>
supabase secrets set ENVIRONMENT=production
```

### Option 3: Vercel Dashboard (for frontend)
1. Go to your Vercel project
2. Navigate to: **Settings** → **Environment Variables**
3. Add the required variables for your deployment environment

## Getting Your Credentials

### Flutterwave Dashboard
1. Log in to [Flutterwave Dashboard](https://dashboard.flutterwave.com/)
2. Go to **Settings** → **API Keys**
3. Copy your:
   - **Client ID** → Use as `FLW_CLIENT_ID`
   - **Client Secret** → Use as `FLW_CLIENT_SECRET`
   - **Encryption Key** → Use as `FLW_ENCRYPTION_KEY`

### Webhook Secret
1. In Flutterwave Dashboard, go to **Settings** → **Webhooks**
2. Generate a webhook secret hash
3. Use this value for `FLW_WEBHOOK_SECRET`

## Migration from Old Variable Names

If you previously used longer variable names, here's the mapping:

| Old Name | New Name |
|----------|----------|
| `FLUTTERWAVE_CLIENT_ID` | `FLW_CLIENT_ID` |
| `FLUTTERWAVE_SECRET_KEY` | `FLW_CLIENT_SECRET` |
| `FLUTTERWAVE_ENCRYPTION_KEY` | `FLW_ENCRYPTION_KEY` |
| `FLUTTERWAVE_WEBHOOK_SECRET` | `FLW_WEBHOOK_SECRET` |

**Important:** Delete the old variable names from both Supabase and Vercel to avoid confusion.

## Troubleshooting

### Error: "FLW_CLIENT_ID and FLW_CLIENT_SECRET are required for v4"

**Solution:** Make sure you've set all required environment variables with the correct short names in both:
- Supabase (for edge functions)
- Vercel (if applicable)

After setting the variables, redeploy your edge functions:
```bash
supabase functions deploy
```

### Webhook Returns "Invalid signature"

**Solution:** Ensure `FLW_WEBHOOK_SECRET` matches the webhook secret hash configured in your Flutterwave dashboard.
