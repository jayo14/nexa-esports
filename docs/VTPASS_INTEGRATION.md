# VTPass Integration Guide

## Overview

This document provides comprehensive information about the VTPass API integration for airtime and data purchases in the NeXa Esports platform.

VTPass is a bill payment platform that provides APIs for purchasing airtime, data bundles, and other services across multiple Nigerian network providers.

## Getting Started

### 1. Create a VTPass Account

1. Visit [https://www.vtpass.com/](https://www.vtpass.com/)
2. Sign up for an account
3. Complete KYC verification
4. Fund your VTPass wallet

### 2. Get API Credentials

After account setup, obtain your API credentials from the VTPass dashboard:

- **API Key**: Your public API identifier
- **Secret Key**: Your private authentication key
- **Public Key**: Your public authentication key

### 3. Configure Environment Variables

Add your credentials to your environment variables:

```env
VTPASS_API_KEY=your_vtpass_api_key_here
VTPASS_SECRET_KEY=your_vtpass_secret_key_here
VTPASS_PUBLIC_KEY=your_vtpass_public_key_here
```

## Supported Services

### Airtime VTU API

VTPass supports airtime top-up for the following Nigerian networks:

- **MTN Airtime VTU** - Service ID: `mtn`
- **Glo Airtime VTU** - Service ID: `glo`
- **Airtel Airtime VTU** - Service ID: `airtel`
- **9mobile Airtime VTU** - Service ID: `etisalat`

### Data Subscription API

VTPass supports data bundle purchases for:

- **MTN Data** - Service ID: `mtn-data`
- **Airtel Data** - Service ID: `airtel-data`
- **GLO Data** - Service ID: `glo-data`
- **GLO SME Data** - Service ID: `glo-sme-data`
- **9mobile Data** - Service ID: `etisalat-data`

## API Integration

### Request Format

All VTPass API requests should be sent to: `https://vtpass.com/api/pay`

**Required Headers:**
```json
{
  "Content-Type": "application/json",
  "api-key": "YOUR_VTPASS_API_KEY",
  "secret-key": "YOUR_VTPASS_SECRET_KEY",
  "public-key": "YOUR_VTPASS_PUBLIC_KEY"
}
```

**Request Body (Airtime):**
```json
{
  "request_id": "YYYYMMDD_unique_identifier",
  "serviceID": "mtn",
  "amount": 100,
  "phone": "08012345678"
}
```

**Request Body (Data):**
```json
{
  "request_id": "YYYYMMDD_unique_identifier",
  "serviceID": "mtn-data",
  "billersCode": "08012345678",
  "variation_code": "mtn-10gb-30days",
  "amount": 3000,
  "phone": "08012345678"
}
```

### Request ID Requirements

The `request_id` is critical and must follow these rules:

1. **Must be unique** - Never reuse a request ID
2. **Must contain today's date** - First 8 characters must be YYYYMMDD format
3. **Must be today's date** - The date must be the current day
4. **Example**: `20260108_AIRTIME_12345_1234567890`

**Invalid Request ID Errors:**
- `085` - IMPROPER REQUEST ID: DOES NOT CONTAIN DATE
- `085` - IMPROPER REQUEST ID: NOT PROPER DATE FORMAT
- `085` - IMPROPER REQUEST ID: DATE NOT TODAY'S DATE

## Response Codes

### Verification Response Codes

Used for validating customer information (e.g., decoder numbers, meter numbers):

| Code | Meaning | Action |
|------|---------|--------|
| `020` | BILLER CONFIRMED | Proceed with transaction |
| `011` | INVALID ARGUMENTS | Check request parameters |
| `012` | PRODUCT DOES NOT EXIST | Verify service ID |
| `030` | BILLER NOT REACHABLE | Retry later |

### Transaction Response Codes

| Code | Meaning | Status | Action Required |
|------|---------|--------|-----------------|
| `000` | TRANSACTION PROCESSED | Check content.transactions.status | See Transaction Status Format |
| `099` | TRANSACTION IS PROCESSING | Pending | Requery after delay |
| `001` | TRANSACTION QUERY | Query | Valid for requery operations |
| `044` | TRANSACTION RESOLVED | Resolved | Contact support for details |
| `091` | TRANSACTION NOT PROCESSED | Failed | No charge, safe to retry |
| `016` | TRANSACTION FAILED | Failed | Transaction failed |
| `010` | VARIATION CODE DOES NOT EXIST | Failed | Check variation code |
| `011` | INVALID ARGUMENTS | Failed | Validate all parameters |
| `012` | PRODUCT DOES NOT EXIST | Failed | Check service ID |
| `013` | BELOW MINIMUM AMOUNT ALLOWED | Failed | Increase amount |
| `014` | REQUEST ID ALREADY EXIST | Failed | Use new request ID |
| `015` | INVALID REQUEST ID | Failed | Request ID not found (requery) |
| `017` | ABOVE MAXIMUM AMOUNT ALLOWED | Failed | Reduce amount |
| `018` | LOW WALLET BALANCE | Failed | Fund VTPass wallet |
| `019` | LIKELY DUPLICATE TRANSACTION | Failed | Wait 30 seconds |
| `021` | ACCOUNT LOCKED | Failed | Contact support |
| `022` | ACCOUNT SUSPENDED | Failed | Contact support |
| `023` | API ACCESS NOT ENABLED | Failed | Request API activation |
| `024` | ACCOUNT INACTIVE | Failed | Activate account |
| `025` | RECIPIENT BANK INVALID | Failed | Check bank code |
| `026` | RECIPIENT ACCOUNT COULD NOT BE VERIFIED | Failed | Verify account details |
| `027` | IP NOT WHITELISTED | Failed | Whitelist server IP |
| `028` | PRODUCT IS NOT WHITELISTED | Failed | Whitelist product |
| `030` | BILLER NOT REACHABLE | Temporary | Retry later |
| `031` | BELOW MINIMUM QUANTITY ALLOWED | Failed | Increase quantity |
| `032` | ABOVE MAXIMUM QUANTITY ALLOWED | Failed | Reduce quantity |
| `034` | SERVICE SUSPENDED | Temporarily unavailable | Try later |
| `035` | SERVICE INACTIVE | Unavailable | Service turned off |
| `040` | TRANSACTION REVERSAL | Reversed | Amount returned to wallet |
| `083` | SYSTEM ERROR | Error | Contact support |
| `087` | INVALID CREDENTIALS | Auth failed | Verify API keys |
| `089` | REQUEST IS PROCESSING | Busy | Wait for previous request |

### Transaction Status Format

When code is `000` (TRANSACTION PROCESSED), check `content.transactions.status`:

| Status | Meaning | Description |
|--------|---------|-------------|
| `initiated` | Transaction initiated | Transaction started but not complete |
| `pending` | Transaction pending | Awaiting confirmation from provider |
| `delivered` | Transaction successful | Service delivered successfully |

## Error Handling Best Practices

### 1. Always Check Response Code First

```typescript
if (response.code === '000') {
  // Check content.transactions.status
  if (response.content?.transactions?.status === 'delivered') {
    // Success - update wallet, mark as complete
  } else if (response.content?.transactions?.status === 'pending') {
    // Pending - schedule requery
  } else if (response.content?.transactions?.status === 'initiated') {
    // Still processing - wait and requery
  }
} else if (response.code === '099') {
  // Transaction processing - requery after delay
} else if (response.code === '091') {
  // Not processed - safe to retry without duplicate
} else {
  // Other codes - treat as failed, show user-friendly message
}
```

### 2. Handle Pending Transactions

For transactions that return `pending` or `099`:

1. Store transaction with `pending` status
2. Schedule requery after 30-60 seconds
3. Use the original `request_id` for requery
4. Maximum 3-5 requery attempts
5. After max attempts, mark as needs manual review

### 3. Implement Timeout Handling

```typescript
const VTPASS_TIMEOUT = 30000; // 30 seconds

try {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VTPASS_TIMEOUT);
  
  const response = await fetch(url, {
    signal: controller.signal,
    ...options
  });
  
  clearTimeout(timeoutId);
  // Process response
} catch (error) {
  if (error.name === 'AbortError') {
    // Timeout - treat as pending, schedule requery
  }
}
```

### 4. User-Friendly Error Messages

Map VTPass codes to clear messages:

```typescript
const ERROR_MESSAGES = {
  '011': 'Invalid request. Please check your input and try again.',
  '013': 'Amount is below minimum allowed. Please increase the amount.',
  '014': 'This transaction was already processed. Please check your transaction history.',
  '017': 'Amount exceeds maximum allowed. Please reduce the amount.',
  '018': 'Insufficient funds. Please contact support.',
  '019': 'Please wait 30 seconds before making another purchase to the same number.',
  '030': 'Service provider temporarily unavailable. Please try again later.',
  '087': 'System configuration error. Please contact support.',
};
```

## Webhook Integration

### Callback URL Setup

1. Create a webhook endpoint: `POST /api/vtpass-callback`
2. Configure the callback URL in your VTPass dashboard
3. Endpoint must respond with: `{ "response": "success" }`

### Webhook Payload

VTPass sends updates for:
- Transaction status changes (pending → delivered/failed)
- Variation code updates

**Payload Format:**
```json
{
  "type": "transaction_update",
  "data": {
    "request_id": "20260108_AIRTIME_12345",
    "transaction_id": "vtpass_txn_id",
    "status": "delivered",
    "amount": 100,
    "phone": "08012345678"
  }
}
```

### Implementation

```typescript
export async function handleVTPassWebhook(request: Request) {
  const payload = await request.json();
  
  if (payload.type === 'transaction_update') {
    // Update transaction status in database
    const { request_id, status } = payload.data;
    
    await updateTransaction(request_id, {
      status: status,
      webhook_received_at: new Date()
    });
    
    // If status changed to delivered, update wallet
    if (status === 'delivered') {
      await processSuccessfulTransaction(request_id);
    }
  }
  
  // Must respond with this exact format
  return new Response(
    JSON.stringify({ response: "success" }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Important Notes:**
- VTPass will retry up to 5 times if it doesn't receive the expected response
- Always respond quickly (< 5 seconds)
- Process updates asynchronously if needed
- Log all webhook payloads for debugging

## Transaction Requery

Use requery to check status of pending transactions:

**Endpoint:** `GET https://vtpass.com/api/requery`

**Parameters:**
```json
{
  "request_id": "20260108_AIRTIME_12345"
}
```

**Headers:** Same as payment request (api-key, secret-key, public-key)

**When to Requery:**
- Response code `099` (Transaction processing)
- Transaction status is `pending`
- No response received (timeout)
- Webhook not received after expected time

## Testing

### Sandbox Environment

VTPass provides a sandbox environment for testing:

1. Use test credentials from your dashboard
2. Test transactions don't deduct from real wallet
3. Verify all error codes and status handling
4. Test webhook delivery

### Test Scenarios

Test these critical paths:

1. ✅ Successful transaction (code 000, status delivered)
2. ⏳ Pending transaction → requery → delivered
3. ❌ Failed transaction (code 016)
4. ⚠️ Invalid credentials (code 087)
5. 💰 Insufficient balance (code 018)
6. 🔁 Duplicate request ID (code 014)
7. ⏱️ Timeout → treat as pending → requery
8. 🔔 Webhook received and processed

## Security Best Practices

1. **Never expose credentials** - Keep API keys server-side only
2. **Validate webhook sources** - Verify webhook IP or use signatures
3. **Use HTTPS only** - All API calls must use secure connections
4. **Implement rate limiting** - Prevent abuse and duplicate requests
5. **Log all transactions** - Keep audit trail for reconciliation
6. **Monitor wallet balance** - Alert when VTPass balance is low

## Support

For issues or questions:

- **VTPass Documentation**: [https://www.vtpass.com/documentation/](https://www.vtpass.com/documentation/)
- **VTPass Support**: support@vtpass.com
- **Platform Issues**: Create an issue in the repository

## Troubleshooting

### Common Issues

**"VTPASS credentials not configured"**
- Ensure environment variables are set correctly
- Verify variables are loaded in edge function

**"INVALID CREDENTIALS" (Code 087)**
- Check API key, secret key, and public key
- Ensure using correct authentication method
- Verify account is active

**"REQUEST ID ALREADY EXIST" (Code 014)**
- Each transaction needs unique request ID
- Include timestamp in request ID
- Never retry with same request ID

**Transactions stuck in pending**
- Implement requery mechanism
- Set up webhook to receive status updates
- Monitor and manually check after 5 minutes

## Implementation Checklist

- [ ] Configure VTPass credentials in environment
- [ ] Implement airtime purchase function
- [ ] Implement data purchase function
- [ ] Add comprehensive error handling
- [ ] Implement request ID validation
- [ ] Set up webhook endpoint
- [ ] Implement transaction requery
- [ ] Add pending transaction handling
- [ ] Create user-friendly error messages
- [ ] Test all scenarios
- [ ] Monitor and log transactions
- [ ] Set up wallet balance alerts
