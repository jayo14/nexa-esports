# Wallet Redesign Runbook

## Required environment variables
- PAGA_PUBLIC_KEY
- PAGA_API_PASSWORD (or PAGA_SECRET_KEY)
- PAGA_HASH_KEY
- PAGA_IS_SANDBOX
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- WALLET_SETTLEMENT_WORKER_TOKEN

## Deploy order
1. Apply DB migrations in order:
- supabase/migrations/20260421030000_wallet_redesign_core.sql
- supabase/migrations/20260421032000_wallet_reconciliation.sql

2. Deploy edge functions:
- paga-initiate-payment
- paga-transfer
- paga-verify-payment
- paga-webhook
- wallet-settlement-worker
- wallet-reconciliation-worker

## Runtime model
- Webhook and verify endpoints only ingest evidence and enqueue settlement jobs.
- Monetary finalization is only through `wallet_settle_transaction` via `wallet_process_settlement_jobs`.

## Manual worker trigger examples

Settlement queue processing:
```bash
curl -X POST "$SUPABASE_URL/functions/v1/wallet-settlement-worker" \
  -H "Authorization: Bearer $WALLET_SETTLEMENT_WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"batchSize":25}'
```

Reconciliation run:
```bash
curl -X POST "$SUPABASE_URL/functions/v1/wallet-reconciliation-worker" \
  -H "Authorization: Bearer $WALLET_SETTLEMENT_WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Scheduling recommendation
- Settlement worker: every 1 minute.
- Reconciliation worker: every 10 minutes.
- Nightly deep reconciliation: every 24 hours with larger batch.

## Validation checks
- No direct wallet balance mutation in webhook/verify code paths.
- Every finalized transaction has at least one terminal ledger entry:
  - deposit success -> `credit_final`
  - withdrawal success -> `debit_final`
  - withdrawal failed/reversed/expired -> `reserve_release`

## Emergency ops
- If settlement backlog grows:
  - increase settlement worker frequency and batch size.
  - inspect `wallet_settlement_jobs` for repeated failures.
- If provider mismatch suspected:
  - run reconciliation worker immediately.
  - inspect `wallet_reconciliation_findings` and replay targeted settlement jobs.
