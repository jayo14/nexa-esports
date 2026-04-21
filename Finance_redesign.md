# Nexa_Esports Wallet System Redesign

## 1) Architecture Diagram (Textual)

Client Apps
-> API Gateway / Supabase Edge Functions
-> Transaction Command Service (single command entry)
-> Postgres (serializable transactions)

Postgres Logical Model
- transaction_intents (user intent, immutable request context)
- provider_operations (attempts against Paga, idempotent by provider reference)
- ledger_entries (append-only money movements, immutable)
- wallet_accounts (derived account metadata)
- wallet_balances (materialized projection from ledger, updated only by settlement worker)
- idempotency_keys (cross-endpoint replay protection)
- webhook_events (raw webhook inbox, immutable)
- reconciliation_runs and reconciliation_findings

Async Workers
- settlement_worker (the only writer allowed to finalize funds state)
- webhook_ingest_worker (validates and stores webhook, no balance mutation)
- reconciliation_worker (periodic DB vs provider parity checks)

Provider (Paga)
- checkout for deposits
- transfer API for withdrawals
- webhook callbacks
- status query API for reconciliation and timeout recovery

Single writer rule
- Only settlement_worker can create final ledger entries that affect balances.
- Webhook endpoint and verify endpoint never mutate balances directly.


## 2) Correct System Architecture

Single source of truth
- Source of truth for money is ledger_entries.
- wallet_balances is a deterministic projection from ledger_entries.
- transactions represent business lifecycle; ledger represents accounting lifecycle.

Strict separation of concerns
- transaction intent: user asks to deposit or withdraw, recorded in transaction_intents.
- provider execution: provider_operations stores API attempts and raw outcomes.
- final settlement: settlement_worker decides final transaction state and writes ledger entries.

Determinism contract
- For a given transaction_id and provider_reference, settlement decision is deterministic from:
  - current transaction state
  - verified provider evidence
  - transition rules
- Reprocessing same event is no-op once terminal state reached.

Consistency model
- Strong consistency for internal balances:
  - all balance-affecting writes happen in one serializable DB transaction.
  - reserve and release operations are ledger-backed.
- Eventual consistency only for external provider signal arrival.


## 3) Strict State Machine

States
- pending: created, no provider confirmation yet.
- processing: provider accepted or asynchronous confirmation pending.
- success: terminal settled success.
- failed: terminal failure before value transfer.
- reversed: terminal rollback after prior reserve/processing.
- expired: terminal timeout without valid provider completion.

Allowed transitions
- pending -> processing
- pending -> failed
- pending -> expired
- processing -> success
- processing -> failed
- processing -> reversed
- processing -> expired
- failed -> processing (only if retry policy explicitly opens new provider_operation, same transaction not terminally closed)
- No transition allowed out of success, reversed, expired unless admin override workflow with separate audited override table.

DB enforcement
- transaction_state enum type.
- transition guard function validate_transition(old_state, new_state, reason_code).
- BEFORE UPDATE trigger on transactions that blocks invalid transitions.
- Optional state_transition_log table capturing actor, source, reason, evidence hash.


## 4) Database Schema Redesign

A) transactions
- id uuid pk
- user_id uuid not null
- wallet_account_id uuid not null
- kind enum(deposit, withdrawal)
- state transaction_state not null
- requested_amount numeric(18,2) not null check requested_amount > 0
- currency text not null default NGN
- provider text not null default paga
- provider_reference text unique
- client_reference text unique
- idempotency_key text not null
- risk_flags jsonb not null default {}
- metadata jsonb not null default {}
- created_at timestamptz not null
- updated_at timestamptz not null
- expires_at timestamptz null

Constraints and indexes
- unique(idempotency_key, user_id, kind)
- unique(provider, provider_reference) where provider_reference is not null
- index(user_id, created_at desc)
- index(state, updated_at)
- index(wallet_account_id, created_at)

B) transaction_intents (immutable request envelope)
- id uuid pk
- transaction_id uuid unique not null references transactions(id)
- request_payload jsonb not null
- request_hash text not null
- auth_subject uuid not null
- client_ip inet
- user_agent text
- created_at timestamptz not null

