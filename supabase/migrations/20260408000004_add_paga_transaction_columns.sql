-- Add paga_reference to transactions table for reconciliation
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS paga_reference TEXT,
  ADD COLUMN IF NOT EXISTS paga_status TEXT,
  ADD COLUMN IF NOT EXISTS paga_raw_response JSONB;

CREATE INDEX IF NOT EXISTS idx_transactions_paga_reference ON public.transactions(paga_reference);
