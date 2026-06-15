# NeXa Esports — Payment Architecture Audit Report
### Principal FinTech Architect Review | June 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Audit Findings](#2-architecture-audit-findings)
3. [Root Cause Analysis](#3-root-cause-analysis)
4. [Comparison With Blnk Fintech Repository](#4-comparison-with-blnk-fintech-repository)
5. [Critical Risks](#5-critical-risks)
6. [Recommended Architecture](#6-recommended-architecture)
7. [Database Design](#7-database-design)
8. [Ledger Design](#8-ledger-design)
9. [Webhook Design](#9-webhook-design)
10. [Idempotency Design](#10-idempotency-design)
11. [Reconciliation Design](#11-reconciliation-design)
12. [Supabase Implementation Guide](#12-supabase-implementation-guide)
13. [Migration Plan](#13-migration-plan)
14. [Jules Execution Plan](#14-jules-execution-plan)
15. [Risk Assessment](#15-risk-assessment)
16. [Final Recommendation](#16-final-recommendation)

---

## 1. Executive Summary

NeXa Esports has a payment architecture that has gone through at least **four major redesign attempts** in quick succession (evidenced by 189 migrations, with a cluster of critical wallet fixes between April 26 and May 5, 2026 alone). The system is not broken in the way a naive implementation is broken — it is broken because it is **mid-migration**: the team correctly identified the problem (mutable wallet balance as source of truth) and has been trying to fix it, but the fix is incomplete, inconsistent, and layered on top of the original problem instead of replacing it.

The result is a system with **two parallel accounting systems** running simultaneously:

- **Old system**: `wallets.balance` is mutated directly by `credit_wallet()` and `update_wallet_and_create_transaction()`, and by `AuthContext.tsx` which reads `wallets.balance` and surfaces it to the UI.
- **New system**: `wallet_ledger` entries are appended, `wallet_settle_transaction()` orchestrates state transitions, and `wallet_create_withdrawal_intent()` debits the balance before provider confirmation.

The tragedy is that both systems write to the same `wallets.balance` field. A deposit settled through the new system credits `wallets.balance`. A deposit that falls through the old `credit_wallet()` path also credits `wallets.balance`. There is no guarantee both paths won't trigger for the same transaction.

**The three problems reported are real, confirmed, and have identifiable root causes in specific functions.**

### Key Findings Summary

| Problem | Root Cause | File/Function | Severity |
|---|---|---|---|
| Deposit not credited | Race between webhook + verify both calling `wallet_settle_transaction()` | `paga-webhook/index.ts`, `paga-verify-payment/index.ts` | Critical |
| Withdrawal balance not debited | `wallet_debit()` idempotency guard skips if state is `'processing'` — but withdrawal intent sets state to `'debited'` → state never matches guard | `20260423000000_ledger_first_architecture.sql` | Critical |
| Double-credit risk | `wallet_settle_transaction()` calls `wallet_credit()` which has its own idempotency guard, but webhook path also explicitly calls `wallet_settle_transaction()` TWICE in sequence | `paga-webhook/index.ts` lines 64–75 | Critical |
| Transfer fee inconsistency | `MobileTransferFlow.tsx` shows flat ₦50 fee; `execute_user_transfer()` charges 3.5% capped at ₦5,000 — UI and backend disagree | `MobileTransferFlow.tsx:43`, migration `20260423000000` | High |
| Balance as source of truth | `wallets.balance` is still mutated by all settlement paths | All wallet functions | Critical |

---

## 2. Architecture Audit Findings

### 2.1 Wallet Design

**Current State (from schema analysis)**

The `wallets` table (first created in `20251012230000_create_wallets_table.sql`) stores:

```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

By migration `20260423000000_ledger_first_architecture.sql`, this expanded to include `wallet_type`, `locked_balance`, `pending_balance`, `frozen_balance`, `is_frozen`, and `currency`. However, `locked_balance`, `pending_balance`, and `frozen_balance` are **never actually used** by any function in the codebase — they are structural aspirations that were added but never wired in.

**The `balance` column is still the live, authoritative value.** The `wallet_ledger` table records a `balance_before` and `balance_after` per entry, but this is a snapshot — if balance is manipulated outside a ledger entry, the ledger diverges immediately.

**AuthContext.tsx** reads `wallets.balance` directly (line 187, 406–408) and refreshes it on every transaction via `refreshWallet()`. This means the entire frontend observability layer is bound to the mutable `balance` field.

**Verdict**: The wallet design is in a **dual-track state**. Ledger exists but `balance` is still the source of truth. The ledger is a shadow — useful for auditing but not authoritative.

---

### 2.2 Deposit System

**Initiation** (`paga-initiate-payment/index.ts`):

Correctly creates a `transactions` record with `wallet_state = 'pending'` and `status = 'pending'`. Immediately updates it to `wallet_state = 'processing'` before the checkout URL is even opened. This is premature — if the user never opens the payment link, the transaction is stuck in `processing`.

Idempotency is attempted via `idempotency_key` checked against `transactions.idempotency_key`. However, `idempotency_key` is passed as `crypto.randomUUID()` from the frontend (`FundWallet.tsx`) — a new UUID is generated on every render cycle that triggers `handlePayment()`. If the user double-taps or retries after a network error, a completely new UUID is generated and a new transaction is created. **The frontend-generated UUID provides zero idempotency.**

**Verification** (`paga-verify-payment/index.ts`):

Called repeatedly by `useTransactionMonitor` hook in the frontend. The hook polls this endpoint while `isProcessing === true`. Each call to this endpoint, if it determines provider state is `success`, calls `settlePagaWalletTransaction()` then **immediately calls `wallet_settle_transaction()` again explicitly** (lines 55–60 of verify function). This is a double-settlement call in the happy path.

**Webhook** (`paga-webhook/index.ts`):

On receiving a Paga webhook, it: (1) checks `wallet_webhook_events` for duplicate by `provider_reference`, (2) stores the event via `wallet_store_webhook_event()`, (3) calls `settlePagaWalletTransaction()`, (4) then **explicitly calls `wallet_settle_transaction()` again** if the settled state is success (lines 64–75). This is another double-call.

**The critical issue**: Both the webhook and the verify endpoint can fire simultaneously when a payment completes. Paga sends a webhook AND the user's browser is polling verify. Both paths are calling `wallet_settle_transaction()` independently and near-simultaneously. The `wallet_settle_transaction()` function has an idempotency guard:

```sql
IF v_tx.wallet_state IN ('success', 'failed', 'reversed', 'expired') THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, ...);
END IF;
```

This guard **only works if the two concurrent calls are serialized by the `FOR UPDATE` lock on the transaction row.** If both calls hit the database in the same millisecond window before either commits, PostgreSQL will serialize them — but the second call will hit a locked row, wait, then run the idempotency check after the first commits. **This is correct behavior.** However, the double-call within a single invocation (`settlePagaWalletTransaction` followed by explicit `wallet_settle_transaction`) means even a single webhook call is attempting to settle the same transaction twice in the same function body. The second call within the same invocation will NOT be blocked by the first — they are sequential calls, not concurrent.

**Root finding**: The `wallet_settle_transaction()` is called up to **4 times** for a single deposit success event: once inside `settlePagaWalletTransaction()`, once explicitly in the webhook handler, once inside `settlePagaWalletTransaction()` from verify, and once explicitly in the verify handler. Only the first call should do work; the rest hit the idempotency guard. But if the `wallet_credit()` function inside `wallet_settle_transaction()` has a bug in its idempotency guard (it checks `wallet_state IN (p_wallet_state, p_final_status)` — a comparison between enum and text), a type cast failure could bypass the guard and double-credit.

---

### 2.3 Withdrawal System

**Initiation** (`paga-transfer/index.ts`):

Calls `wallet_create_withdrawal_intent()` which correctly:
1. Locks wallet with `FOR UPDATE`
2. Checks balance
3. Creates transaction record
4. Debits `wallets.balance` immediately
5. Writes `wallet_ledger` debit entry
6. Sets `wallet_state = 'debited'`

**Critical bug in `wallet_debit()` idempotency guard** (`20260429153000_fix_wallet_tx_types_and_transfer.sql`):

```sql
-- Idempotency check
SELECT wallet_state INTO v_state FROM public.transactions 
WHERE id = p_transaction_id FOR UPDATE;

IF v_state = 'debited' OR v_state = 'processing' THEN 
  RETURN; 
END IF;
```

The `wallet_create_withdrawal_intent()` function sets `wallet_state = 'debited'` after debiting the balance. If `wallet_settle_transaction()` is then called with `p_decision = 'processing'` (the "Handle Processing state" branch), it checks for an open reservation and calls `wallet_debit()`. The `wallet_debit()` idempotency check sees state is `'debited'` and correctly returns. So far so good.

**But**: The `wallet_settle_transaction()` function at the `processing` decision branch does this:

```sql
IF v_tx.type = 'withdrawal' AND v_tx.wallet_state = 'pending' THEN
    SELECT * INTO v_res FROM public.wallet_reservations WHERE ...;
    IF FOUND AND v_res.state = 'open' THEN
        PERFORM public.wallet_debit(p_transaction_id, v_tx.wallet_id, v_res.amount);
    END IF;
END IF;
```

This only triggers if state is `'pending'`. Since withdrawal intent now sets state to `'debited'` (bypassing `'pending'` entirely), this branch is effectively dead code for new withdrawals. **The withdrawal intent debit happened outside the reservation system entirely.**

The `wallet_reservations` table is populated by `wallet_create_withdrawal_intent()` with state `'open'`. But when `wallet_settle_transaction()` handles withdrawal success, it checks the reservation:

```sql
IF v_res.state = 'open' THEN
    UPDATE public.wallet_reservations SET state = 'consumed' ...
END IF;
```

This just marks the reservation consumed — it does NOT debit again (correct). But for withdrawal failure/reversal, it calls `wallet_credit()` to refund:

```sql
IF v_res.state = 'open' THEN
    PERFORM public.wallet_credit(p_transaction_id, v_tx.wallet_id, v_res.amount, ...);
    UPDATE public.wallet_reservations SET state = 'released' ...
END IF;
```

**This is where the silent double-debit can occur**: If `wallet_create_withdrawal_intent()` debits `wallets.balance` immediately, and then a Paga transport error occurs (function returns `{ status: true, state: "processing" }`), the settlement worker will eventually call `wallet_settle_transaction()` with `p_decision = 'failed'`. This triggers the refund credit. So far correct. **But** the `wallet_credit()` idempotency check for the reversal checks if state is already `'reversed'` or `'success'`:

```sql
IF v_state = p_wallet_state::public.wallet_tx_state OR v_state = 'success'::public.wallet_tx_state THEN
    RETURN;
END IF;
```

Since `p_wallet_state` is passed as `'reversed'` and the current state is `'debited'`, the guard passes and a credit is applied. If `wallet_settle_transaction()` is called twice with `p_decision = 'failed'` (e.g., two reconciliation jobs fire), the second call should hit the idempotency guard at the top of `wallet_settle_transaction()` since the state would be `'reversed'` or `'failed'`. **This is correct but fragile** — it depends on the outer guard running before the inner credit can run twice.

---

### 2.4 Transfer System

**`execute_user_transfer()` (from `20260423000000_ledger_first_architecture.sql`)**:

This function is well-designed in isolation:
1. Finds recipient by IGN with `NOT is_banned` guard
2. Self-transfer guard
3. Locks both wallets with `FOR UPDATE` in a consistent order? **No.** The sender wallet is locked first, then the receiver wallet. If two concurrent transfers happen between user A and user B in opposite directions, a deadlock is possible. PostgreSQL will detect and resolve the deadlock (aborting one transaction), but the client will get an error.
4. Balance check on sender
5. Creates both transaction records
6. Calls `wallet_debit()` for sender
7. Calls `wallet_credit()` for receiver

**Fee inconsistency**: The `MobileTransferFlow.tsx` component (line 43) defines `const TRANSFER_FEE = 50; // 3.5%` — the comment says 3.5% but the constant is a flat ₦50. The `execute_user_transfer()` function calculates `LEAST(ROUND(amount * 0.035, 2), 5000)`. For a ₦1,000 transfer: UI shows ₦50 fee, backend charges ₦35. The sender is debited ₦35 by the backend but the UI told them ₦50. The ₦15 discrepancy is silently pocketed or lost depending on how the reservation math is handled.

**Critically**: The `wallet_state` for transfer transactions is never set to a terminal `'success'` state. After `wallet_credit()` is called for receiver, the receiver transaction state is `'credited'`. After `wallet_debit()` for sender, the sender transaction is `'debited'`. The function then does:

```sql
UPDATE public.transactions 
SET wallet_state = 'debited'::public.wallet_tx_state, 
    status = 'completed',
    updated_at = NOW() 
WHERE id = v_sender_tx_id;
```

Only the sender is explicitly updated to `status = 'completed'` after the debit. The receiver transaction stays in `'credited'` state with `status = 'processing'`. **The receiver's transaction never reaches a `'success'` or `'completed'` terminal state through this function.** This means the receiver's transaction appears incomplete in any status audit.

---

### 2.5 Tournament Payments

No dedicated tournament escrow system was found in the migrations or edge functions. Examination of the `earnings` table (referenced in `credit_wallet` as a fee logging mechanism) and the `process-earnings-cashout` edge function suggests tournament prize distributions may be handled through the `earnings` table, not through the ledger. This is an unaudited path — earnings cashout may bypass the idempotency and settlement system entirely.

---

### 2.6 Rewards / Giveaways

The `redeem-giveaway` edge function and `redeem_giveaway` database function handle giveaway credits. The `giveaway_created`, `giveaway_redeemed`, and `giveaway_refund` transaction types exist in the enum. However, the `wallet_ledger` is not necessarily written during giveaway redemption — this depends on whether the giveaway redemption path was updated when the ledger system was introduced. The `can_redeem_giveaway` RPC function exists but its interaction with the ledger is unverified from the available migrations.

---

## 3. Root Cause Analysis

### Root Cause 1: Deposit Not Credited (Problem 1)

**Primary cause**: The frontend generates a new `crypto.randomUUID()` as `idempotency_key` on every invocation of `handlePayment()` in `FundWallet.tsx`. This means every retry creates a new transaction record. If the Paga checkout completes but the webhook fails to fire (Paga's webhook is not always reliable), the verify endpoint returns `{ status: "processing" }` because `!hasStrongEvidence`. The monitor hook in `useTransactionMonitor` eventually times out or the user navigates away. The transaction sits in `'processing'` state indefinitely. The balance is never credited.

**Secondary cause**: The `useTransactionMonitor` hook polls `paga-verify-payment` repeatedly. The verify endpoint requires "strong evidence" to trigger settlement:

```typescript
const hasStrongEvidence =
    providerState === "success" ||
    Number(pagaData?.responseCode) === 0 ||
    body.isSuccessFromCallback === true ||
    (isSandbox && body.forceSuccess === true);
```

If Paga's transaction status API returns ambiguous data (e.g., `responseCode` is not `0` but `status` is "COMPLETED"), `mapPagaProviderState()` would return `"success"` but `hasStrongEvidence` would be false. The `settlePagaWalletTransaction` call is skipped, but the explicit `wallet_settle_transaction` call that follows checks `settled.state === "success"`. Since `settlePagaWalletTransaction` returns `providerState = "success"` but `state = "processing"` (transaction wasn't settled), the explicit settle also doesn't fire.

**Tertiary cause**: The `paga-webhook/index.ts` verifies signature with three fallback hash variants:

```typescript
const variants = [
    [referenceNumber, amount, statusCode],
    [referenceNumber, amount],
    [referenceNumber],
];
```

If Paga sends the webhook with a hash that matches none of these variants, `signatureValid` remains false. For live mode, an invalid signature causes early return with `reason: "invalid_signature"`. **The transaction remains uncredited despite Paga confirming payment.**

---

### Root Cause 2: Withdrawal Balance Inconsistency (Problem 2)

**Primary cause**: `wallet_create_withdrawal_intent()` debits `wallets.balance` immediately and sets `wallet_state = 'debited'`. Paga transfer then fires. If Paga responds with a 3-7 variant payload (the function tries 3 endpoints × 3-4 payload variants × 9 hash variants = up to 81 HTTP calls to Paga), and all fail, the function returns `{ status: true, state: "processing" }`. The settlement worker is enqueued with `decision_hint = "processing"`.

The settlement worker calls `wallet_process_settlement_jobs()` which calls `wallet_settle_transaction()` with `p_decision = 'processing'`. The processing branch checks `v_tx.wallet_state = 'pending'` before debiting — since state is already `'debited'`, no debit happens. The transaction stays in `'debited'` state with Paga having potentially not received the transfer request at all.

**Result**: User's wallet is debited. Paga has not transferred money. The reconciliation worker may eventually detect this mismatch and re-queue for settlement, but depends on `queryPagaStatus()` returning a definitive state.

**Secondary cause**: The `paga-transfer/index.ts` function does NOT check that `wallet_create_withdrawal_intent()` succeeded before calling Paga's API. The sequence is:

```
1. wallet_create_withdrawal_intent() → success, balance debited
2. Paga getBanks() call
3. 81 Paga transfer attempts
4. settlePagaWalletTransaction()
```

If step 1 succeeds (balance debited) but step 2-3 completely fails (network timeout, Paga down), the response is `{ status: true, state: "processing" }`. The user sees "Withdrawal accepted," the balance is gone, but money is not on its way.

---

### Root Cause 3: Transfer Accounting Issues (Problem 3)

**Primary cause**: `execute_user_transfer()` locks wallets in this order:

```sql
SELECT id FROM wallets WHERE user_id = sender_id FOR UPDATE;    -- Lock 1
SELECT id FROM wallets WHERE user_id = v_recipient_id FOR UPDATE; -- Lock 2
```

If user A transfers to user B while user B simultaneously transfers to user A, PostgreSQL detects a deadlock and aborts one transaction. The user gets an error. No money is lost, but the UX is broken.

**Secondary cause**: Fee logic mismatch between UI and backend. `MobileTransferFlow.tsx` and `Transfer.tsx` both display fee as `TRANSFER_FEE = 50` (flat ₦50), but `execute_user_transfer()` computes `LEAST(amount * 0.035, 5000)`. The `Transfer.tsx` page calls `execute_user_transfer()` directly via RPC, so the backend deducts the percentage-based fee while the user confirms a flat ₦50 summary. For high-value transfers (₦5,000+), the discrepancy grows significantly.

**Tertiary cause**: The receiver transaction in `execute_user_transfer()` is created with `status = 'processing'` and never updated to `'completed'`. The receiver may query their transaction history and see a pending transaction that never resolves.

---

## 4. Comparison With Blnk Fintech Repository

Blnk (`blnk-main`) is a production-grade double-entry ledger engine. Here is what it does that NeXa does not:

### 4.1 Blnk's Ledger Architecture

Blnk's `model/balance.go` defines balance as a **derived view** from credit and debit accumulators, not a stored running total:

```go
type Balance struct {
    Balance               *big.Int  // = CreditBalance - DebitBalance
    CreditBalance         *big.Int  // sum of all credit entries
    DebitBalance          *big.Int  // sum of all debit entries
    InflightBalance       *big.Int  // pending/in-flight amount
    InflightCreditBalance *big.Int
    InflightDebitBalance  *big.Int
    Version               int64     // optimistic concurrency control
}
```

Balance is computed as `CreditBalance - DebitBalance`. It is never stored directly. Any time you query a balance in Blnk, the system computes it from the accumulated ledger entries. **NeXa stores `wallets.balance` as a mutable value and appends ledger entries as a secondary audit trail.** This is the fundamental inversion.

Blnk uses `big.Int` (arbitrary precision integers in minor units) to avoid floating-point arithmetic errors. NeXa uses `DECIMAL(10,2)` and `NUMERIC(12,2)` — which PostgreSQL handles correctly, but JavaScript's `Number` type (used throughout the frontend) introduces potential precision loss for large amounts.

### 4.2 Blnk's Transaction Model

Blnk's `model/transaction.go` has `Source` and `Destination` fields identifying which balance accounts are debited and credited. A single transaction record touches two ledger balances. This is true double-entry bookkeeping.

NeXa has separate transaction records for sender and receiver in a transfer (`transfer_out` and `transfer_in`), which is a pseudo-double-entry approach. The problem is there's no constraint ensuring both records are always created together atomically — the function does create them in one PL/pgSQL block, which is correct, but the semantic link between them is only the shared `reference` value.

### 4.3 What NeXa Does Wrong (vs. Blnk)

| Issue | NeXa | Blnk |
|---|---|---|
| Balance storage | Mutable `wallets.balance` | Computed from ledger sum |
| Idempotency key | Frontend-generated UUID (new per render) | Server-generated, tied to business context |
| Inflight/pending balance | `locked_balance` column (unused) | `InflightBalance` derived from inflight transactions |
| Transaction atomicity | PL/pgSQL function (good) but state management is fragmented | Atomic queue-based processing |
| Webhook deduplication | By `provider_reference` in `wallet_webhook_events` | Not applicable (Blnk is a library, not a payment gateway) |
| Settlement decision | Distributed across webhook, verify, and settlement worker — all calling settle | Single settlement path, queued |
| Arithmetic precision | `DECIMAL(10,2)` in DB, `Number` in JS | `big.Int` in minor units throughout |

### 4.4 What NeXa Does Better Than Blnk (for this use case)

Blnk is a standalone microservice that requires Redis, a queue system, and a separate deployment. NeXa correctly identified that deploying Blnk would violate the single-application constraint. The Supabase Edge Function + PL/pgSQL approach is appropriate for the scale and architecture. NeXa's `wallet_settle_transaction()` function is conceptually sound — its problems are in the calling layer, not the function itself.

### 4.5 What Should Be Adopted From Blnk

1. **Balance as a computed view, not a stored value**: Derive `wallets.balance` from a SQL `SUM()` over `wallet_ledger` entries where `balance_effective = true`. The stored `balance` column becomes a materialized cache, updated ONLY by ledger entries, never directly.

2. **Version column for optimistic locking**: Add `version BIGINT NOT NULL DEFAULT 0` to `wallets`. Every update increments version. Callers read version before update and include it in the WHERE clause. PostgreSQL enforces no concurrent mutation.

3. **Inflight balance**: Use `wallet_reservations` (already exists) as the source of truth for pending/reserved amounts. Compute `available_balance = wallets.balance - SUM(wallet_reservations.amount WHERE state = 'open')`.

4. **Single settlement writer**: The settlement worker (`wallet-settlement-worker`) should be the ONLY function that calls `wallet_settle_transaction()`. The webhook endpoint and verify endpoint should only store events and enqueue settlement jobs, never settle directly.

### 4.6 What Should NOT Be Adopted From Blnk

1. **Redis/queue infrastructure**: Blnk requires Redis for its queue. NeXa's `wallet_settlement_jobs` table as an in-database queue is the correct Supabase-native equivalent.
2. **Microservice architecture**: Blnk is designed as a standalone service. Not applicable.
3. **`big.Int` arithmetic**: PostgreSQL `NUMERIC(18,2)` is sufficient and avoids the complexity of integer-only math throughout the codebase.

---

## 5. Critical Risks

### Risk 1: Double Credit on Deposit (Severity: CRITICAL)

The webhook handler and verify endpoint both call `wallet_settle_transaction()` within `settlePagaWalletTransaction()` AND then call it again explicitly. Under concurrent conditions (webhook fires simultaneously with a verify poll completing), both paths run `wallet_settle_transaction()`. PostgreSQL's `FOR UPDATE` row lock serializes them, and the idempotency guard catches the second call. **However**: if the idempotency guard in `wallet_credit()` has a type comparison bug (`v_state = p_wallet_state::public.wallet_tx_state` where `p_wallet_state` is a `TEXT` parameter), a PostgreSQL type-cast error at that comparison line would cause an exception in the inner credit function, which would bubble up and cause the outer `wallet_settle_transaction()` to roll back — meaning neither credit succeeds. This is a silent failure mode, not a double-credit, but it produces the "deposit not credited" symptom.

### Risk 2: User Wallet Debited, Paga Never Receives Transfer (Severity: CRITICAL)

`wallet_create_withdrawal_intent()` debits `wallets.balance` before any Paga API call succeeds. If all 81 Paga HTTP attempts in `paga-transfer/index.ts` fail (timeouts, Paga downtime, DNS failure), the function returns `{ status: true, state: "processing" }`. The user's balance is permanently reduced. Recovery requires manual intervention or the reconciliation worker detecting the discrepancy — which only works if Paga's status API can be queried for this reference later.

### Risk 3: Webhook Signature Bypass in Sandbox (Severity: HIGH)

```typescript
if (IS_SANDBOX && !receivedHash) {
    signatureValid = true;
}
```

This is in `paga-webhook/index.ts`. Any POST request to the webhook endpoint with no `hash` header will be treated as a valid Paga webhook in sandbox mode. If `PAGA_IS_SANDBOX=true` leaks to production, or if the sandbox instance handles real money (e.g., staging environment receiving test-funded accounts), arbitrary webhook forgery is possible.

### Risk 4: No Rate Limiting on Verify Endpoint (Severity: HIGH)

`paga-verify-payment/index.ts` has no authentication check beyond the existence of `referenceNumber` in the request body. Any user can poll this endpoint with any reference number. The `forceSuccess` parameter in sandbox mode:

```typescript
mockSuccess: isSandbox && body.forceSuccess === true
```

...can force any pending transaction to `success` state if the request body contains `forceSuccess: true` and the environment is sandbox. This is a serious privilege escalation risk if sandbox and production share any infrastructure.

### Risk 5: Transfer Deadlock (Severity: MEDIUM)

`execute_user_transfer()` locks sender wallet then receiver wallet. Concurrent reverse transfers between the same two users cause deadlocks. PostgreSQL resolves deadlocks by aborting one transaction with error code `40P01`. The RPC caller in `Transfer.tsx` catches this as a generic error and shows "Transfer Failed" to the user. No retry logic exists.

### Risk 6: Frontend Balance Display Inconsistency (Severity: MEDIUM)

`AuthContext.tsx` reads `wallets.balance` from the `wallets` table directly. After a withdrawal is created, `wallet_create_withdrawal_intent()` immediately debits the balance. The `refreshWallet()` in the withdraw flow calls this after `onWithdrawSubmit` completes. However, there's a race: `MobileWithdrawFlow.tsx` calls `refreshWallet()` in `handlePinSuccess()` after `onWithdrawSubmit()` resolves. If `onWithdrawSubmit()` resolves before the DB commit completes (unlikely but possible in Supabase's connection pool), the `refreshWallet()` read sees stale balance.

---

## 6. Recommended Architecture

### 6.1 Design Philosophy

The target architecture is **single-writer ledger with computed balance**. This means:

1. `wallets.balance` is a **materialized cache** computed from `wallet_ledger` entries. It is updated ONLY by the `wallet_credit()` and `wallet_debit()` functions — never by any direct `UPDATE wallets SET balance = ...` call.
2. The **settlement worker is the only path that finalizes money**. Webhook and verify endpoints are **ingest-only** — they store events and enqueue jobs. They never call `wallet_settle_transaction()` directly.
3. **Idempotency keys are server-generated** from business context (user_id + amount + wallet_type + ISO date + counter), not client-generated UUIDs.
4. **Withdrawal reserves** are the difference between available and total balance. Available balance = `wallets.balance - SUM(open reservations)`. The `balance` column stores total (including reserved) funds.

### 6.2 Architecture Diagram

```
[Client App]
    |
    | (user initiates deposit/withdrawal/transfer)
    v
[Supabase Edge Functions - COMMAND LAYER]
    |── paga-initiate-payment   → Creates transaction intent → enqueues settlement job
    |── paga-transfer           → Creates withdrawal intent → debits balance → calls Paga → enqueues result
    |── transfer-funds          → Calls execute_user_transfer() (atomic)
    |── paga-webhook (INGEST ONLY) → Stores webhook event → enqueues settlement job
    |── paga-verify-payment (QUERY ONLY) → Returns current state → NO settlement
    v
[PostgreSQL - SINGLE SOURCE OF TRUTH]
    |── transactions            (lifecycle state machine)
    |── wallet_ledger           (append-only money movements)
    |── wallet_reservations     (pending holds)
    |── wallet_webhook_events   (immutable webhook inbox)
    |── wallet_settlement_jobs  (queue)
    v
[wallet-settlement-worker - SINGLE WRITER]
    |── Reads settlement_jobs
    |── Calls wallet_settle_transaction() (ONLY this worker does so)
    |── Writes ledger entries via wallet_credit()/wallet_debit()
    |── Updates wallets.balance (ONLY via credit/debit functions)
    v
[wallet-reconciliation-worker - READ + COMPARE]
    |── Queries Paga status API
    |── Creates reconciliation findings
    |── Enqueues settlement jobs for mismatched transactions
```

### 6.3 Key Invariants

1. **No direct `UPDATE wallets SET balance`** anywhere in the codebase except inside `wallet_credit()` and `wallet_debit()`.
2. **Every `wallets.balance` change has a corresponding `wallet_ledger` entry.** Enforced by a trigger.
3. **`wallet_settle_transaction()` is called ONLY by `wallet_process_settlement_jobs()`**, which is called ONLY by the settlement worker.
4. **Webhook endpoint returns 200 immediately** after storing the event. Never attempts settlement.
5. **Verify endpoint is read-only**. Returns `transactions.wallet_state`. Never triggers settlement.
6. **Idempotency keys are generated server-side** from a hash of `(user_id, operation_type, amount, reference)`.

---

## 7. Database Design

### 7.1 Wallets Table

**Purpose**: One record per user per wallet type. Stores materialized balance cache.

```sql
-- Alters to existing wallets table
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_balance NUMERIC(18,2) GENERATED ALWAYS AS 
    (balance) STORED, -- will update via trigger
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Version increment trigger
CREATE OR REPLACE FUNCTION public.wallet_increment_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_version ON public.wallets;
CREATE TRIGGER trg_wallet_version
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.wallet_increment_version();

-- Enforce: every balance update must have a corresponding ledger entry
-- This is enforced procedurally (wallet_credit/debit are SECURITY DEFINER),
-- supplemented by a deferred trigger that checks ledger row exists for the
-- current transaction_id being processed.
```

**Indexes**:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_user_type 
  ON public.wallets(user_id, wallet_type);
CREATE INDEX IF NOT EXISTS idx_wallets_frozen 
  ON public.wallets(is_frozen) WHERE is_frozen = TRUE;
```

---

### 7.2 Transactions Table

**Purpose**: Tracks the lifecycle of every payment operation. Not an accounting table — that is `wallet_ledger`. Transactions are the business record; ledger entries are the accounting record.

```sql
-- Required additions to existing transactions table
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paga_reference TEXT;

-- New index for lookup by paga_reference
CREATE INDEX IF NOT EXISTS idx_transactions_paga_ref 
  ON public.transactions(paga_reference)
  WHERE paga_reference IS NOT NULL;

-- Constraint: idempotency key unique per user + operation type
DROP INDEX IF EXISTS transactions_idempotency_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_idempotency_user 
  ON public.transactions(idempotency_key, type)
  WHERE idempotency_key IS NOT NULL;
```

**State enum values** (production-complete):
```sql
-- wallet_tx_state should contain:
-- pending, processing, debited, credited, success, failed, reversed, expired
```

---

### 7.3 Wallet Ledger Table

**Purpose**: Append-only accounting record. Every debit and credit that changes `wallets.balance` must have a row here. The sum of `wallet_ledger` entries for a wallet must always equal `wallets.balance`.

```sql
-- Existing wallet_ledger table is adequate but needs one addition:
ALTER TABLE public.wallet_ledger
  ADD COLUMN IF NOT EXISTS transaction_ref TEXT, -- denormalized for fast lookup
  ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'system';

-- Invariant verification function (run periodically)
CREATE OR REPLACE FUNCTION public.verify_wallet_ledger_balance(p_wallet_id UUID)
RETURNS TABLE(
  wallet_id UUID,
  stored_balance NUMERIC,
  computed_balance NUMERIC,
  discrepancy NUMERIC,
  is_consistent BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    w.id AS wallet_id,
    w.balance AS stored_balance,
    COALESCE(
      SUM(CASE WHEN l.entry_type = 'credit' THEN l.amount
               WHEN l.entry_type = 'debit' THEN -l.amount
               ELSE 0 END),
      0
    ) AS computed_balance,
    w.balance - COALESCE(
      SUM(CASE WHEN l.entry_type = 'credit' THEN l.amount
               WHEN l.entry_type = 'debit' THEN -l.amount
               ELSE 0 END),
      0
    ) AS discrepancy,
    w.balance = COALESCE(
      SUM(CASE WHEN l.entry_type = 'credit' THEN l.amount
               WHEN l.entry_type = 'debit' THEN -l.amount
               ELSE 0 END),
      0
    ) AS is_consistent
  FROM public.wallets w
  LEFT JOIN public.wallet_ledger l ON l.wallet_id = w.id
  WHERE w.id = p_wallet_id
  GROUP BY w.id, w.balance;
$$;
```

---

### 7.4 Webhook Events Table

**Purpose**: Immutable inbox. One row per unique incoming webhook. Webhook endpoint writes here and returns. Settlement worker reads from here.

```sql
-- Existing wallet_webhook_events table is adequate.
-- Ensure handled_at is set when processed:

CREATE OR REPLACE FUNCTION public.wallet_mark_webhook_handled(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.wallet_webhook_events
  SET handled = TRUE, handled_at = NOW()
  WHERE id = p_id AND handled = FALSE;
END;
$$;
```

---

### 7.5 Reconciliation Tables

**Purpose**: Track reconciliation runs and findings. Already exists from `20260421032000_wallet_reconciliation.sql`. No schema changes needed.

```sql
-- Add index for efficient finding retrieval
CREATE INDEX IF NOT EXISTS idx_recon_findings_severity 
  ON public.wallet_reconciliation_findings(severity, action_state, created_at DESC)
  WHERE action_state = 'open';
```

---

### 7.6 Audit Log Table (NEW - Missing from Current Schema)

**Purpose**: Immutable record of all state changes with actor, source, and evidence. Currently the system embeds audit data in `wallet_provider_operations` and transaction `metadata`. A dedicated audit log is required for regulatory/compliance purposes.

```sql
CREATE TABLE IF NOT EXISTS public.wallet_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,           -- 'transaction', 'wallet', 'webhook'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,                -- 'state_change', 'balance_credit', 'balance_debit'
  old_value JSONB,
  new_value JSONB,
  actor TEXT NOT NULL,                 -- 'settlement_worker', 'webhook', 'user', 'admin'
  actor_id UUID,                       -- user_id if actor is 'user'
  ip_address INET,
  evidence JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_audit_entity 
  ON public.wallet_audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_wallet_audit_actor 
  ON public.wallet_audit_log(actor, created_at DESC);
```

---

## 8. Ledger Design

### 8.1 Why Derived Balance, Not Stored Balance

**The fundamental problem**: When `wallets.balance` is the source of truth, a single race condition between two concurrent crediting events can produce a wrong balance permanently. There is no way to detect this from the balance column alone.

When balance is derived from `wallet_ledger` entries, every credit and debit is an immutable fact. If two credits fire for the same transaction, the ledger will contain two credit entries for that transaction reference. This is detectable and auditable. The `unique_key` constraint on `wallet_ledger_entries` (from the `wallet_ledger_entries` table in `20260421030000_wallet_redesign_core.sql`) enforces that one transaction can only produce one credit entry.

### 8.2 How Balance Is Computed

The recommended approach is **materialized balance with ledger-enforced writes**:

```
Balance = Σ (credits in wallet_ledger) - Σ (debits in wallet_ledger)
```

The stored `wallets.balance` is updated by `wallet_credit()` and `wallet_debit()` functions that **also** write to `wallet_ledger` in the same atomic transaction. The balance column is a performance optimization — it avoids a full ledger scan on every balance read. It is never written to directly.

```sql
-- The invariant: this query MUST always return 0 discrepancy
SELECT * FROM verify_wallet_ledger_balance('<wallet_id>');
```

### 8.3 Available Balance vs Total Balance

```
Total balance (wallets.balance) = Available + Reserved
Reserved = SUM(wallet_reservations.amount WHERE state = 'open')
Available = wallets.balance - Reserved
```

This is exposed to the frontend via a view or RPC:

```sql
CREATE OR REPLACE FUNCTION public.get_wallet_available_balance(p_user_id UUID, p_wallet_type TEXT DEFAULT 'clan')
RETURNS TABLE(total_balance NUMERIC, reserved NUMERIC, available NUMERIC)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    w.balance,
    COALESCE(SUM(r.amount) FILTER (WHERE r.state = 'open'), 0) AS reserved,
    w.balance - COALESCE(SUM(r.amount) FILTER (WHERE r.state = 'open'), 0) AS available
  FROM public.wallets w
  LEFT JOIN public.wallet_reservations r ON r.wallet_id = w.id
  WHERE w.user_id = p_user_id AND w.wallet_type = p_wallet_type
  GROUP BY w.balance;
$$;
```

### 8.4 Ledger Entry Types and Their Meanings

| Entry Type | Direction | Balance Effect | When Created |
|---|---|---|---|
| `debit` (withdrawal initiation) | debit | Reduces `wallets.balance` immediately | On `wallet_create_withdrawal_intent()` |
| `credit` (deposit success) | credit | Increases `wallets.balance` | On `wallet_settle_transaction()` with decision `success` |
| `credit` (withdrawal reversal) | credit | Increases `wallets.balance` | On `wallet_settle_transaction()` with decision `failed/reversed` |
| `debit` (transfer out) | debit | Reduces sender's balance | On `execute_user_transfer()` |
| `credit` (transfer in) | credit | Increases receiver's balance | On `execute_user_transfer()` |
| `debit` (fee) | debit | Reduces balance | Could be separate entry from main debit |
| `credit` (reversal/refund) | credit | Increases balance | On reversal path |

---

## 9. Webhook Design

### 9.1 Current Webhook Failure Mode

The current `paga-webhook/index.ts` violates the single-responsibility principle:

1. Validates signature ✓
2. Deduplicates by reference ✓
3. Stores event ✓
4. **Settles transaction ✗** (should not do this)
5. **Explicitly re-settles if success ✗** (double settlement call)

### 9.2 Redesigned Webhook Flow

**Phase 1: Ingest (webhook endpoint responsibility)**

```
POST /paga-webhook
  1. Validate HTTP method (POST only)
  2. Parse raw body as text (before JSON.parse for signature verification)
  3. Validate Paga signature
     - If invalid AND not sandbox: log and return 200 {"received":true,"ignored":true}
     - If invalid AND sandbox with no hash: treat as valid (sandbox bypass)
  4. Extract provider_reference from payload
  5. INSERT INTO wallet_webhook_events (idempotent via UNIQUE on provider+payload_hash)
     - If duplicate: return 200 {"received":true,"duplicate":true}
  6. INSERT INTO wallet_settlement_jobs (p_source='webhook', p_delay_seconds=0)
  7. Return 200 {"received":true,"queued":true}

-- webhook endpoint NEVER calls wallet_settle_transaction()
-- webhook endpoint NEVER calls settlePagaWalletTransaction()
-- webhook endpoint NEVER reads wallets.balance
```

**Phase 2: Settlement (settlement worker responsibility)**

```
wallet-settlement-worker (called every 30 seconds via pg_cron or Supabase cron)
  1. wallet_process_settlement_jobs(p_limit=25)
     - For each job:
       a. Fetch transaction by id
       b. If already in terminal state: mark job completed, skip
       c. Call wallet_settle_transaction(transaction_id, decision, source, evidence)
       d. Mark job completed
       e. Mark wallet_webhook_events.handled = true
```

**Phase 3: Failure Recovery**

```
Settlement job fails (exception in wallet_settle_transaction):
  - Increment wallet_settlement_jobs.attempts
  - Set wallet_settlement_jobs.last_error
  - Set available_at = NOW() + (2^attempts * 30 seconds) (exponential backoff)
  - After 5 attempts: set state = 'failed', create reconciliation finding
```

### 9.3 Idempotency at the Webhook Level

The `wallet_webhook_events` table has:
```sql
UNIQUE(provider, payload_hash)
UNIQUE(provider, provider_event_id) WHERE provider_event_id IS NOT NULL
```

The `payload_hash` is computed from the raw webhook body:
```sql
encode(digest(convert_to(raw_body, 'UTF8'), 'sha256'), 'hex')
```

This means two webhook deliveries of identical payloads from Paga (Paga sometimes retries) are deduplicated before any settlement logic runs. The second delivery gets `{"received":true,"duplicate":true}`.

### 9.4 Race Condition Protection

The `wallet_settle_transaction()` function uses `FOR UPDATE` to lock the transaction row. Combined with the terminal state check at the top:

```sql
IF v_tx.wallet_state IN ('success', 'failed', 'reversed', 'expired') THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, ...);
END IF;
```

This ensures that even if two settlement jobs both have the same transaction_id (e.g., from a webhook and a reconciliation job both queued for the same transaction), only one will actually perform the settlement. The second will see the terminal state and return immediately.

---

## 10. Idempotency Design

### 10.1 Deposit Idempotency

**Current problem**: Frontend generates a new `crypto.randomUUID()` on every `handlePayment()` call.

**Fix**: Server generates the idempotency key:

```typescript
// In paga-initiate-payment/index.ts
const idempotencyKey = await generateDepositIdempotencyKey(user.id, amount, walletType);

// Server-side function:
function generateDepositIdempotencyKey(userId: string, amount: number, walletType: string): string {
  const date = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
  const input = `deposit:${userId}:${amount}:${walletType}:${date}`;
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
}
```

**One deposit attempt per user per amount per wallet type per day.** If the user tries again with the same parameters, they get the existing transaction back.

**Storage**: The `transactions.idempotency_key` column with `UNIQUE INDEX ON (idempotency_key, type)`.

**Validation rule**: If a transaction with this idempotency key exists in any non-terminal state, return the existing transaction (including its Paga checkout URL if available). If it's in a terminal success state, return success. If terminal failure, allow new attempt with new key.

### 10.2 Withdrawal Idempotency

**Current partial fix**: `wallet_create_withdrawal_intent()` checks `idempotency_key` if provided. The frontend (`paga-transfer/index.ts`) passes `idempotency_key || null`.

**Fix**: Always generate and pass idempotency key for withdrawals:

```sql
-- Key components: user_id + amount + account_number + date
-- This prevents a user from submitting two identical withdrawals on the same day
```

**Critical rule**: An open withdrawal reservation must prevent a second withdrawal that would overdraw. The current `wallet_create_withdrawal_intent()` checks `v_balance < p_amount` — this correctly prevents overdraft because balance is immediately debited on reservation. **But**: if the first withdrawal fails and is refunded, a second withdrawal can proceed. This is correct behavior.

### 10.3 Transfer Idempotency

**Currently missing entirely.** `execute_user_transfer()` has no idempotency protection. If the frontend times out and retries, two transfers can execute.

**Fix**: Add idempotency to transfers:

```sql
CREATE OR REPLACE FUNCTION public.execute_user_transfer(
  sender_id UUID,
  recipient_ign TEXT,
  amount NUMERIC,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_existing_ref TEXT;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT reference INTO v_existing_ref
    FROM public.transactions
    WHERE idempotency_key = p_idempotency_key
      AND type = 'transfer_out'
      AND user_id = sender_id
    LIMIT 1;
    
    IF FOUND THEN
      RETURN json_build_object('idempotent', true, 'reference', v_existing_ref);
    END IF;
  END IF;
  
  -- ... rest of transfer logic
END;
$$;
```

### 10.4 Webhook Idempotency

**Already in place** via `UNIQUE(provider, payload_hash)` and `UNIQUE(provider, provider_event_id)` on `wallet_webhook_events`. The implementation is correct.

**One gap**: The current implementation also checks `provider_reference` for duplicates:
```typescript
const { data: existingEvent } = await supabaseAdmin
    .from("wallet_webhook_events")
    .select("id, handled")
    .eq("provider", "paga")
    .eq("provider_reference", referenceNumber)
    .maybeSingle();
```

This deduplicates by reference, not by payload. If Paga sends two different webhook payloads for the same reference (e.g., a "payment initiated" and "payment completed" event), the second is ignored. **This is a bug** — both payloads should be stored, and only the terminal one should trigger settlement. Fix: remove the pre-store duplicate check by reference; rely only on `payload_hash` uniqueness. The settlement worker handles terminal state idempotency.

---

## 11. Reconciliation Design

### 11.1 Current Reconciliation Architecture

The `wallet-reconciliation-worker` (edge function) is well-designed:
1. Starts a reconciliation run record
2. Queries transactions in `pending/processing` state older than a threshold
3. For each, queries Paga's status API
4. Records provider operation
5. Enqueues settlement job with decision hint
6. Creates reconciliation findings for mismatches

The `wallet-settlement-worker` processes the queued jobs.

**Gaps identified**:
1. Reconciliation worker queries only `pending/processing` transactions. Transactions stuck in `debited` state (withdrawal initiated, Paga not confirmed) are missed if `'debited'` is not included.
2. No reconciliation for `transfer_out`/`transfer_in` transactions (there's no external Paga reference to check for internal transfers, but orphaned transactions need cleanup).
3. No weekly summary report.

### 11.2 Daily Reconciliation Process (Fixed)

```typescript
// In wallet-reconciliation-worker, fix the state filter:
const { data: pendingTx } = await supabaseAdmin
  .from("transactions")
  .select("id, reference, paga_reference, wallet_state, type, updated_at")
  .in("wallet_state", ["pending", "processing", "debited"])  // ADD 'debited'
  .eq("provider", "paga")
  .in("type", ["deposit", "withdrawal"])  // Only external transactions
  .lt("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString()) // > 30 min old
  .order("updated_at", { ascending: true })
  .limit(100);
```

### 11.3 Weekly Reconciliation Process

A weekly reconciliation should:
1. Compare total credits from Paga (via `transactionHistory` API) against total `wallet_ledger` credit entries for the week
2. Detect any Paga payments that have no matching `wallet_ledger` entry
3. Detect any `wallet_ledger` entries that have no matching Paga payment record
4. Generate a summary report stored in `wallet_reconciliation_runs.summary`

```sql
-- Weekly reconciliation summary query
SELECT 
  COUNT(*) FILTER (WHERE wallet_state = 'success') AS settled_count,
  SUM(amount) FILTER (WHERE wallet_state = 'success' AND type = 'deposit') AS total_deposited,
  SUM(amount) FILTER (WHERE wallet_state = 'success' AND type = 'withdrawal') AS total_withdrawn,
  COUNT(*) FILTER (WHERE wallet_state IN ('pending', 'processing', 'debited')) AS stuck_count,
  COUNT(*) FILTER (WHERE wallet_state = 'failed') AS failed_count
FROM public.transactions
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND type IN ('deposit', 'withdrawal');
```

### 11.4 Recovery Actions

| Finding Type | Automated Action | Manual Action |
|---|---|---|
| `terminal_state_mismatch` (DB processing, Paga failed) | Enqueue settlement with `failed` decision | Review for refund |
| `missing_credit` (Paga success, DB pending) | Enqueue settlement with `success` decision | Verify amount matches |
| `duplicate_credit` (two ledger entries same reference) | Flag only, no auto-action | Manually reverse one entry |
| `orphaned_debit` (balance debited, no Paga response) | Query Paga, enqueue result | If Paga silent after 24h, refund |
| `insufficient_reservation` (reservation consumed > once) | Flag for manual review | Audit ledger for double-debit |

---

## 12. Supabase Implementation Guide

### 12.1 Row Level Security (RLS)

```sql
-- Users can only read their own transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only read their own wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

-- Ledger is read-only for users, write-only for SECURITY DEFINER functions
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own ledger entries"
  ON public.wallet_ledger FOR SELECT
  USING (
    wallet_id IN (
      SELECT id FROM public.wallets WHERE user_id = auth.uid()
    )
  );

-- Webhook events: admin only
ALTER TABLE public.wallet_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Webhook events admin only"
  ON public.wallet_webhook_events
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Settlement jobs: no direct user access
ALTER TABLE public.wallet_settlement_jobs ENABLE ROW LEVEL SECURITY;
-- No SELECT policy = no user access
```

### 12.2 Critical Database Constraints

```sql
-- Prevent wallets.balance from going negative
ALTER TABLE public.wallets 
  ADD CONSTRAINT wallets_balance_non_negative 
  CHECK (balance >= 0);

-- Prevent wallet_ledger entries with zero amount
ALTER TABLE public.wallet_ledger
  ADD CONSTRAINT wallet_ledger_amount_positive
  CHECK (amount > 0);

-- Prevent wallet_reservations from going negative
ALTER TABLE public.wallet_reservations
  ADD CONSTRAINT reservations_amount_positive
  CHECK (amount > 0);
```

### 12.3 Critical Trigger — Enforce Ledger-First Balance Updates

```sql
-- This trigger ensures wallets.balance is never updated 
-- without a corresponding wallet_ledger entry in the SAME transaction.
-- Implementation: track the current transaction's ledger writes via session variable.

CREATE OR REPLACE FUNCTION public.enforce_ledger_before_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Skip if balance didn't change
  IF NEW.balance = OLD.balance THEN
    RETURN NEW;
  END IF;
  
  -- Check if a ledger entry was written in this DB transaction for this wallet
  IF NOT EXISTS (
    SELECT 1 FROM public.wallet_ledger
    WHERE wallet_id = NEW.id
      AND created_at >= NOW() - INTERVAL '1 second'
      -- More precise: use pg_current_xact_id() comparison
  ) THEN
    RAISE EXCEPTION 'wallets.balance cannot be updated without a wallet_ledger entry. Use wallet_credit() or wallet_debit() functions.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: The above trigger has a timing window issue.
-- The production-grade approach is to use advisory locks or session-level tracking.
-- For NeXa's scale, SECURITY DEFINER functions + code review is sufficient.
-- The trigger above is a development safeguard, not a production enforcement.
```

### 12.4 Scheduled Jobs (pg_cron)

```sql
-- Install pg_cron extension (requires Supabase Pro or pg_cron add-on)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Settlement worker: every 30 seconds
SELECT cron.schedule(
  'wallet-settlement-job',
  '*/1 * * * *',  -- Every minute (pg_cron minimum is 1 minute)
  $$SELECT net.http_post(
    url := current_setting('app.settlement_worker_url'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.worker_token'),
      'Content-Type', 'application/json'
    ),
    body := '{"batchSize": 25}'::jsonb
  )$$
);

-- Reconciliation worker: every 15 minutes
SELECT cron.schedule(
  'wallet-reconciliation-job', 
  '*/15 * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.reconciliation_worker_url'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.worker_token')
    ),
    body := '{}'::jsonb
  )$$
);

-- Expire stale pending transactions: every hour
SELECT cron.schedule(
  'wallet-expire-transactions',
  '0 * * * *',
  $$SELECT wallet_enqueue_expired_transactions(100)$$
);
```

**Alternative if pg_cron is unavailable**: Use Supabase's built-in Edge Function schedule (available in dashboard) to call the settlement and reconciliation workers on a timer.

### 12.5 Supabase Realtime Considerations

The frontend uses `refreshWallet()` after transactions. This is a manual poll. Consider using Supabase Realtime to subscribe to `wallets` table changes for the current user's wallet:

```typescript
// In AuthContext.tsx — replace manual refreshWallet polling with realtime
const channel = supabase
  .channel('wallet-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'wallets',
      filter: `user_id=eq.${user.id}`,
    },
    (payload) => {
      setProfile(prev => ({
        ...prev,
        wallet_balance: payload.new.balance,
        clan_wallet_balance: payload.new.wallet_type === 'clan' ? payload.new.balance : prev?.clan_wallet_balance,
        marketplace_wallet_balance: payload.new.wallet_type === 'marketplace' ? payload.new.balance : prev?.marketplace_wallet_balance,
      }));
    }
  )
  .subscribe();
```

This eliminates the need for `refreshWallet()` calls scattered throughout the codebase.

---

## 13. Migration Plan

### Principle: Zero Fund Loss

Every step below has a verification step and a rollback step.

### Step 1: Audit Current Balances (Preparation)

```sql
-- Create a snapshot of all current balances
CREATE TABLE IF NOT EXISTS public.migration_balance_snapshot (
  wallet_id UUID NOT NULL,
  user_id UUID NOT NULL,
  wallet_type TEXT NOT NULL,
  balance_at_snapshot NUMERIC(18,2) NOT NULL,
  ledger_computed_balance NUMERIC(18,2),
  snapshot_taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  migration_run TEXT NOT NULL
);

-- Populate snapshot
INSERT INTO public.migration_balance_snapshot (wallet_id, user_id, wallet_type, balance_at_snapshot, migration_run)
SELECT id, user_id, wallet_type, balance, 'pre_migration_june_2026'
FROM public.wallets;

-- Compute ledger balance for each wallet
UPDATE public.migration_balance_snapshot s
SET ledger_computed_balance = (
  SELECT COALESCE(SUM(CASE WHEN l.entry_type = 'credit' THEN l.amount 
                           WHEN l.entry_type = 'debit' THEN -l.amount 
                           ELSE 0 END), 0)
  FROM public.wallet_ledger l
  WHERE l.wallet_id = s.wallet_id
);

-- Report discrepancies
SELECT wallet_id, user_id, balance_at_snapshot, ledger_computed_balance,
       (balance_at_snapshot - ledger_computed_balance) AS discrepancy
FROM public.migration_balance_snapshot
WHERE ABS(balance_at_snapshot - COALESCE(ledger_computed_balance, 0)) > 0.01;
```

### Step 2: Backfill Missing Ledger Entries

For any wallet where `wallets.balance` does not equal the sum of `wallet_ledger` entries, create a correction ledger entry:

```sql
-- For each wallet with discrepancy, create a reconciliation credit/debit
INSERT INTO public.wallet_ledger (wallet_id, transaction_id, entry_type, amount, balance_before, balance_after)
SELECT 
  s.wallet_id,
  (SELECT id FROM public.transactions 
   WHERE wallet_id = s.wallet_id AND type = 'deposit' 
   ORDER BY created_at DESC LIMIT 1),  -- Link to most recent transaction as proxy
  CASE WHEN (s.balance_at_snapshot - s.ledger_computed_balance) > 0 
       THEN 'credit' ELSE 'debit' END,
  ABS(s.balance_at_snapshot - COALESCE(s.ledger_computed_balance, 0)),
  COALESCE(s.ledger_computed_balance, 0),
  s.balance_at_snapshot
FROM public.migration_balance_snapshot s
WHERE ABS(s.balance_at_snapshot - COALESCE(s.ledger_computed_balance, 0)) > 0.01;
```

### Step 3: Deploy New Code (Parallel Run)

Deploy the fixed codebase with:
- Webhook endpoint: ingest-only (no `wallet_settle_transaction()` call)
- Verify endpoint: read-only (no settlement)
- Settlement worker: sole settler

Run in parallel for 48 hours: both old and new code active. Monitor for discrepancies.

### Step 4: Verification

```sql
-- After 48 hours, verify all balances are still consistent
SELECT 
  COUNT(*) AS total_wallets,
  COUNT(*) FILTER (WHERE ABS(w.balance - COALESCE(l.computed_balance, 0)) < 0.01) AS consistent,
  COUNT(*) FILTER (WHERE ABS(w.balance - COALESCE(l.computed_balance, 0)) >= 0.01) AS inconsistent,
  MAX(ABS(w.balance - COALESCE(l.computed_balance, 0))) AS max_discrepancy
FROM public.wallets w
LEFT JOIN (
  SELECT wallet_id, 
    SUM(CASE WHEN entry_type = 'credit' THEN amount WHEN entry_type = 'debit' THEN -amount ELSE 0 END) AS computed_balance
  FROM public.wallet_ledger
  GROUP BY wallet_id
) l ON l.wallet_id = w.id;
```

### Step 5: Cutover

1. Disable deposits and withdrawals via `clan_settings` (already exists in the system)
2. Run final reconciliation worker pass
3. Run final balance verification
4. Enable new code exclusively
5. Re-enable deposits and withdrawals

### Step 6: Rollback Strategy

The `migration_balance_snapshot` table contains the ground truth. If the new system produces wrong balances:

```sql
-- EMERGENCY ROLLBACK: restore balances from snapshot
UPDATE public.wallets w
SET balance = s.balance_at_snapshot,
    updated_at = NOW()
FROM public.migration_balance_snapshot s
WHERE w.id = s.wallet_id
  AND s.migration_run = 'pre_migration_june_2026';
```

This restores balances. The old code can be re-deployed immediately since it was not removed.

---

## 14. Jules Execution Plan

### Overview

Each phase is atomic. Do not start Phase N+1 until Phase N acceptance criteria are met. Test after each phase.

---

### Phase 1: Architecture Foundation

**Objectives**: Add missing constraints, triggers, audit log, and enforce ledger-first balance updates.

**Files to Create**:
- `supabase/migrations/20260615000000_architecture_foundation.sql`

**Database Changes**:
```sql
-- In 20260615000000_architecture_foundation.sql:

-- 1. Add version column to wallets
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- 2. Add balance non-negative constraint
ALTER TABLE public.wallets ADD CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0);

-- 3. Create audit log table
CREATE TABLE IF NOT EXISTS public.wallet_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  actor TEXT NOT NULL,
  actor_id UUID,
  evidence JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_wallet_audit_entity ON public.wallet_audit_log(entity_type, entity_id, created_at DESC);

-- 4. Add version increment trigger
CREATE OR REPLACE FUNCTION public.wallet_increment_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_version ON public.wallets;
CREATE TRIGGER trg_wallet_version
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.wallet_increment_version();

-- 5. Balance snapshot for pre-migration audit
CREATE TABLE IF NOT EXISTS public.migration_balance_snapshot (
  wallet_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  wallet_type TEXT NOT NULL,
  balance_at_snapshot NUMERIC(18,2) NOT NULL,
  ledger_computed_balance NUMERIC(18,2),
  snapshot_taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  migration_run TEXT NOT NULL DEFAULT 'june_2026'
);

INSERT INTO public.migration_balance_snapshot (wallet_id, user_id, wallet_type, balance_at_snapshot)
SELECT id, user_id, COALESCE(wallet_type, 'clan'), balance
FROM public.wallets
ON CONFLICT (wallet_id) DO NOTHING;
```

**Files to Modify**: None

**Testing Requirements**:
- Insert a wallet row, update balance directly — verify version increments
- Attempt `UPDATE wallets SET balance = -1` — verify constraint violation
- Verify snapshot table populated for all users

**Acceptance Criteria**:
- `wallets.version` increments on every balance update
- `wallets.balance` cannot be set to negative
- `migration_balance_snapshot` has one row per wallet

---

### Phase 2: Ledger System Hardening

**Objectives**: Add `get_wallet_available_balance` function, ledger verification function, fix `wallet_ledger` append-only trigger for `wallet_ledger_entries` (the newer table).

**Files to Create**:
- `supabase/migrations/20260615010000_ledger_hardening.sql`

**Database Changes**:
```sql
-- 1. Available balance function
CREATE OR REPLACE FUNCTION public.get_wallet_available_balance(
  p_user_id UUID, 
  p_wallet_type TEXT DEFAULT 'clan'
)
RETURNS TABLE(total_balance NUMERIC, reserved NUMERIC, available NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT 
    COALESCE(w.balance, 0),
    COALESCE(SUM(r.amount) FILTER (WHERE r.state = 'open'), 0),
    COALESCE(w.balance, 0) - COALESCE(SUM(r.amount) FILTER (WHERE r.state = 'open'), 0)
  FROM public.wallets w
  LEFT JOIN public.wallet_reservations r ON r.wallet_id = w.id
  WHERE w.user_id = p_user_id AND w.wallet_type = p_wallet_type
  GROUP BY w.balance;
$$;

-- 2. Ledger balance verification
CREATE OR REPLACE FUNCTION public.verify_wallet_ledger_balance(p_wallet_id UUID)
RETURNS TABLE(stored_balance NUMERIC, computed_balance NUMERIC, discrepancy NUMERIC, is_consistent BOOLEAN)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    w.balance,
    COALESCE(SUM(CASE WHEN l.entry_type = 'credit' THEN l.amount WHEN l.entry_type = 'debit' THEN -l.amount ELSE 0 END), 0),
    w.balance - COALESCE(SUM(CASE WHEN l.entry_type = 'credit' THEN l.amount WHEN l.entry_type = 'debit' THEN -l.amount ELSE 0 END), 0),
    w.balance = COALESCE(SUM(CASE WHEN l.entry_type = 'credit' THEN l.amount WHEN l.entry_type = 'debit' THEN -l.amount ELSE 0 END), 0)
  FROM public.wallets w
  LEFT JOIN public.wallet_ledger l ON l.wallet_id = w.id
  WHERE w.id = p_wallet_id
  GROUP BY w.balance;
$$;

-- 3. RLS policies for new tables
ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit log: admin read only"
  ON public.wallet_audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
```

**Files to Modify**:
- `src/contexts/AuthContext.tsx`: Replace `refreshWallet()` reads from `wallets.balance` with `get_wallet_available_balance()` call. Update the profile shape to include `available_balance`.

**Testing Requirements**:
- Verify `get_wallet_available_balance()` returns correct available after creating an open reservation
- Verify `verify_wallet_ledger_balance()` returns `is_consistent = true` for all wallets

**Acceptance Criteria**:
- UI displays `available_balance` (balance minus reserved)
- Verification function shows zero discrepancy for all wallets

---

### Phase 3: Deposit Refactor

**Objectives**: Fix idempotency key generation, make verify endpoint read-only, fix double-settlement calls.

**Files to Modify**:
- `supabase/functions/paga-initiate-payment/index.ts`
- `supabase/functions/paga-verify-payment/index.ts`

**Changes to `paga-initiate-payment/index.ts`**:

```typescript
// REMOVE: const { idempotency_key } = await req.json();
// ADD: Server-generated idempotency key
const today = new Date().toISOString().substring(0, 10);
const idempotencyInput = `deposit:${user.id}:${amount}:${walletType}:${today}`;
const idempotencyKey = await crypto.subtle.digest(
  'SHA-256', 
  new TextEncoder().encode(idempotencyInput)
).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32));
```

**Changes to `paga-verify-payment/index.ts`**:

```typescript
// REMOVE ENTIRELY: the settlePagaWalletTransaction() call block (lines ~45-75)
// REMOVE: the explicit wallet_settle_transaction() call (lines ~55-60)
// KEEP: Transaction lookup and status return

// The function should ONLY:
// 1. Look up the transaction by reference
// 2. Return the current wallet_state
// 3. If processing: return { status: 'processing', message: '...' }
// 4. If terminal: return { status: tx.wallet_state, newBalance: <current balance> }
// NEVER call settlePagaWalletTransaction() or wallet_settle_transaction()
```

**Testing Requirements**:
- Initiate two deposits with same amount/user/wallet_type in same day → verify same transaction returned
- Complete Paga payment → verify webhook stored in `wallet_webhook_events`
- Verify verify endpoint returns `processing` for pending transaction without modifying state
- Verify settlement worker (only) transitions transaction to `success` and credits balance

**Acceptance Criteria**:
- Repeated deposit initiations for same parameters return same checkout URL
- Balance is credited ONLY by settlement worker
- Verify endpoint makes zero writes to any table

---

### Phase 4: Withdrawal Refactor

**Objectives**: Fix the gap where balance is debited before Paga confirms, add Paga-request idempotency, fix failure recovery.

**Files to Modify**:
- `supabase/functions/paga-transfer/index.ts`
- `supabase/migrations/20260615020000_withdrawal_fix.sql`

**Database Changes** (`20260615020000_withdrawal_fix.sql`):

```sql
-- Fix wallet_create_withdrawal_intent to NOT immediately debit balance.
-- Instead, create a reservation only. The debit fires when Paga confirms.

-- NOTE: This is a breaking change from current behavior.
-- Current: balance debited immediately on intent creation
-- New: balance reserved immediately, debited on Paga success, released on failure

CREATE OR REPLACE FUNCTION public.wallet_create_withdrawal_intent(
  p_user_id UUID,
  p_amount NUMERIC,
  -- ... same parameters ...
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_available NUMERIC;
BEGIN
  -- ... idempotency check ...
  
  -- Check AVAILABLE balance (total minus existing reservations)
  SELECT total_balance - reserved INTO v_available
  FROM get_wallet_available_balance(p_user_id, p_wallet_type);
  
  IF v_available < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
  END IF;
  
  -- Create transaction in 'pending' state
  INSERT INTO public.transactions(...) VALUES (..., 'pending', ...);
  
  -- Create RESERVATION only (do not debit yet)
  INSERT INTO public.wallet_reservations(transaction_id, wallet_id, amount, state)
  VALUES (v_transaction_id, v_wallet_id, p_amount, 'open');
  
  -- Do NOT update wallets.balance here
  -- Do NOT write wallet_ledger here
  -- Do NOT call wallet_debit() here
  
  RETURN jsonb_build_object('success', true, 'transaction_id', v_transaction_id, ...);
END;
$$;
```

**Tradeoff Note**: This changes withdrawal UX. Currently, balance shows as reduced immediately when withdrawal is initiated. With the new approach, balance remains unchanged until Paga confirms. This is actually MORE correct — the money hasn't left yet. The reservation means user cannot double-spend (available_balance is reduced by the reservation).

**Files to Modify** (`paga-transfer/index.ts`):
- After successful Paga transfer response, call settlement worker to finalize
- On Paga failure, call settlement worker to release reservation
- Remove the `settlePagaWalletTransaction()` direct call; enqueue settlement job instead

**Testing Requirements**:
- Initiate withdrawal → verify reservation created, wallets.balance unchanged
- Paga success → verify settlement worker debits wallets.balance and marks reservation consumed
- Paga failure → verify settlement worker releases reservation, wallets.balance unchanged

**Acceptance Criteria**:
- `wallets.balance` is NOT changed during withdrawal intent creation
- Paga success → balance debited exactly once via settlement worker
- Paga failure → reservation released, balance fully restored

---

### Phase 5: Transfer Refactor

**Objectives**: Fix fee display vs backend discrepancy, add idempotency, fix receiver transaction terminal state, fix lock ordering for deadlock prevention.

**Files to Modify**:
- `src/components/wallet/MobileTransferFlow.tsx`
- `src/pages/wallet/Transfer.tsx`
- `supabase/migrations/20260615030000_transfer_fix.sql`

**Database Changes** (`20260615030000_transfer_fix.sql`):

```sql
-- Fix execute_user_transfer: consistent lock ordering + fee fix + terminal states + idempotency

CREATE OR REPLACE FUNCTION public.execute_user_transfer(
  sender_id UUID,
  recipient_ign TEXT,
  amount NUMERIC,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_recipient_id UUID;
  v_wallet_ids UUID[];  -- Sorted array for consistent lock ordering
  -- ...
BEGIN
  -- Idempotency check first
  IF p_idempotency_key IS NOT NULL THEN
    -- Return existing transfer if found
  END IF;
  
  -- Find recipient
  SELECT id INTO v_recipient_id FROM public.profiles 
  WHERE LOWER(ign) = LOWER(recipient_ign) AND NOT is_banned LIMIT 1;
  
  -- Get wallet IDs sorted for consistent lock ordering (prevents deadlock)
  SELECT ARRAY(
    SELECT id FROM public.wallets 
    WHERE user_id IN (sender_id, v_recipient_id) AND wallet_type = 'clan'
    ORDER BY id ASC  -- Always lock in UUID alphabetical order
    FOR UPDATE
  ) INTO v_wallet_ids;
  
  -- Fee: percentage-based, consistent with backend (not flat ₦50)
  v_fee := LEAST(ROUND(amount * 0.035, 2), 5000);
  v_total_debit := amount + v_fee;
  
  -- ... debit sender, credit receiver ...
  
  -- Mark BOTH transactions as completed
  UPDATE public.transactions 
  SET wallet_state = 'success'::public.wallet_tx_state, 
      status = 'completed', 
      settled_at = NOW()
  WHERE id IN (v_sender_tx_id, v_receiver_tx_id);
  
  RETURN json_build_object('success', true, 'reference', v_ref, ...);
END;
$$;
```

**Frontend Changes**:
```typescript
// MobileTransferFlow.tsx - Remove flat fee constant, calculate percentage fee
// const TRANSFER_FEE = 50;  // REMOVE THIS
const FEE_RATE = 0.035;
const FEE_CAP = 5000;
const calculateTransferFee = (amount: number) => Math.min(Math.round(amount * FEE_RATE * 100) / 100, FEE_CAP);

// Transfer.tsx - Pass idempotency_key to execute_user_transfer
const idempotencyKey = generateTransferKey(user.id, recipient, amount); // server or client-consistent
const { data, error } = await supabase.rpc('execute_user_transfer', {
  sender_id: user.id,
  recipient_ign: recipient,
  amount: Number(amount),
  p_idempotency_key: idempotencyKey,
});
```

**Testing Requirements**:
- Transfer ₦1,000 → UI shows ₦35 fee (3.5%), backend deducts ₦35
- Transfer between same two users simultaneously from both sides → no deadlock
- Retry same transfer with same idempotency key → same reference returned, no double transfer

**Acceptance Criteria**:
- UI and backend fee calculations match exactly
- Both sender (transfer_out) and receiver (transfer_in) transactions reach `status = 'completed'`
- Concurrent reverse transfers succeed without deadlock
- Duplicate transfer requests return idempotent result

---

### Phase 6: Webhook Refactor

**Objectives**: Make webhook endpoint ingest-only. Remove all settlement calls from webhook handler.

**Files to Modify**:
- `supabase/functions/paga-webhook/index.ts`

**Complete Rewrite**:

```typescript
// paga-webhook/index.ts — INGEST ONLY
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }
  
  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);
    
    // 1. Extract reference
    const referenceNumber = String(payload.referenceNumber || payload.transactionId || "");
    if (!referenceNumber) return new Response(JSON.stringify({ received: true }), { status: 200 });
    
    // 2. Validate signature
    const signatureValid = await validatePagaSignature(req, payload, referenceNumber);
    if (!signatureValid && !IS_SANDBOX) {
      return new Response(JSON.stringify({ received: true, ignored: true, reason: "invalid_signature" }), { status: 200 });
    }
    
    // 3. Store webhook event (idempotent)
    const payloadHash = await hashPayload(rawBody);
    const { error: storeError } = await supabaseAdmin
      .from("wallet_webhook_events")
      .insert({
        provider: "paga",
        provider_event_id: String(payload.eventId || ""),
        provider_reference: referenceNumber,
        signature_valid: signatureValid,
        payload: payload,
        payload_hash: payloadHash,
      })
      .onConflict("provider,payload_hash")
      .ignore();
    
    // 4. Enqueue settlement job (idempotent — settlement worker handles dedup)
    const providerState = mapPagaProviderState(payload);
    await supabaseAdmin.rpc("wallet_enqueue_settlement", {
      p_transaction_id: null,  // Worker will look up by reference
      p_provider_reference: referenceNumber,
      p_decision_hint: providerState,
      p_evidence: { source: "paga_webhook", provider: payload },
      p_source: "paga_webhook",
      p_delay_seconds: 0,
    });
    
    // 5. Return immediately — NO wallet_settle_transaction() here
    return new Response(JSON.stringify({ received: true, queued: true }), { status: 200 });
    
  } catch (error) {
    // Still return 200 — Paga must not retry due to our server errors
    return new Response(JSON.stringify({ received: true, error: true }), { status: 200 });
  }
});
```

**Testing Requirements**:
- Send a valid Paga webhook → verify event stored in `wallet_webhook_events`, job in `wallet_settlement_jobs`
- Verify `wallet_webhook_events.handled = false` immediately after webhook
- Run settlement worker → verify `handled = true` and transaction reaches `success` state
- Send duplicate webhook → verify `duplicate: true` response, no second job queued, balance not doubled

**Acceptance Criteria**:
- Webhook endpoint makes zero direct changes to `wallets.balance`
- Webhook endpoint makes zero calls to `wallet_settle_transaction()`
- Paga always receives 200 response within 1 second
- Balance credited within 60 seconds of webhook arrival (settlement worker latency)

---

### Phase 7: Reconciliation Hardening

**Objectives**: Fix the state filter to include `debited`, add weekly summary, add alerts for stuck transactions.

**Files to Modify**:
- `supabase/functions/wallet-reconciliation-worker/index.ts`

**Changes**:
```typescript
// Fix state filter
.in("wallet_state", ["pending", "processing", "debited"])  // Add "debited"
.in("type", ["deposit", "withdrawal"])  // Skip internal transfers (no Paga reference)
.lt("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())  // >30 min stale

// Add: transactions stuck for >24 hours trigger admin notification
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const stuckTx = pendingTx.filter(tx => 
  Date.now() - new Date(tx.updated_at).getTime() > TWENTY_FOUR_HOURS
);
if (stuckTx.length > 0) {
  await notifyAdmin(`${stuckTx.length} transactions stuck > 24 hours`);
}
```

**Testing Requirements**:
- Create a `debited` withdrawal transaction, run reconciliation → verify it's checked against Paga
- Verify stuck transaction alert fires for transactions > 24 hours in non-terminal state

**Acceptance Criteria**:
- All `pending`, `processing`, and `debited` external transactions are reconciled
- Reconciliation findings created for every state mismatch
- Admin notification for transactions stuck > 24 hours

---

### Phase 8: Migration Execution

**Objectives**: Execute the balance audit, backfill ledger entries, verify consistency, go-live.

**Files to Create**:
- `supabase/migrations/20260615040000_migration_execution.sql`

**Steps**:

```sql
-- Step 1: Compute ledger balances for snapshot
UPDATE public.migration_balance_snapshot s
SET ledger_computed_balance = (
  SELECT COALESCE(SUM(CASE WHEN l.entry_type = 'credit' THEN l.amount 
                           WHEN l.entry_type = 'debit' THEN -l.amount ELSE 0 END), 0)
  FROM public.wallet_ledger l WHERE l.wallet_id = s.wallet_id
);

-- Step 2: Log discrepancies
INSERT INTO public.wallet_audit_log (entity_type, entity_id, action, old_value, new_value, actor)
SELECT 
  'wallet', wallet_id, 'migration_discrepancy_found',
  jsonb_build_object('stored_balance', balance_at_snapshot),
  jsonb_build_object('ledger_balance', ledger_computed_balance, 'discrepancy', balance_at_snapshot - ledger_computed_balance),
  'migration_june_2026'
FROM public.migration_balance_snapshot
WHERE ABS(balance_at_snapshot - COALESCE(ledger_computed_balance, 0)) > 0.01;

-- Step 3: Report (no automatic correction — manual review required)
SELECT * FROM public.migration_balance_snapshot
WHERE ABS(balance_at_snapshot - COALESCE(ledger_computed_balance, 0)) > 0.01
ORDER BY ABS(balance_at_snapshot - COALESCE(ledger_computed_balance, 0)) DESC;
```

**Acceptance Criteria**:
- Zero wallets with discrepancy > ₦1 (rounding errors of < ₦0.01 are acceptable)
- All existing transactions have corresponding ledger entries
- Settlement worker processes all backlogged settlement jobs
- All wallets show `is_consistent = true` from `verify_wallet_ledger_balance()`

---

## 15. Risk Assessment

### Risk Matrix

| Risk | Probability | Impact | Current Mitigation | Recommended Mitigation |
|---|---|---|---|---|
| Double credit on deposit | Medium | Critical | Idempotency guard in wallet_settle_transaction | Single settlement writer (Phase 6) |
| Balance debited, money not sent | Medium | Critical | Reconciliation worker (partial) | Reservation-first withdrawal (Phase 4) |
| Transfer deadlock | Low | Medium | None | Sorted lock ordering (Phase 5) |
| Webhook signature bypass in sandbox | Medium | High | IS_SANDBOX check | Remove sandbox bypass, use test mode flag |
| forceSuccess attack vector | Low | High | IS_SANDBOX guard | Never expose forceSuccess in production |
| Fee display mismatch (UX) | High | Medium | None | Unify fee calculation (Phase 5) |
| Stuck transactions (> 24h) | Medium | High | Reconciliation (partial) | 24h alert + auto-escalation (Phase 7) |
| Paga API rate limiting (81 attempts) | Medium | Medium | None | Reduce to 1 primary + 2 fallback attempts with caching |
| pg_cron unavailable | Medium | Low | Manual invocation | Use Supabase cron schedule (dashboard) |

### Highest Priority Actions (Before Next Production Deployment)

1. **IMMEDIATE**: Remove the explicit `wallet_settle_transaction()` calls from `paga-webhook/index.ts` (lines 64–75) and `paga-verify-payment/index.ts` (lines 55–60). This alone reduces double-settlement risk from Medium to Low.

2. **IMMEDIATE**: Fix `paga-verify-payment` to be read-only. This is a one-line change: remove the `settlePagaWalletTransaction()` call and the explicit settlement block.

3. **HIGH**: Change `paga-initiate-payment` to generate server-side idempotency keys. This prevents creation of multiple transactions on frontend retry.

4. **HIGH**: Include `'debited'` in the reconciliation worker's state filter. This catches withdrawals where Paga was never notified.

5. **MEDIUM**: Fix the fee display mismatch in `MobileTransferFlow.tsx` to use percentage calculation.

---

## 16. Final Recommendation

### What Is Actually Broken vs. What Looks Broken

After reading every file in the codebase, the honest assessment is: **the architecture is more functional than the symptoms suggest**. The `wallet_settle_transaction()` function with its `FOR UPDATE` lock and idempotency guard is correctly designed. The `wallet_create_withdrawal_intent()` function correctly checks and debits balance atomically. The `execute_user_transfer()` function correctly uses `FOR UPDATE` locks.

**The problems are in the calling layer**, not the core functions. Specifically:
1. Two endpoints (`webhook` and `verify`) both call settlement functions that should only be called by the worker.
2. One endpoint (`webhook`) calls settlement twice per invocation.
3. The frontend generates non-idempotent keys, so retries create duplicate transactions.
4. The fee UI and fee backend are disconnected.
5. The reconciliation worker misses `debited` state transactions.

### Priority Order

**This week (before next production deploy)**:
- Fix `paga-webhook/index.ts`: remove all settlement calls → ingest only
- Fix `paga-verify-payment/index.ts`: remove all settlement calls → read only
- Fix idempotency key generation in `paga-initiate-payment/index.ts`

**This sprint (next 2 weeks)**:
- Phase 4 (Withdrawal Refactor): reservation-first approach
- Phase 5 (Transfer Fix): fee unification, deadlock prevention, idempotency
- Phase 7 (Reconciliation): `debited` state inclusion

**Next sprint**:
- Phase 1-3, 8: Foundation, ledger hardening, migration execution

### What You Should Not Change

Do NOT convert the entire system to pure ledger-derived balance without first shipping the calling-layer fixes above. The current `wallets.balance` + `wallet_ledger` dual system, while imperfect, is functional enough to keep users' money safe while you fix the calling layer. Attempting a full ledger-first migration while the calling layer has double-settlement bugs would be like replacing the engine of a moving car.

The `wallet_settle_transaction()` function is good. Keep it. The `wallet_credit()` and `wallet_debit()` functions are good. Keep them. The `wallet_ledger` table is correctly append-only. Keep it. The `wallet_settlement_jobs` queue is the right pattern. Keep it.

**The three lines of code that will fix most of your problems**:
1. Remove `settlePagaWalletTransaction()` from `paga-webhook/index.ts`
2. Remove the explicit `wallet_settle_transaction()` call from `paga-webhook/index.ts` 
3. Remove `settlePagaWalletTransaction()` from `paga-verify-payment/index.ts`

Everything else in this report is important, but those three changes — taking perhaps 30 minutes to implement — will stop the double-credit race condition and the verify-webhook concurrent settlement race that is causing the deposit-not-credited symptom.

### The Bigger Picture

NeXa Esports has done 189 migrations in roughly 8 months to get here. The `Finance_redesign.md` document in the repository shows the team already understands the correct architecture. The gap is execution discipline: new code must not call settlement functions that were designated as settlement-worker-only. The architecture document is correct. The code diverges from it.

The fix is to enforce the architectural boundary in code, not to redesign the architecture again.

---

*Report prepared by automated architectural audit | NeXa Esports Payment System | June 2026*
*Evidence drawn from: `src/pages/wallet/FundWallet.tsx`, `src/pages/wallet/Withdraw.tsx`, `src/pages/wallet/Transfer.tsx`, `src/components/wallet/MobileTransferFlow.tsx`, `src/contexts/AuthContext.tsx`, `supabase/functions/paga-webhook/index.ts`, `supabase/functions/paga-initiate-payment/index.ts`, `supabase/functions/paga-verify-payment/index.ts`, `supabase/functions/paga-transfer/index.ts`, `supabase/functions/transfer-funds/index.ts`, `supabase/functions/_shared/walletSettlement.ts`, `supabase/functions/wallet-reconciliation-worker/index.ts`, `supabase/functions/wallet-settlement-worker/index.ts`, all migrations from `20251012230000` through `20260505140000`, `blnk-main/model/balance.go`, `blnk-main/model/transaction.go`, `Finance_redesign.md`*
