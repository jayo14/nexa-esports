# Flutterwave Integration

This document describes the Flutterwave payment integration in Nexa Elite Nexus.

## Overview

The application uses Flutterwave v4 API for payment processing with **OAuth 2.0 authentication** and **server-side payment initiation**, including:
- Card payments
- Mobile money
- USSD
- Bank transfers
- Direct bank transfers for withdrawals

## Environment Variables

The following environment variables must be set for Flutterwave v4:

```bash
# Backend (Supabase Edge Functions) - v4 OAuth credentials
FLW_CLIENT_ID=your_flutterwave_client_id_here
FLW_CLIENT_SECRET=your_flutterwave_client_secret_here
FLW_ENCRYPTION_KEY=your_flutterwave_encryption_key_here
FLW_WEBHOOK_SECRET=your_webhook_secret_here  # Set in Flutterwave dashboard

# Environment (for testing scenario keys)
ENVIRONMENT=production  # Set to 'development' for testing
```

**Note:** Flutterwave v4 uses OAuth 2.0 for authentication. The edge functions will automatically request an access token using the Client ID and Client Secret before making API calls.

## Edge Functions

### 1. flutterwave-initiate-payment
Initiates payment transactions server-side and returns a payment link.

**Endpoint**: `POST /flutterwave-initiate-payment`

**Request Body**:
```json
{
  "amount": 5000,
  "customer": {
    "email": "user@example.com",
    "phone": "08012345678",
    "name": "John Doe"
  },
  "redirect_url": "https://your-domain.com/payment-success"
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "link": "https://checkout.flutterwave.com/v3/hosted/pay/xxxxx",
    "tx_ref": "FLW_1234567890_abc123"
  }
}
```

**Features**:
- Server-side payment initialization for enhanced security
- No public key required (uses SECRET_KEY)
- Generates unique transaction reference
- Returns hosted payment page link
- Validates amount limits (₦500 - ₦50,000)

Handles incoming webhook notifications from Flutterwave for successful payments.

**Endpoint**: `POST /flutterwave-webhook`

**Features**:
- Verifies webhook signature using `verif-hash` header
- Processes successful charge events
- Credits user wallet with net amount (after 4% fee)
- Logs transaction fees as platform earnings
- Prevents duplicate transaction processing

### 3. flutterwave-verify-payment
Verifies payment transactions after completion.

**Endpoint**: `POST /flutterwave-verify-payment`

**Request Body**:
```json
{
  "transaction_id": "1234567"
}
```

**Features**:
- Verifies transaction status with Flutterwave API
- Credits user wallet via RPC function
- Prevents duplicate processing

### 4. flutterwave-transfer
Initiates bank transfers for withdrawals.

**Endpoint**: `POST /flutterwave-transfer`

**Request Body**:
```json
{
  "endpoint": "initiate-transfer",
  "amount": 1000,
  "account_bank": "044",
  "account_number": "0690000031",
  "beneficiary_name": "John Doe",
  "narration": "Wallet withdrawal"
}
```

**Features**:
- Validates withdrawal limits (₦500 - ₦30,000)
- Enforces Sunday withdrawal restrictions by timezone
- Deducts 4% fee from amount
- Includes idempotency support via X-Idempotency-Key header
- Supports testing scenarios via X-Scenario-Key header
- Comprehensive error handling with user-friendly messages

**Error Codes**:
- `withdrawals_disabled_today` - Withdrawals not allowed on Sundays
- `insufficient_flutterwave_balance` - Service balance insufficient
- `account_not_found` - Bank account verification failed
- `daily_limit_exceeded` / `monthly_limit_exceeded` - Transfer limits reached
- `duplicate_transfer` - Transaction already processed

### 5. flutterwave-get-banks
Fetches list of supported banks.

**Endpoint**: `GET /flutterwave-get-banks`

