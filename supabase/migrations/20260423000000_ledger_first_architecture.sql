-- ================================================
-- MIGRATION: nexa_paga_wallet_ledger_first_v3
-- Ledger-first architecture with atomic wallet operations
-- ================================================

-- Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================
-- 1. Add missing columns to wallets table
-- ================================================
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS wallet_type TEXT NOT NULL DEFAULT 'clan'
                            CHECK (wallet_type IN ('clan','marketplace')),
  ADD COLUMN IF NOT EXISTS locked_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frozen_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN';

-- ================================================
-- 2. Unique constraint: one wallet per user per type
-- ================================================
ALTER TABLE public.wallets
  DROP CONSTRAINT IF EXISTS wallets_user_id_wallet_type_key;
ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_user_id_wallet_type_key
  UNIQUE (user_id, wallet_type);

-- ================================================
-- 3. Expand transaction_type enum if needed
-- ================================================
DO $$
BEGIN
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'airtime_purchase';
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'data_purchase';
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'marketplace_purchase';
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'marketplace_sale';
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'refund';
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'reversal';
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'fee';
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'bonus';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ================================================
-- 4. Expand transactions table with Paga fields
-- ================================================
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS wallet_type TEXT NOT NULL DEFAULT 'clan',
  ADD COLUMN IF NOT EXISTS paga_reference TEXT,
  ADD COLUMN IF NOT EXISTS paga_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS paga_status TEXT,
  ADD COLUMN IF NOT EXISTS fee NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Idempotency constraint
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_idempotency_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_idempotency_key_key
  ON public.transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ================================================
-- 5. Create wallet_ledger table (append-only)
-- ================================================
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('debit','credit')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_wallet_id
  ON public.wallet_ledger(wallet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_tx_id
  ON public.wallet_ledger(transaction_id);

-- ================================================
-- 6. Create webhook_events table (Paga callback idempotency)
-- ================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'paga',
  provider_event_id TEXT,
  provider_reference TEXT NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_reference)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_ref
  ON public.webhook_events(provider, provider_reference);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed
  ON public.webhook_events(processed, created_at DESC);

-- ================================================
-- 7. Create provider_operations log (audit trail)
-- ================================================
CREATE TABLE IF NOT EXISTS public.provider_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id),
  provider TEXT NOT NULL DEFAULT 'paga',
  operation_type TEXT NOT NULL,
  operation_key TEXT,
  provider_request JSONB,
  provider_response JSONB,
  provider_status_code TEXT,
  signature_valid BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_operations_tx_id
  ON public.provider_operations(transaction_id);

CREATE INDEX IF NOT EXISTS idx_provider_operations_created
  ON public.provider_operations(created_at DESC);

