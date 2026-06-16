-- Task 6.1: Migration Verification

-- Update snapshot with computed ledger balances
UPDATE public.migration_balance_snapshot s
SET ledger_computed_balance = (
  SELECT COALESCE(SUM(
    CASE WHEN l.entry_type = 'credit' THEN l.amount
         WHEN l.entry_type = 'debit'  THEN -l.amount
         ELSE 0 END
  ), 0)
  FROM public.wallet_ledger l
  WHERE l.wallet_id = s.wallet_id
);

-- Log discrepancies > ₦0.01 to audit log
INSERT INTO public.wallet_audit_log (entity_type, entity_id, action, old_value, new_value, actor)
SELECT
  'wallet',
  wallet_id,
  'migration_balance_discrepancy',
  jsonb_build_object('stored_balance', balance_at_snapshot),
  jsonb_build_object(
    'ledger_balance', ledger_computed_balance,
    'discrepancy', balance_at_snapshot - COALESCE(ledger_computed_balance, 0)
  ),
  'migration_verification_june_2026'
FROM public.migration_balance_snapshot
WHERE ABS(balance_at_snapshot - COALESCE(ledger_computed_balance, 0)) > 0.01;