**Response**:
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "code": "044",
      "name": "Access Bank"
    }
  ]
}
```

### 6. flutterwave-verify-bank-account
Verifies bank account details.

**Endpoint**: `POST /flutterwave-verify-bank-account`

**Request Body**:
```json
{
  "account_number": "0690000031",
  "account_bank": "044"
}
```

**Response**:
```json
{
  "status": true,
  "data": {
    "account_number": "0690000031",
    "account_name": "JOHN DOE"
  }
}
```

### 7. flutterwave-get-transactions
Fetches transaction history directly from Flutterwave for the authenticated user.

**Endpoint**: `GET /flutterwave-get-transactions`

**Features**:
- Filters by customer email
- Supports status filtering (default: 'successful')
- Used by the "Verify Payments" UI component for external verification.

## Frontend Integration

### Payment Flow

The frontend uses **server-side payment initiation** for enhanced security:

```tsx
const handlePayment = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Call edge function to initiate payment
    const { data, error } = await supabase.functions.invoke('flutterwave-initiate-payment', {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: {
        amount: 5000,
        customer: {
          email: 'user@example.com',
          phone: '08012345678',
          name: 'John Doe',
        },
        redirect_url: `${window.location.origin}/payment-success`,
      },
    });

    if (error) {
      console.error('Payment initiation error:', error);
      return;
    }

    // Redirect to Flutterwave's hosted payment page
    window.location.href = data.data.link;
  } catch (error) {
    console.error('Error initiating payment:', error);
  }
};
```

**Key Benefits:**
- No public key exposed to frontend
- Enhanced security with server-side control
- Consistent payment flow across all devices
- Better error handling and logging

### Withdrawal Flow

```tsx
const { data, error } = await supabase.functions.invoke('flutterwave-transfer', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: {
    endpoint: 'initiate-transfer',
    amount: withdrawAmount,
    account_bank: bankCode,
    account_number: accountNumber,
    beneficiary_name: accountName,
    narration: 'Wallet withdrawal',
  },
});
```

## Testing

### Test Scenarios

Use the `X-Scenario-Key` header to test different transfer scenarios:

```bash
# Successful transfer
curl -X POST https://api.flutterwave.com/v3/transfers \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "X-Scenario-Key: scenario:successful" \
  -d '{...}'

# Insufficient balance
curl -X POST https://api.flutterwave.com/v3/transfers \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "X-Scenario-Key: scenario:insufficient_balance" \
  -d '{...}'
```

Available scenarios:
- `scenario:successful`
- `scenario:insufficient_balance`
- `scenario:invalid_currency`
- `scenario:account_resolved_failed`
- `scenario:blocked_bank`
- `scenario:day_limit_error`
- And more...

### Production Credentials

For live/production use, set the following environment variables:

```bash
FLW_CLIENT_ID=your_live_client_id
FLW_CLIENT_SECRET=your_live_client_secret
FLW_ENCRYPTION_KEY=your_live_encryption_key
FLW_WEBHOOK_SECRET=your_webhook_secret_from_dashboard
ENVIRONMENT=production
```

Get your live v4 credentials from the Flutterwave dashboard under Settings > API Keys.

**Important:** Flutterwave v4 uses OAuth 2.0 authentication. The system automatically requests an access token using your Client ID and Client Secret before making API calls.

## Security Best Practices

1. **Never hardcode API keys** - Use environment variables
2. **Verify webhooks** - Always validate webhook signatures
3. **Validate transactions** - Verify amount, currency, and reference
4. **Implement idempotency** - Use unique X-Idempotency-Key for all POST requests
5. **Handle errors gracefully** - Provide user-friendly error messages
6. **Rate limiting** - Implement rate limits on transaction status checks
7. **Secure storage** - Store API keys in secrets manager

## Transaction Fees

- **Deposits**: 4% fee (deducted from deposit amount)
- **Withdrawals**: 4% fee (deducted from withdrawal amount)
- **Transfers**: ₦50 flat fee

## Webhook Configuration

Set up webhooks in your Flutterwave dashboard:

1. Go to Settings > Webhooks
2. Set webhook URL: `https://your-domain.com/flutterwave-webhook`
3. Generate and set a webhook secret hash in your dashboard
4. Add the webhook secret to your environment as `FLW_WEBHOOK_SECRET`
5. Enable events: `charge.completed`

**Security Note**: Always use a dedicated webhook secret different from your API secret key for signature verification.

## Support

For issues or questions:
- Flutterwave Docs: https://developer.flutterwave.com
- Support: support@flutterwave.com
