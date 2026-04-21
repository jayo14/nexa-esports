-- Wallet redesign validation checks
-- Run after migrations and periodically in production/staging.

-- 1) Every deposit success must have credit_final entry.
SELECT t.id AS transaction_id, t.reference
FROM public.transactions t
LEFT JOIN public.wallet_ledger_entries l
  ON l.transaction_id = t.id
 AND l.entry_type = 'credit_final'
WHERE t.type = 'deposit'
  AND t.wallet_state = 'success'
GROUP BY t.id, t.reference
HAVING COUNT(l.id) = 0;

-- 2) Every successful withdrawal must have debit_final entry.
SELECT t.id AS transaction_id, t.reference
FROM public.transactions t
LEFT JOIN public.wallet_ledger_entries l
  ON l.transaction_id = t.id
 AND l.entry_type = 'debit_final'
WHERE t.type = 'withdrawal'
  AND t.wallet_state = 'success'
GROUP BY t.id, t.reference
HAVING COUNT(l.id) = 0;

-- 3) Failed/reversed/expired withdrawals must have reserve_release if reservation existed.
SELECT t.id AS transaction_id, t.reference, r.state AS reservation_state
FROM public.transactions t
JOIN public.wallet_reservations r
  ON r.transaction_id = t.id
LEFT JOIN public.wallet_ledger_entries l
  ON l.transaction_id = t.id
 AND l.entry_type = 'reserve_release'
WHERE t.type = 'withdrawal'
  AND t.wallet_state IN ('failed', 'reversed', 'expired')
  AND r.state = 'released'
GROUP BY t.id, t.reference, r.state
HAVING COUNT(l.id) = 0;

-- 4) No non-terminal transaction should have settled_at.
SELECT id, reference, wallet_state, settled_at
FROM public.transactions
WHERE wallet_state IN ('pending', 'processing')
  AND settled_at IS NOT NULL;

-- 5) Idempotency key collisions with mismatched request hash.
SELECT key, scope, user_id, COUNT(DISTINCT request_hash) AS hash_variants
FROM public.wallet_idempotency_keys
GROUP BY key, scope, user_id
HAVING COUNT(DISTINCT request_hash) > 1;

-- 6) Unhandled webhook backlog older than 10 minutes.
SELECT id, provider, provider_reference, received_at
FROM public.wallet_webhook_events
WHERE handled = FALSE
  AND received_at < NOW() - INTERVAL '10 minutes'
ORDER BY received_at ASC;

-- 7) Settlement jobs stuck in failed state.
SELECT id, transaction_id, provider_reference, attempts, last_error, updated_at
FROM public.wallet_settlement_jobs
WHERE state = 'failed'
ORDER BY updated_at DESC;

-- 8) Ledger append-only uniqueness sanity (should always be zero rows).
SELECT unique_key, COUNT(*) AS duplicate_count
FROM public.wallet_ledger_entries
GROUP BY unique_key
HAVING COUNT(*) > 1;

-- 9) Reservations that remain open while transaction is terminal.
SELECT t.id, t.reference, t.wallet_state, r.state AS reservation_state
FROM public.transactions t
JOIN public.wallet_reservations r
  ON r.transaction_id = t.id
WHERE t.wallet_state IN ('success', 'failed', 'reversed', 'expired')
  AND r.state = 'open';

-- 10) State/status parity check (compatibility contract).
SELECT id, reference, status, wallet_state
FROM public.transactions
WHERE status IS DISTINCT FROM wallet_state::text;