-- ================================================
-- 8. FUNCTION: wallet_credit
-- Atomically credits wallet + writes ledger entry
-- IDEMPOTENT: skip if already credited
-- ================================================
CREATE OR REPLACE FUNCTION public.wallet_credit(
  p_transaction_id UUID,
  p_wallet_id UUID,
  p_amount NUMERIC,
  p_paga_reference TEXT DEFAULT NULL,
  p_final_status TEXT DEFAULT 'completed',
  p_wallet_state TEXT DEFAULT 'credited'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_state TEXT;
BEGIN
  -- Idempotency: skip if already credited
  SELECT wallet_state INTO v_state FROM public.transactions
  WHERE id = p_transaction_id FOR UPDATE;

  IF v_state IN (p_wallet_state, p_final_status) THEN
    RETURN;
  END IF;

  -- Lock wallet row
  SELECT balance INTO v_current_balance FROM public.wallets
  WHERE id = p_wallet_id FOR UPDATE;

  v_new_balance := v_current_balance + p_amount;

  -- Update wallet balance
  UPDATE public.wallets
    SET balance = v_new_balance, updated_at = NOW()
  WHERE id = p_wallet_id;

  -- Write ledger entry (append-only)
  INSERT INTO public.wallet_ledger(wallet_id, transaction_id, entry_type, amount, balance_before, balance_after)
  VALUES (p_wallet_id, p_transaction_id, 'credit', p_amount, v_current_balance, v_new_balance);

  -- Mark transaction as credited
  UPDATE public.transactions
    SET wallet_state = p_wallet_state,
        status = p_final_status,
        paga_reference = COALESCE(p_paga_reference, paga_reference),
        updated_at = NOW()
  WHERE id = p_transaction_id;
END;
$$;

-- ================================================
-- 9. FUNCTION: wallet_debit
-- Atomically debits wallet with balance check + writes ledger
-- IDEMPOTENT: skip if already debited
-- ================================================
CREATE OR REPLACE FUNCTION public.wallet_debit(
  p_transaction_id UUID,
  p_wallet_id UUID,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_state TEXT;
BEGIN
  -- Idempotency check
  SELECT wallet_state INTO v_state FROM public.transactions 
  WHERE id = p_transaction_id FOR UPDATE;
  
  IF v_state = 'debited' OR v_state = 'processing' THEN 
    RETURN; 
  END IF;

  -- Lock wallet and check balance
  SELECT balance INTO v_current_balance FROM public.wallets 
  WHERE id = p_wallet_id FOR UPDATE;
  
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have ₦%, need ₦%', v_current_balance, p_amount;
  END IF;

  v_new_balance := v_current_balance - p_amount;
  
  -- Update wallet balance
  UPDATE public.wallets 
    SET balance = v_new_balance, updated_at = NOW() 
  WHERE id = p_wallet_id;

  -- Write ledger entry
  INSERT INTO public.wallet_ledger(wallet_id, transaction_id, entry_type, amount, balance_before, balance_after)
  VALUES (p_wallet_id, p_transaction_id, 'debit', p_amount, v_current_balance, v_new_balance);

  -- Mark transaction as debited
  UPDATE public.transactions 
    SET wallet_state = 'debited', 
        status = 'processing', 
        updated_at = NOW()
  WHERE id = p_transaction_id;
END;
$$;

-- ================================================
-- 10. FUNCTION: execute_user_transfer
-- Atomic: sender debit + receiver credit in ONE transaction
-- Includes fee calculation (3.5%, max ₦5000)
-- ================================================
DROP FUNCTION IF EXISTS public.execute_user_transfer(uuid, text, numeric);

CREATE OR REPLACE FUNCTION public.execute_user_transfer(
  sender_id UUID,
  recipient_ign TEXT,
  amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recipient_id UUID;
  v_sender_wallet_id UUID;
  v_receiver_wallet_id UUID;
  v_sender_tx_id UUID;
  v_receiver_tx_id UUID;
  v_ref TEXT := 'transfer_' || gen_random_uuid()::TEXT;
  v_fee NUMERIC := LEAST(ROUND(amount * 0.035, 2), 5000);
  v_total_debit NUMERIC := amount + v_fee;
  v_sender_balance NUMERIC;
  v_sender_user_id UUID;
BEGIN
  -- Find recipient by IGN
  SELECT id INTO v_recipient_id FROM public.profiles 
  WHERE LOWER(ign) = LOWER(recipient_ign) AND NOT is_banned
  LIMIT 1;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Recipient not found: %', recipient_ign; 
  END IF;
  
  IF v_recipient_id = sender_id THEN 
    RAISE EXCEPTION 'Cannot transfer to yourself'; 
  END IF;

  -- Get wallets (lock them immediately)
  SELECT id INTO v_sender_wallet_id FROM public.wallets 
  WHERE user_id = sender_id AND wallet_type = 'clan' 
  FOR UPDATE;
  
  SELECT id INTO v_receiver_wallet_id FROM public.wallets 
  WHERE user_id = v_recipient_id AND wallet_type = 'clan' 
  FOR UPDATE;

  IF v_sender_wallet_id IS NULL THEN 
    RAISE EXCEPTION 'Sender wallet not found'; 
  END IF;
  
  IF v_receiver_wallet_id IS NULL THEN 
    RAISE EXCEPTION 'Recipient wallet not found'; 
  END IF;

  -- Check balance
  SELECT balance, user_id INTO v_sender_balance, v_sender_user_id 
  FROM public.wallets 
  WHERE id = v_sender_wallet_id;
  
  IF v_sender_balance < v_total_debit THEN
    RAISE EXCEPTION 'Insufficient balance. Need ₦%, have ₦%', v_total_debit, v_sender_balance;
  END IF;

  -- Create sender transaction (debit)
  INSERT INTO public.transactions(
    wallet_id, user_id, wallet_type, type, amount, fee, 
    status, reference, description, created_at
  )
  VALUES(
    v_sender_wallet_id, v_sender_user_id, 'clan', 'transfer_out'::transaction_type, 
    amount, v_fee, 'processing', v_ref, 'Transfer to ' || recipient_ign, NOW()
  )
  RETURNING id INTO v_sender_tx_id;

  -- Create receiver transaction (credit)
  INSERT INTO public.transactions(
    wallet_id, user_id, wallet_type, type, amount, fee, 
    status, reference, description, created_at
  )
  VALUES(
    v_receiver_wallet_id, v_recipient_id, 'clan', 'transfer_in'::transaction_type, 
    amount, 0, 'processing', v_ref, 'Transfer from ' || (SELECT ign FROM public.profiles WHERE id = sender_id), NOW()
  )
  RETURNING id INTO v_receiver_tx_id;

  -- Execute DEBIT (amount + fee)
  PERFORM public.wallet_debit(v_sender_tx_id, v_sender_wallet_id, v_total_debit);

  -- Execute CREDIT
  PERFORM public.wallet_credit(v_receiver_tx_id, v_receiver_wallet_id, amount);

  -- Mark sender as complete
  UPDATE public.transactions 
    SET wallet_state = 'debited'::public.wallet_tx_state, 
        status = 'completed', 
        updated_at = NOW() 
  WHERE id = v_sender_tx_id;

  RETURN json_build_object(
    'success', true, 
    'reference', v_ref, 
    'fee', v_fee,
    'sender_transaction_id', v_sender_tx_id,
    'receiver_transaction_id', v_receiver_tx_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_user_transfer(uuid, text, numeric)
TO authenticated;

-- ================================================
-- 11. Row Level Security Policies
-- ================================================

-- Wallets: users see only their own
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallets_user_select" ON public.wallets;
CREATE POLICY wallets_user_select ON public.wallets FOR SELECT
  USING (user_id = auth.uid());

-- Transactions: users see only their own wallet's transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_user_select" ON public.transactions;
CREATE POLICY transactions_user_select ON public.transactions FOR SELECT
  USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));

-- Ledger: same rule
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_user_select" ON public.wallet_ledger;
CREATE POLICY ledger_user_select ON public.wallet_ledger FOR SELECT
  USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));

-- Webhook events: no user access (admin/service_role only)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- No SELECT policy = only service_role can access

-- Provider operations: no user access (admin/service_role only)
ALTER TABLE public.provider_operations ENABLE ROW LEVEL SECURITY;
-- No SELECT policy = only service_role can access

-- ================================================
-- 12. Trigger: Prevent wallet_ledger mutations (append-only)
-- ================================================
CREATE OR REPLACE FUNCTION public.prevent_wallet_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'wallet_ledger is append-only: no updates or deletes allowed';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_wallet_ledger_mutation ON public.wallet_ledger;
CREATE TRIGGER trg_prevent_wallet_ledger_mutation
BEFORE UPDATE OR DELETE ON public.wallet_ledger
FOR EACH ROW
EXECUTE FUNCTION public.prevent_wallet_ledger_mutation();
