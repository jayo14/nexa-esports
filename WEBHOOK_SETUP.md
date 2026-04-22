# Webhook Configuration Guide

## Overview
Webhooks enable automatic wallet balance updates when payments succeed or fail. When Paga processes a transaction, it sends a webhook event to your system which immediately updates the wallet balance without waiting for user verification.

## Paga Webhook Setup

### 1. Get Your Webhook URL
Your Paga webhook endpoint is:
```
https://<your-project-id>.supabase.co/functions/v1/paga-webhook
```

Replace `<your-project-id>` with your Supabase project ID (visible in your Supabase URL).

### 2. Configure Webhook in Paga Dashboard
1. Log in to [Paga Business Dashboard](https://www.mypaga.com)
2. Navigate to **Settings → Webhooks** (or API Settings)
3. Add a new webhook endpoint with:
   - **URL**: `https://<your-project-id>.supabase.co/functions/v1/paga-webhook`
   - **Events**: Select "Payment Completed" or "Transaction Status"
   - **Method**: POST
4. Save and note any webhook secret key (if required)

### 3. Configure Environment Variables
Ensure these environment variables are set in your Supabase project:

```
PAGA_PUBLIC_KEY=<your-paga-public-key>
PAGA_API_PASSWORD=<your-paga-api-password>
PAGA_HASH_KEY=<your-paga-hash-key>
PAGA_IS_SANDBOX=true  # Set to "false" for production
```

### 4. Test the Webhook
Make a test payment in the Paga sandbox:
- User initiates a deposit
- Completes payment on Paga checkout
- Webhook event fires automatically
- Wallet balance updates immediately without user needing to reload

## Webhook Security

### Signature Verification
The webhook handler validates incoming requests:
- Calculates expected hash using: `referenceNumber`, `amount`, `statusCode`, and `PAGA_HASH_KEY`
- Compares with `hash` header from Paga
- Rejects requests with invalid signatures (status 401)
- In sandbox mode, accepts unsigned requests if no hash is provided

### Idempotency
- Webhooks are idempotent by transaction reference
- Duplicate webhook events won't double-credit the wallet
- Handled by `wallet_enqueue_settlement()` RPC

## Transaction Flow with Webhook

### Without Webhook (Client Verification Only)
```
1. User initiates payment
2. User completes payment on Paga
3. User returns to app
4. App calls paga-verify-payment endpoint
5. If successful, wallet updates and displays new balance
⚠️  If user closes app: balance won't update until they return and verify
```

### With Webhook (Recommended)
```
1. User initiates payment
2. User completes payment on Paga
3. Paga sends webhook event immediately
4. Webhook handler updates wallet in database
5. When user returns to app, wallet already reflects the balance
6. App calls paga-verify-payment as fallback (if webhook missed)
✅ Wallet always stays in sync
```

## Webhook Events Handled

The `paga-webhook` function handles these transaction states:
- **success**: Transaction settled, wallet credited
- **failed**: Transaction declined, no wallet change
- **processing**: Awaiting provider response, wallet remains pending
- **reversed**: Transaction reversed, wallet refunded

## Troubleshooting

### Webhook Not Firing
1. Verify URL is correct and publicly accessible
2. Check Paga dashboard shows webhook as "active" or "enabled"
3. Check Supabase function logs: `supabase functions list` → view logs
4. Test with: `curl -X POST https://<url>/paga-webhook -H "Content-Type: application/json" -d '{"test":true}'`

### Signature Verification Failing
1. Verify `PAGA_HASH_KEY` matches Paga dashboard
2. Check if using sandbox mode: `PAGA_IS_SANDBOX=true`
3. In sandbox, webhooks may not have hash header - this is normal and allowed

### Wallet Not Updating
1. Check transaction table: does `wallet_settlement_jobs` have pending items?
2. Verify `wallet-settlement-worker` is running on schedule
3. Check Supabase RPC logs for `wallet_settle_transaction` errors
4. Manually trigger settlement: 
```bash
curl -X POST "$SUPABASE_URL/functions/v1/wallet-settlement-worker" \
  -H "Authorization: Bearer $WALLET_SETTLEMENT_WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"batchSize":25}'
```

## Alternative Payment Providers

### Paystack Webhook
- Endpoint: `/functions/v1/paystack-webhook`
- Setup: Configure in Paystack dashboard under Account Settings → Webhook
- Uses webhook signature header validation

### Flutterwave Webhook
- Endpoint: `/functions/v1/flutterwave-webhook`
- Setup: Configure in Flutterwave dashboard under Settings → Webhook
- Uses SHA256 HMAC signature verification

## Best Practices

1. **Enable All Providers**: Webhooks provide better UX than client-side verification
2. **Monitor Logs**: Regularly check function logs for webhook processing errors
3. **Test in Staging**: Always test webhook setup in sandbox/staging before production
4. **Set Up Alerts**: Configure Supabase alerts for function errors
5. **Keep Secrets Secure**: Never commit API keys or hash keys to version control

## Related Documentation
- [PAYMENT_SYSTEM.md](./PAYMENT_SYSTEM.md) - Payment architecture and transaction states
- [WALLET_REDESIGN_RUNBOOK.md](./WALLET_REDESIGN_RUNBOOK.md) - Worker setup and scheduling
