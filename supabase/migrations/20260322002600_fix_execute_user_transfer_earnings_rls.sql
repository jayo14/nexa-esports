-- Fix transfer RPC failing on earnings RLS inserts.
-- Root cause: execute_user_transfer was running as invoker and writing to earnings,
-- while earnings has no INSERT policy for authenticated users.
-- Solution: run transfer function as SECURITY DEFINER with strict auth checks.

-- Explicitly drop first so return-type mismatches on remote do not block replace.
DROP FUNCTION IF EXISTS public.execute_user_transfer(uuid, text, numeric);

CREATE OR REPLACE FUNCTION public.execute_user_transfer(
  sender_id uuid,
  recipient_ign text,
  amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sender_wallet_id uuid;
  sender_balance numeric(10, 2);
  recipient_id uuid;
  recipient_wallet_id uuid;
  fee numeric(10, 2) := 50;
  total_deduction numeric(10, 2);
  sender_transaction_id uuid;
  sender_ign text;
  transfer_ref text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF sender_id IS NULL OR sender_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You can only transfer from your own wallet';
  END IF;

  IF amount IS NULL OR amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  SELECT ign INTO sender_ign FROM public.profiles WHERE id = sender_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sender profile not found';
  END IF;

  SELECT id INTO recipient_id FROM public.profiles WHERE ign = recipient_ign;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;

  IF recipient_id = sender_id THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;

  total_deduction := amount + fee;

  SELECT id, balance INTO sender_wallet_id, sender_balance
  FROM public.wallets
  WHERE user_id = sender_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sender wallet not found';
  END IF;

  IF sender_balance < total_deduction THEN
    RAISE EXCEPTION 'Insufficient funds for transfer: You need to have extra NGN 50 in your wallet to cover the transfer fee';
  END IF;

  SELECT id INTO recipient_wallet_id
  FROM public.wallets
  WHERE user_id = recipient_id;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (recipient_id, 0)
    RETURNING id INTO recipient_wallet_id;
  END IF;

  UPDATE public.wallets
  SET balance = balance - total_deduction, updated_at = now()
  WHERE id = sender_wallet_id;

  UPDATE public.wallets
  SET balance = balance + amount, updated_at = now()
  WHERE id = recipient_wallet_id;

  transfer_ref := 'transfer_' || gen_random_uuid()::text;

  INSERT INTO public.transactions (wallet_id, amount, type, status, reference)
  VALUES (sender_wallet_id, amount, 'transfer_out', 'success', transfer_ref || '_out')
  RETURNING id INTO sender_transaction_id;

  INSERT INTO public.transactions (wallet_id, amount, type, status, reference)
  VALUES (recipient_wallet_id, amount, 'transfer_in', 'success', transfer_ref || '_in');

  INSERT INTO public.earnings (transaction_id, amount, source)
  VALUES (sender_transaction_id, fee, 'transfer_fee');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.execute_user_transfer(uuid, text, numeric) TO authenticated;
