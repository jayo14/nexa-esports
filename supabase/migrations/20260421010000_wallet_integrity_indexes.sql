-- Wallet integrity reconciliation helpers
-- This migration is intentionally non-breaking and safe for existing data.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_transactions_reference_status
  ON public.transactions(reference, status);

CREATE INDEX IF NOT EXISTS idx_transactions_provider_reconcile
  ON public.transactions(paga_reference, paga_status);
