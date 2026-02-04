# Migration Complete: Flutterwave Environment Variables

## What Changed

All Flutterwave-related functions now use **shorter environment variable names** for consistency and ease of use.

### Variable Name Changes

| Old Name (Longer) | New Name (Shorter) | Status |
|-------------------|-------------------|---------|
| `FLUTTERWAVE_ENCRYPTION_KEY` | `FLW_ENCRYPTION_KEY` | ✅ Updated |
| `FLUTTERWAVE_WEBHOOK_SECRET` | `FLW_WEBHOOK_SECRET` | ✅ Updated |
| `FLUTTERWAVE_CLIENT_ID` | `FLW_CLIENT_ID` | Already using short name |
| `FLUTTERWAVE_SECRET_KEY` | `FLW_CLIENT_SECRET` | Already using short name |

## Required Environment Variables

You need to set these 4 environment variables in both **Supabase** and **Vercel**:

```bash
FLW_CLIENT_ID=your_flutterwave_client_id_here
FLW_CLIENT_SECRET=your_flutterwave_client_secret_here
FLW_ENCRYPTION_KEY=your_flutterwave_encryption_key_here
FLW_WEBHOOK_SECRET=your_webhook_secret_here
```

## Action Items

### 1. Update Supabase Environment Variables

#### Option A: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. **Remove** these old variables (if they exist):
   - `FLUTTERWAVE_ENCRYPTION_KEY`
   - `FLUTTERWAVE_WEBHOOK_SECRET`
4. **Add** these new variables:
   - `FLW_ENCRYPTION_KEY` (use the same value as old FLUTTERWAVE_ENCRYPTION_KEY)
   - `FLW_WEBHOOK_SECRET` (use the same value as old FLUTTERWAVE_WEBHOOK_SECRET)

#### Option B: Using Supabase CLI
```bash
# Remove old variables (if they exist)
supabase secrets unset FLUTTERWAVE_ENCRYPTION_KEY
supabase secrets unset FLUTTERWAVE_WEBHOOK_SECRET

# Set new variables
supabase secrets set FLW_ENCRYPTION_KEY=<your_encryption_key>
supabase secrets set FLW_WEBHOOK_SECRET=<your_webhook_secret>

# Verify all required variables are set
supabase secrets list
```

### 2. Update Vercel Environment Variables (if applicable)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. **Remove** old variables:
   - `FLUTTERWAVE_ENCRYPTION_KEY`
   - `FLUTTERWAVE_WEBHOOK_SECRET`
4. **Add** new variables:
   - `FLW_ENCRYPTION_KEY`
   - `FLW_WEBHOOK_SECRET`

### 3. Redeploy Edge Functions

After updating the environment variables, redeploy your edge functions:

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy flutterwave-initiate-payment
supabase functions deploy flutterwave-verify-payment
supabase functions deploy flutterwave-webhook
supabase functions deploy flutterwave-transfer
supabase functions deploy flutterwave-get-banks
supabase functions deploy flutterwave-verify-bank-account
supabase functions deploy flutterwave-get-transactions
```

## Testing

After completing the above steps, test the payment flow:

1. Try to initiate a payment
2. Verify the payment completes successfully
3. Check that the webhook receives notifications

If you encounter the error:
```
"Payment service not configured: FLW_CLIENT_ID and FLW_CLIENT_SECRET are required for v4"
```

This means the environment variables are not set correctly. Double-check that:
- All 4 variables are set in Supabase
- Variable names match exactly (case-sensitive)
- Functions have been redeployed after setting variables

## Files Updated

The following files were updated in this PR:

1. **Code Files:**
   - `supabase/functions/flutterwave-webhook/index.ts` - Updated to use FLW_* variables

2. **Configuration:**
   - `.env.example` - Updated variable names

3. **Documentation:**
   - `FLUTTERWAVE_V4_MIGRATION_SUMMARY.md`
   - `docs/MIGRATION_SUMMARY.md`
   - `docs/FLUTTERWAVE_INTEGRATION.md`
   - `docs/FLUTTERWAVE_DEPLOYMENT_GUIDE.md`

4. **New Files:**
   - `ENV_VARIABLES_QUICK_REFERENCE.md` - Quick reference guide
   - `MIGRATION_COMPLETE.md` - This file

## Need Help?

Refer to these documents for more details:
- `ENV_VARIABLES_QUICK_REFERENCE.md` - Quick reference for all environment variables
- `docs/FLUTTERWAVE_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `docs/FLUTTERWAVE_INTEGRATION.md` - Integration guide

## Verification Checklist

- [ ] Updated Supabase environment variables (removed old, added new)
- [ ] Updated Vercel environment variables (if applicable)
- [ ] Redeployed edge functions
- [ ] Tested payment initiation
- [ ] Verified webhook receives notifications
- [ ] Confirmed no errors in Supabase logs

Once all items are checked, your Flutterwave integration should be working with the new shorter variable names! 🎉