C) provider_operations (all provider calls and callbacks)
- id uuid pk
- transaction_id uuid not null references transactions(id)
- operation_type enum(initiate, status_check, webhook_event, transfer_request)
- operation_key text not null
- provider_request jsonb
- provider_response jsonb
- provider_status_code text
- signature_valid boolean
- received_at timestamptz not null
- processed_at timestamptz null

Constraints and indexes
- unique(transaction_id, operation_type, operation_key)
- index(transaction_id, received_at)
- index(operation_type, processed_at)

D) webhook_events (immutable inbox)
- id uuid pk
- provider text not null
- provider_event_id text
- provider_reference text
- signature_valid boolean not null
- payload jsonb not null
- payload_hash text not null
- received_at timestamptz not null
- handled boolean not null default false
- handled_at timestamptz null

Constraints and indexes
- unique(provider, provider_event_id) where provider_event_id is not null
- unique(provider, payload_hash)
- index(provider_reference)
- index(handled, received_at)

E) ledger_entries (append-only)
- id uuid pk
- transaction_id uuid not null references transactions(id)
- wallet_account_id uuid not null
- entry_type enum(reserve_debit, reserve_release, debit_final, credit_final, fee_debit, fee_credit, reversal)
- amount numeric(18,2) not null check amount > 0
- direction enum(debit, credit) not null
- currency text not null default NGN
- balance_effective boolean not null
- created_at timestamptz not null
- created_by text not null
- unique_key text not null

Constraints and indexes
- unique(unique_key)
- index(wallet_account_id, created_at)
- index(transaction_id)

F) wallet_accounts
- id uuid pk
- user_id uuid not null
- wallet_type enum(clan, marketplace)
- status enum(active, locked)
- created_at timestamptz not null
- unique(user_id, wallet_type)

G) wallet_balances (projection table)
- wallet_account_id uuid pk references wallet_accounts(id)
- available_balance numeric(18,2) not null
- reserved_balance numeric(18,2) not null
- updated_at timestamptz not null
- check(available_balance >= 0)
- check(reserved_balance >= 0)

H) idempotency_keys
- key text pk
- scope text not null
- user_id uuid not null
- request_hash text not null
- transaction_id uuid null
- created_at timestamptz not null
- expires_at timestamptz not null

I) reconciliation tables
- reconciliation_runs(id, started_at, finished_at, status, summary)
- reconciliation_findings(id, run_id, transaction_id, severity, finding_type, db_state, provider_state, action_state)


## 5) Step-by-Step Flows

### Deposit flow

1. Initiate
- Client sends create-deposit-intent with idempotency key.
- API validates auth and amount.
- DB transaction:
  - insert idempotency_keys if absent
  - insert transactions state=pending
  - insert transaction_intents immutable envelope
- API calls Paga checkout init.
- Insert provider_operations row with operation_type=initiate.
- Update transactions.provider_reference and state=processing if provider accepted.

2. Provider completion signal
- Paga webhook arrives.
- Webhook endpoint verifies signature and stores webhook_events + provider_operations.
- Endpoint returns 200 immediately after durable write.
- No balance mutation in webhook handler.

3. Settlement
- settlement_worker consumes unhandled webhook_events.
- Resolves transaction by provider_reference.
- If provider confirms success:
  - DB serializable transaction:
    - validate transition processing -> success
    - write ledger_entries credit_final (and optional fee entries)
    - update wallet_balances projection
    - mark transaction success
- If provider confirms failed:
  - transition to failed (no credit ledger)
- Mark webhook_events.handled=true.

4. Verify endpoint behavior
- verify endpoint only triggers status check and enqueues evidence.
- It never writes balances.
- It may return current state: processing or success.

### Withdrawal flow

1. Initiate withdrawal intent
- Client sends create-withdrawal-intent with idempotency key.
- API validates auth, limits, KYC, fraud policy.
- DB serializable transaction:
  - check available_balance >= requested_amount
  - create transactions state=pending
  - create ledger_entries reserve_debit (balance_effective=true on available, and reserve increment in projection logic)
  - update wallet_balances (available down, reserved up)

