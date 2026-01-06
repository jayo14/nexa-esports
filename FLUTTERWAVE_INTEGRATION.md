# Flutterwave Integration

This document describes the Flutterwave payment integration in Nexa Elite Nexus.

## Overview

The application uses Flutterwave v3 API for payment processing, including:
- Card payments
- Mobile money
- USSD
- Bank transfers
- Direct bank transfers for withdrawals

## Environment Variables

The following environment variables must be set:

```bash
# Frontend (Vite)
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-b1c886c37a102b555212cbd90d991ccb-X

# Backend (Supabase Edge Functions)
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-ed7084e2ff4f8d5a24366380dcda91da-X
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TEST104790c94134
FLUTTERWAVE_WEBHOOK_SECRET=your_webhook_secret_here  # Set in Flutterwave dashboard

# Environment (for testing scenario keys)
ENVIRONMENT=development  # Set to 'production' in production
```

## Edge Functions

### 1. flutterwave-webhook
Handles incoming webhook notifications from Flutterwave for successful payments.

**Endpoint**: `POST /flutterwave-webhook`

**Features**:
- Verifies webhook signature using `verif-hash` header
- Processes successful charge events
- Credits user wallet with net amount (after 4% fee)
- Logs transaction fees as platform earnings
- Prevents duplicate transaction processing

### 2. flutterwave-verify-payment
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

### 3. flutterwave-transfer
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

### 4. flutterwave-get-banks
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

### 5. flutterwave-verify-bank-account
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

## Frontend Integration

### Payment Flow

The frontend uses the official `flutterwave-react-v3` library:

```tsx
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';

const config = {
  public_key: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY,
  tx_ref: `FLW_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  amount: 1000,
  currency: 'NGN',
  payment_options: 'card,mobilemoney,ussd,banktransfer',
  customer: {
    email: 'user@example.com',
    phone_number: '08012345678',
    name: 'John Doe',
  },
  customizations: {
    title: 'Nexa Elite Nexus',
    description: 'Wallet Funding',
  },
  meta: {
    userId: 'user_id_here',
  },
};

const handleFlutterPayment = useFlutterwave(config);

// Trigger payment
handleFlutterPayment({
  callback: (response) => {
    console.log(response);
    closePaymentModal();
    // Handle success
  },
  onClose: () => {
    // Handle modal close
  },
});
```

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

### Test Credentials

```bash
Public Key: FLWPUBK_TEST-b1c886c37a102b555212cbd90d991ccb-X
Secret Key: FLWSECK_TEST-ed7084e2ff4f8d5a24366380dcda91da-X
Encryption Key: FLWSECK_TEST104790c94134
```

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
4. Add the webhook secret to your environment as `FLUTTERWAVE_WEBHOOK_SECRET`
5. Enable events: `charge.completed`

**Security Note**: Always use a dedicated webhook secret different from your API secret key for signature verification.

## Support

For issues or questions:
- Flutterwave Docs: https://developer.flutterwave.com
- Support: support@flutterwave.com
