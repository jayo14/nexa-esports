# Deployment Guide: Flutterwave Live Integration

## Overview
This guide walks through deploying the new Flutterwave live integration with server-side payment initiation.

## Prerequisites
1. Flutterwave live account with API credentials
2. Supabase account with edge functions enabled
3. Access to Supabase project secrets

## Step 1: Get Flutterwave Live Credentials

1. Log in to your [Flutterwave Dashboard](https://dashboard.flutterwave.com/)
2. Navigate to **Settings** > **API Keys**
3. Switch to **Live Mode** (toggle in top-right corner)
4. Copy the following credentials:
   - **Client ID** (if available)
   - **Secret Key** (starts with `FLWSECK-`)
   - **Encryption Key** (starts with `FLWSECK-`)
5. Navigate to **Settings** > **Webhooks**
6. Generate a webhook secret hash and save it

## Step 2: Configure Supabase Edge Functions

### Option A: Using Supabase Dashboard
1. Go to your Supabase project
2. Navigate to **Edge Functions** > **Secrets**
3. Add the following secrets:
   ```
   FLUTTERWAVE_CLIENT_ID=<your_live_client_id>
   FLUTTERWAVE_SECRET_KEY=<your_live_secret_key>
   FLUTTERWAVE_ENCRYPTION_KEY=<your_live_encryption_key>
   FLUTTERWAVE_WEBHOOK_SECRET=<your_webhook_secret>
   ENVIRONMENT=production
   ```

### Option B: Using Supabase CLI
```bash
# Set secrets via CLI
supabase secrets set FLUTTERWAVE_CLIENT_ID=<your_live_client_id>
supabase secrets set FLUTTERWAVE_SECRET_KEY=<your_live_secret_key>
supabase secrets set FLUTTERWAVE_ENCRYPTION_KEY=<your_live_encryption_key>
supabase secrets set FLUTTERWAVE_WEBHOOK_SECRET=<your_webhook_secret>
supabase secrets set ENVIRONMENT=production
```

## Step 3: Deploy Edge Functions

### Deploy the new payment initiation function:
```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Deploy the new function
supabase functions deploy flutterwave-initiate-payment

# Verify deployment
supabase functions list
```

### Verify existing functions are still deployed:
```bash
# These should already be deployed, but verify:
supabase functions deploy flutterwave-webhook
supabase functions deploy flutterwave-verify-payment
supabase functions deploy flutterwave-transfer
supabase functions deploy flutterwave-get-banks
supabase functions deploy flutterwave-verify-bank-account
```

## Step 4: Configure Flutterwave Webhooks

1. Go to [Flutterwave Dashboard](https://dashboard.flutterwave.com/)
2. Navigate to **Settings** > **Webhooks**
3. Set webhook URL to: `https://<your-supabase-project>.supabase.co/functions/v1/flutterwave-webhook`
4. Enable the following events:
   - `charge.completed`
5. Save the configuration

## Step 5: Test the Integration

### Test Payment Flow
1. Navigate to your application's wallet page
2. Click "Fund Wallet"
3. Enter an amount (minimum ₦500)
4. Click "Pay"
5. You should be redirected to Flutterwave's hosted payment page
6. Complete a test payment using a live card
7. Verify you're redirected back to the success page
8. Check that your wallet balance is credited correctly

### Test Withdrawal Flow
1. Ensure you have funds in your wallet
2. Click "Withdraw"
3. Enter bank details and amount
4. Submit withdrawal
5. Verify the transaction is processed

### Monitor Logs
```bash
# View edge function logs
supabase functions logs flutterwave-initiate-payment
supabase functions logs flutterwave-webhook
supabase functions logs flutterwave-verify-payment
```

## Step 6: Verify Frontend Deployment

Ensure your frontend is deployed with the latest changes:
1. The `flutterwave-react-v3` package should be removed
2. No references to `VITE_FLUTTERWAVE_PUBLIC_KEY` should exist
3. Wallet.tsx should use the new server-side payment initiation

## Rollback Plan

If you need to rollback:

1. **Restore previous environment variables** (if you had test keys):
   ```bash
   supabase secrets set VITE_FLUTTERWAVE_PUBLIC_KEY=<old_test_key>
   ```

2. **Redeploy previous version**:
   ```bash
   git revert HEAD~2
   # Redeploy frontend and edge functions
   ```

3. **Switch Flutterwave to test mode** in dashboard

## Troubleshooting

### Payment initiation fails
- Verify `FLUTTERWAVE_SECRET_KEY` is set correctly
- Check edge function logs for detailed error messages
- Ensure ENVIRONMENT is set to `production`

### Webhook not receiving notifications
- Verify webhook URL is correct
- Check webhook secret matches in both Flutterwave dashboard and Supabase secrets
- Verify `charge.completed` event is enabled

### Wallet not credited after payment
- Check `flutterwave-verify-payment` function logs
- Verify transaction in Flutterwave dashboard
- Check if transaction is marked as duplicate

## Support

For issues:
1. Check Supabase edge function logs
2. Check Flutterwave transaction logs in dashboard
3. Review `FLUTTERWAVE_INTEGRATION.md` for detailed API documentation
4. Contact Flutterwave support: support@flutterwave.com

## Security Reminders

✅ Never commit API keys to git  
✅ Use environment variables for all secrets  
✅ Regularly rotate webhook secrets  
✅ Monitor transaction logs for anomalies  
✅ Keep Flutterwave SDK dependencies updated  

## Checklist Before Going Live

- [ ] All Flutterwave live credentials configured in Supabase
- [ ] All edge functions deployed successfully
- [ ] Webhook configured and tested
- [ ] Test payment completed successfully
- [ ] Test withdrawal completed successfully
- [ ] Logs monitored for errors
- [ ] Frontend deployed with latest changes
- [ ] Backup and rollback plan documented
- [ ] Team notified of deployment

---

**Last Updated**: 2026-01-07  
**Version**: 1.0  
**Author**: GitHub Copilot