2. Execute provider transfer
- API writes provider_operations transfer_request.
- If provider accepted async:
  - state pending -> processing
- If provider hard reject:
  - state pending -> failed
  - ledger reserve_release
  - update projection (available up, reserved down)

3. Async confirmation
- webhook/status evidence stored (never balance mutate directly).
- settlement_worker processes evidence.

4. Settlement decisions
- provider success:
  - transition processing -> success
  - ledger debit_final from reserved bucket (reserved down, no available change)
- provider failure after reserve:
  - transition processing -> reversed
  - ledger reserve_release (available up, reserved down)
- timeout without evidence:
  - transition processing -> expired
  - optional hold policy expires into reversed via explicit settlement action


## 6) Elimination of Race Conditions

Authoritative settlement path
- Only settlement_worker can change terminal monetary outcome.
- webhook endpoint: write-only inbox.
- verify endpoint: evidence fetch only.
- transfer/init endpoints: create intent and reserve only.

Idempotency model
- API-level idempotency key per user and operation scope.
- Provider event id and payload hash dedupe at webhook_events.
- Ledger unique_key prevents duplicate money movement.
- Provider operations unique(transaction_id, operation_type, operation_key) blocks replay writes.

Concurrency controls
- Serializable isolation for all balance-impacting transactions.
- Row-level lock on wallet_balances row during reserve/finalize/release.
- Deterministic ordering by transaction created_at and event received_at.


## 7) Webhook Strategy

Security requirements
- Verify signature using provider secret and exact canonical payload.
- Enforce timestamp tolerance and nonce uniqueness where available.
- Reject invalid signatures with 401 and do not mark handled.

Processing model
- Step 1 durable ingest
  - persist raw event and hash
  - ack provider quickly
- Step 2 asynchronous settlement
  - worker validates mapping to transaction
  - applies state transition and ledger mutation atomically

Out-of-order handling
- Every event compared with current transaction state.
- If event is stale versus terminal state, mark as ignored_stale in provider_operations.
- If event is contradictory, create reconciliation finding severity high.

Retry handling
- Duplicate webhook safe by unique event constraints and idempotent settlement.
- Worker retries with exponential backoff on transient DB/provider errors.


## 8) Error and Edge Case Handling

Duplicate callbacks
- Deduped in webhook_events by provider_event_id or payload_hash.
- Reprocessing hits no-op due to ledger unique_key and terminal state guard.

Delayed provider responses
- Transaction remains processing with SLA timer.
- reconciliation_worker performs provider status query and drives settlement.

Partial failures
- If provider call succeeds but DB write fails, provider_operation retry reconciles by transaction/provider reference.
- If DB reserve succeeds but provider call times out, transaction remains processing and is reconciled asynchronously.

Network timeouts
- Do not infer financial failure from timeout alone.
- Mark operation unknown, schedule status check.

User session loss during payment
- Session not required for settlement correctness.
- Transaction identity binds via provider_reference and server-side intent records.


## 9) Security Hardening Checklist

Authenticity and integrity
- HMAC signature validation for all webhooks.
- Strict allowlist of provider source controls where possible.
- Canonical payload hashing and immutable storage.

Replay protection
- API idempotency keys with TTL and request_hash binding.
- webhook event dedupe by provider_event_id and payload_hash.
- operation_key uniqueness for provider operations.

Double-spend prevention
- Reserve ledger entries created under serializable transaction.
- available and reserved balance checks under row lock.
- Terminal state guards prevent second settlement.

Least privilege
- Separate DB roles:
  - ingest role cannot mutate balances
  - settlement role can write ledger and state
- Edge functions protected by auth + signed internal service tokens for worker endpoints.

Auditability
- Immutable transaction_intents, webhook_events, ledger_entries.
- Every state transition accompanied by reason_code and evidence reference.


## 10) Reconciliation Strategy

Periodic jobs
- Frequency: every 5 to 15 minutes for processing transactions; nightly full reconciliation.

Checks
- For each non-terminal or recently terminal transaction:
  - compare DB state with Paga status API
  - verify ledger completeness rules per state
  - verify wallet_balances projection equals ledger aggregate

Finding classes
- missing_provider_reference
- terminal_state_mismatch
- missing_ledger_entry
- duplicate_settlement_attempt
- projection_drift

