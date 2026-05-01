-- Fix wallet transaction state transitions and status handling
-- This ensures that 'debited' and 'credited' states are allowed and that the user-facing status remains 'processing'

-- 1. Update the state transition guard to be more liberal and include new states
CREATE OR REPLACE FUNCTION public.wallet_is_valid_transition(
  p_old public.wallet_tx_state,
  p_new public.wallet_tx_state
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Idempotency
  IF p_old = p_new THEN
    RETURN TRUE;
  END IF;

  -- Pending can go anywhere valid
  IF p_old = 'pending' AND p_new IN ('processing', 'debited', 'credited', 'success', 'failed', 'expired') THEN
    RETURN TRUE;
  END IF;

  -- Processing can go to final states
  IF p_old = 'processing' AND p_new IN ('success', 'failed', 'reversed', 'expired') THEN
    RETURN TRUE;
  END IF;

  -- Debited/Credited (internal states) can go to processing or final states
  IF p_old IN ('debited', 'credited') AND p_new IN ('processing', 'success', 'failed', 'reversed') THEN
    RETURN TRUE;
  END IF;

  -- Allow retries from failed/expired back to processing
  IF p_old IN ('failed', 'expired') AND p_new = 'processing' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Update the trigger function to handle 'status' more intelligently
-- We want the user to see 'processing' even if the internal state is 'debited' or 'credited'
CREATE OR REPLACE FUNCTION public.enforce_wallet_transaction_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate state transition for financial types
  IF NEW.type IN ('deposit'::transaction_type, 'withdrawal'::transaction_type) THEN
    IF NOT public.wallet_is_valid_transition(OLD.wallet_state, NEW.wallet_state) THEN
      RAISE EXCEPTION 'Invalid wallet transaction state transition: % -> %', OLD.wallet_state, NEW.wallet_state;
    END IF;
  END IF;

  NEW.updated_at := NOW();

  -- Smart status mapping:
  -- If we reach a final state, set status accordingly
  IF NEW.wallet_state = 'success' THEN
    NEW.status := 'completed';
  ELSIF NEW.wallet_state IN ('failed', 'reversed', 'expired') THEN
    NEW.status := NEW.wallet_state::TEXT;
  ELSIF NEW.wallet_state IN ('debited', 'credited', 'processing') THEN
    -- For these mid-flow states, keep or set status to 'processing'
    -- This ensures the frontend shows the "Processing" badge correctly
    NEW.status := 'processing';
  ELSE
    -- Fallback for anything else
    NEW.status := NEW.wallet_state::TEXT;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. (Optional but recommended) Fix any transactions stuck in 'debited' or 'credited' status string
-- so they show up as 'processing' in the UI immediately.
UPDATE public.transactions 
SET status = 'processing' 
WHERE status IN ('debited', 'credited') 
  AND wallet_state IN ('debited', 'credited');
