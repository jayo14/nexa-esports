# Flutterwave Webhook Setup Guide

## Webhook URL

Your Flutterwave webhook URL is:

```
https://kxnbnuazpzzuttdunkta.supabase.co/functions/v1/flutterwave-webhook
```

---

## Setup Instructions

### 1. Configure Webhook in Flutterwave Dashboard

1. **Login to Flutterwave Dashboard**
   - Go to: https://dashboard.flutterwave.com/

2. **Navigate to Webhook Settings**
   - Click on **Settings** in the sidebar
   - Select **Webhooks**

3. **Add Webhook URL**
   - Enter the webhook URL: `https://kxnbnuazpzzuttdunkta.supabase.co/functions/v1/flutterwave-webhook`
   - Select the environment (Test/Live)
   - Click **Save**

4. **Get Webhook Secret Hash**
   - After saving, Flutterwave will display a **Secret Hash**
   - Copy this hash - you'll need it for verification

---

## Environment Variables

### Set Webhook Secret

You need to set the webhook secret hash in your Supabase Edge Functions:

```bash
# Option 1: Use the dedicated webhook secret
supabase secrets set FLW_WEBHOOK_SECRET=<your_webhook_secret_hash>

# Option 2: If not set, it will fallback to FLW_SECRET_KEY (current behavior)
```

**Note:** The webhook function will use `FLW_WEBHOOK_SECRET` if set, otherwise it falls back to `FLW_SECRET_KEY`.

---

## How the Webhook Works

### Webhook Flow

```
1. Customer completes payment on Flutterwave
   ↓
2. Flutterwave sends POST request to webhook URL
   ↓
3. Webhook verifies signature using FLW_WEBHOOK_SECRET
   ↓
4. Webhook processes the payment event
   ↓
5. User's wallet is credited automatically
```

### Events Handled

The webhook currently handles:
- ✅ **charge.completed** - When a payment is successfully completed

### Webhook Security

The webhook implements the following security measures:

1. **Signature Verification**
   ```typescript
   const signature = req.headers.get("verif-hash");
   if (signature !== FLW_WEBHOOK_SECRET) {
     return new Response("Invalid signature", { status: 401 });
   }
   ```

2. **Duplicate Prevention**
   - Checks if transaction already exists before processing
   - Uses transaction reference (`tx_ref`) as unique identifier

3. **User Validation**
   - Verifies user exists via userId in metadata or email
   - Creates wallet automatically if it doesn't exist

---

## Webhook Payload Structure

### Flutterwave sends this payload:

```json
{
  "event": "charge.completed",
  "data": {
    "id": 123456789,
    "tx_ref": "FLW_1234567890_abc123",
    "amount": 1000,
    "currency": "NGN",
    "status": "successful",
    "customer": {
      "email": "user@example.com",
      "name": "John Doe"
    },
    "meta": {
      "userId": "user-uuid-here"
    }
  }
}
```

### What the Webhook Does:

1. **Extracts Payment Data**
   - Amount, transaction reference, customer info

2. **Identifies User**
   - First tries: metadata.userId
   - Falls back to: customer.email

3. **Calculates Fees**
   - Platform fee: 4% of amount
   - Net amount: Amount - Fee

4. **Credits Wallet**
   - Updates user's wallet balance
   - Creates transaction record
   - Logs fee to earnings table

5. **Returns Success**
   ```json
   {
     "success": true,
     "credited": 960,
     "fee": 40
   }
   ```

---

## Testing the Webhook

### Method 1: Test Mode Payments

1. Switch Flutterwave to **Test Mode**
2. Use test cards from: https://developer.flutterwave.com/docs/integration-guides/testing-helpers
3. Make a test payment
4. Check Supabase logs to verify webhook was called

### Method 2: Manual Webhook Testing

Use curl to test the webhook locally:

```bash
curl -X POST https://kxnbnuazpzzuttdunkta.supabase.co/functions/v1/flutterwave-webhook \
  -H "Content-Type: application/json" \
  -H "verif-hash: YOUR_WEBHOOK_SECRET" \
  -d '{
    "event": "charge.completed",
    "data": {
      "id": 123456789,
      "tx_ref": "TEST_TX_REF_123",
      "amount": 1000,
      "currency": "NGN",
      "status": "successful",
      "customer": {
        "email": "test@example.com",
        "name": "Test User"
      },
      "meta": {
        "userId": "YOUR_USER_ID_HERE"
      }
    }
  }'
```

