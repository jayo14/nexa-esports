-- Phase 2: Ledger System Hardening
-- Adds get_wallet_available_balance, verify_wallet_ledger_balance,
-- and RLS for the new wallet_audit_log table.

-- 1. Available balance = total balance minus open reservations
CREATE OR REPLACE FUNCTION public.get_wallet_available_balance(
  p_user_id    UUID,
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

-- 2. Verify that stored balance equals ledger sum (reconciliation helper)
CREATE OR REPLACE FUNCTION public.verify_wallet_ledger_balance(p_wallet_id UUID)
RETURNS TABLE(
  stored_balance   NUMERIC,
  computed_balance NUMERIC,
  discrepancy      NUMERIC,
  is_consistent    BOOLEAN
)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    w.balance,
    COALESCE(SUM(
      CASE WHEN l.entry_type = 'credit' THEN  l.amount
           WHEN l.entry_type = 'debit'  THEN -l.amount
           ELSE 0 END
    ), 0),
    w.balance - COALESCE(SUM(
      CASE WHEN l.entry_type = 'credit' THEN  l.amount
           WHEN l.entry_type = 'debit'  THEN -l.amount
           ELSE 0 END
    ), 0),
    w.balance = COALESCE(SUM(
      CASE WHEN l.entry_type = 'credit' THEN  l.amount
           WHEN l.entry_type = 'debit'  THEN -l.amount
           ELSE 0 END
    ), 0)
  FROM public.wallets w
  LEFT JOIN public.wallet_ledger l ON l.wallet_id = w.id
  WHERE w.id = p_wallet_id
  GROUP BY w.balance;
$$;

-- 3. RLS: audit log is admin-read-only; no direct user writes
ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit log: admin read only" ON public.wallet_audit_log;
CREATE POLICY "Audit log: admin read only"
  ON public.wallet_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'clan_master')
    )
  );