Auto-heal policy
- Safe auto-heal only for deterministic corrections:
  - missing projection rebuild from ledger
  - stale processing with clear provider success/failure
- Ambiguous cases escalated as manual_review with immutable finding record.


## 11) Critical Pseudocode

A) Reserve withdrawal

function reserveWithdrawal(userId, walletType, amount, idempotencyKey):
  begin serializable tx
    assert idempotency key valid or return existing transaction
    wallet = select wallet_balances for update
    if wallet.available_balance < amount: fail
    txn = insert transaction(kind=withdrawal, state=pending)
    insert ledger(reserve_debit, debit, amount, unique_key=txn.id + reserve)
    wallet.available_balance -= amount
    wallet.reserved_balance += amount
    update wallet_balances
  commit
  return txn

B) Webhook ingest

function ingestWebhook(headers, payload):
  if signature invalid: return 401
  eventHash = hash(payload)
  insert webhook_events on conflict do nothing
  insert provider_operations(operation_type=webhook_event)
  return 200

C) Settlement worker

function settleTransactionByEvidence(transactionId, evidence):
  begin serializable tx
    txn = select transaction for update
    if txn.state in [success, failed, reversed, expired]: return no-op
    providerDecision = deriveDecision(evidence)

    if txn.kind == deposit and providerDecision == success:
      require transition(txn.state -> success)
      insert ledger(credit_final, credit, txn.requested_amount_minus_fee, unique_key)
      apply projection increment available
      update txn success

    else if txn.kind == withdrawal and providerDecision == success:
      require transition(txn.state -> success)
      insert ledger(debit_final, debit, txn.requested_amount, unique_key)
      apply projection decrement reserved
      update txn success

    else if txn.kind == withdrawal and providerDecision in [failed, reversed, expired]:
      require transition(txn.state -> reversed or expired or failed)
      insert ledger(reserve_release, credit, txn.requested_amount, unique_key)
      apply projection: reserved down, available up
      update txn terminal failure state

    else if providerDecision == processing:
      require transition(txn.state -> processing)
      update txn processing
  commit

D) Verify endpoint

function verifyTransaction(reference):
  txn = find transaction by provider_reference or client_reference
  if terminal: return txn.state
  status = query provider status
  write provider_operations(status_check)
  enqueue settlement job with evidence
  return current_or_processing_state


## 12) Migration and Rollout Plan

Phase 0: Preparation
- Freeze new wallet feature work.
- Add observability around current transaction reference paths.
- Introduce new tables in parallel (no behavior change yet).

Phase 1: Dual-write shadow mode
- Existing flows continue.
- New service writes transaction_intents, provider_operations, webhook_events, ledger_entries in shadow.
- Compare shadow balances vs current balances continuously.

Phase 2: Settlement authority cutover
- Enable settlement_worker as sole monetary writer.
- Disable balance mutations from webhook and verify handlers.
- Keep old columns populated for compatibility read paths.

Phase 3: Read model cutover
- Wallet UI and APIs read from wallet_balances projection derived from ledger.
- Keep compatibility views matching old schema contracts.

Phase 4: Decommission legacy mutation paths
- Remove direct wallet balance updates from old functions.
- Keep migration compatibility functions that proxy to new transaction command service.

Phase 5: Hardening and audit signoff
- Enforce strict transition trigger.
- Enforce full idempotency constraints.
- Run reconciliation burn-in period and incident drills.

Backward compatibility strategy
- Maintain existing transaction references.
- Provide compatibility SQL views for legacy selectors.
- Route old endpoints to new command handlers internally.
- Keep frontend contracts stable during backend cutover.


## 13) Success Properties Against Your Criteria

- No balance mismatch ever:
  - achieved by append-only ledger plus single settlement writer plus serializable transactions.
- End-to-end traceability:
  - intent, provider operations, webhook events, and ledger all linked by transaction_id and reference.
- Correct under retries, delays, failures:
  - idempotency keys, webhook dedupe, terminal guards, asynchronous reconciliation.
- Clean audit trail:
  - immutable intent/event/ledger records with transition evidence.