### Method 3: Flutterwave Webhook Tester

1. Go to Flutterwave Dashboard > Settings > Webhooks
2. Click **Test Webhook**
3. Select an event type
4. Click **Send Test Event**
5. Verify the webhook receives and processes it

---

## Monitoring & Debugging

### View Webhook Logs

```bash
# View real-time logs
supabase functions logs flutterwave-webhook --follow

# View recent logs
supabase functions logs flutterwave-webhook
```

### Common Issues & Solutions

#### Issue: "Invalid signature"

**Cause:** Webhook secret hash doesn't match
**Solution:**
```bash
# Verify webhook secret is set correctly
supabase secrets list | grep FLW_WEBHOOK_SECRET

# Update if needed
supabase secrets set FLW_WEBHOOK_SECRET=<correct_hash>
```

#### Issue: "User not found"

**Cause:** No user found with the provided email or userId
**Solution:**
- Ensure userId is passed in payment metadata
- Verify user email matches registered email

#### Issue: "Transaction already processed"

**Cause:** Duplicate webhook event (this is normal)
**Solution:** This is expected behavior - webhook prevents duplicate credits

#### Issue: Webhook not receiving events

**Cause:** URL not configured in Flutterwave or incorrect URL
**Solution:**
1. Verify URL in Flutterwave dashboard
2. Ensure Edge Function is deployed:
   ```bash
   supabase functions deploy flutterwave-webhook
   ```
3. Check function is accessible:
   ```bash
   curl https://kxnbnuazpzzuttdunkta.supabase.co/functions/v1/flutterwave-webhook
   ```

---

## Webhook Response Codes

The webhook returns these HTTP status codes:

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | Success | Event processed successfully or already processed |
| 401 | Unauthorized | Invalid webhook signature |
| 404 | Not Found | User not found |
| 500 | Server Error | Database error or other server issue |

---

## Deployment Checklist

Before going live, ensure:

- [ ] Webhook URL configured in Flutterwave dashboard
- [ ] `FLW_WEBHOOK_SECRET` set in Supabase secrets
- [ ] Edge function deployed: `flutterwave-webhook`
- [ ] Test with test mode payment
- [ ] Verify wallet is credited correctly
- [ ] Check transaction appears in database
- [ ] Monitor logs for errors
- [ ] Test with live mode (small amount)
- [ ] Document webhook secret securely

---

## Security Best Practices

1. **Keep Webhook Secret Secure**
   - Never commit to version control
   - Store only in Supabase secrets
   - Rotate periodically

2. **Monitor Webhook Activity**
   - Set up alerts for failed webhooks
   - Review logs regularly
   - Track unusual patterns

3. **Validate All Data**
   - Check transaction status is "successful"
   - Verify amounts match expected values
   - Validate user exists before crediting

4. **Handle Duplicates**
   - Always check if transaction already processed
   - Use transaction reference as unique identifier
   - Return success for duplicate events

---

## Webhook URL Reference

**Production Webhook URL:**
```
https://kxnbnuazpzzuttdunkta.supabase.co/functions/v1/flutterwave-webhook
```

**HTTP Method:** POST  
**Content-Type:** application/json  
**Required Header:** `verif-hash` (Flutterwave webhook secret)

---

## Support Resources

- **Flutterwave Webhook Docs:** https://developer.flutterwave.com/docs/integration-guides/webhooks
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Project Dashboard:** https://supabase.com/dashboard/project/kxnbnuazpzzuttdunkta

For issues:
1. Check webhook logs in Supabase dashboard
2. Verify webhook configuration in Flutterwave dashboard
3. Test webhook with curl or Flutterwave's test tool
4. Contact Flutterwave support if events aren't being sent

---

**Setup Date:** 2026-02-13  
**Status:** ✅ Ready to Configure  
**Webhook Function:** Deployed and Updated for v3 API
