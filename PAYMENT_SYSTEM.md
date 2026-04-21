# Payment System (Wallet Integrity)

## Scope
This document defines the authoritative wallet payment lifecycle for NeXa Esports with Paga integration.

## Core Principles
- Database state is authoritative for wallet balances.
- External provider callbacks are reconciled idempotently.
- No wallet credit/debit is applied twice for the same reference.
- Ambiguous provider responses are treated as `processing`, not `failed`.

## Transaction States
- `pending`: created, awaiting provider settlement.
- `processing`: provider accepted or uncertain state; not final.
- `success`: final settled state.
- `failed`: final failure.
- `reversed`: previously reserved/attempted funds reversed.

## Funding Flow (Deposit)
1. Client calls `paga-initiate-payment`.
2. Function creates a pending transaction with `reference`, `userId`, and `walletType` metadata.
3. User pays on Paga checkout.
4. Settlement arrives through:
   - `paga-webhook` (primary), or
   - `paga-verify-payment` (client-triggered verification fallback).
5. On confirmed success, backend calls `credit_wallet` once (idempotent by reference lock).
6. Transaction becomes `success`; wallet balance updates atomically.

## Withdrawal Flow
1. Client calls `paga-transfer`.
2. Backend debits wallet via `debit_wallet` (atomic reserve + pending transaction row).
3. Provider response is mapped:
   - `success`: finalize immediately via `finalize_wallet_debit`.
   - `failed`: rollback via `rollback_wallet_debit`.
   - `processing`: keep reserved state and wait for webhook reconciliation.
4. `paga-webhook` reconciles to final state:
   - success -> finalize pending debit
   - failed/reversed -> rollback or mark reversed

## Webhook Handling
- Signature verification is enforced outside sandbox.
- Webhook is idempotent by transaction reference.
- Provider raw payload is stored in `transactions.paga_raw_response`.
- Provider state is stored in `transactions.paga_status`.

## Failure Recovery
- If provider state is uncertain, keep `processing` and do not apply irreversible local changes.
- If client verification cannot confirm success, response remains `processing`.
- Wallet balances are changed only in atomic RPCs (`credit_wallet`, `debit_wallet`, `finalize_wallet_debit`, `rollback_wallet_debit`).

## Reconciliation Notes
- Reconciliation key is `transactions.reference`.
- `paga_reference` mirrors provider-side reference for audit joins.
- Logs include reference + provider payload for debugging and audits.

## UI Expectations
- UI must represent `processing` as non-final.
- UI must not treat `processing` as `failed`.
- Wallet screen should auto-refresh pending/processing deposits until final state.

## Manual Test Matrix
- Successful funding: pending -> success, wallet increments once.
- Failed funding: pending/processing -> failed, no wallet increment.
- Successful withdrawal: pending -> success, wallet remains debited.
- Failed withdrawal: pending/processing -> failed/reversed, wallet restored.
- Duplicate callbacks: no duplicate balance mutation.
- Delayed callback after client verify: idempotent final success only once.
