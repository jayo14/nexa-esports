-- Simulation of an airtime purchase stuck in processing
-- This script should be run in the Supabase SQL editor to verify the fix.

DO $$
DECLARE
  v_user_id UUID := '00000000-0000-0000-0000-000000000000'; -- Replace with a real user ID for testing
  v_wallet_id UUID;
  v_tx_id UUID;
  v_res JSONB;
BEGIN
  -- 1. Setup a test wallet
  INSERT INTO public.wallets (user_id, balance, wallet_type)
  VALUES (v_user_id, 1000, 'clan')
  ON CONFLICT (user_id, wallet_type) DO UPDATE SET balance = 1000
  RETURNING id INTO v_wallet_id;

  -- 2. Create a simulated airtime purchase transaction
  INSERT INTO public.transactions (
    wallet_id, user_id, wallet_type, type, amount, status, wallet_state, reference, description
  )
  VALUES (
    v_wallet_id, v_user_id, 'clan', 'airtime_purchase', 200, 'processing', 'debited', 'TEST_AIRT_001', 'Test Airtime'
  )
  RETURNING id INTO v_tx_id;

  -- 3. Run the settlement function (the one we just fixed)
  v_res := public.wallet_settle_transaction(v_tx_id, 'success', 'test_verification');

  RAISE NOTICE 'Settlement Result: %', v_res;

  -- 4. Verify transaction state
  IF EXISTS (SELECT 1 FROM public.transactions WHERE id = v_tx_id AND wallet_state = 'success' AND status = 'completed') THEN
    RAISE NOTICE 'Verification SUCCESS: Transaction marked as success/completed';
  ELSE
    RAISE EXCEPTION 'Verification FAILED: Transaction state is %', (SELECT wallet_state FROM public.transactions WHERE id = v_tx_id);
  END IF;

  -- 5. Cleanup
  DELETE FROM public.transactions WHERE id = v_tx_id;
END $$;
