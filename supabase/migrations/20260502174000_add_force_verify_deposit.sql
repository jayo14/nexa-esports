CREATE OR REPLACE FUNCTION public.force_verify_deposit(
  reference TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
  v_result JSONB;
  v_balance NUMERIC;
BEGIN
  SELECT *
  INTO v_tx
  FROM public.transactions
  WHERE public.transactions.reference = reference
     OR public.transactions.paga_reference = reference
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'transaction_not_found', 'reference', reference);
  END IF;

  IF v_tx.type <> 'deposit'::transaction_type THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_a_deposit', 'reference', reference, 'transaction_id', v_tx.id);
  END IF;

  v_result := public.wallet_settle_transaction(
    v_tx.id,
    'success'::public.wallet_tx_state,
    'force_verify_deposit',
    jsonb_build_object(
      'source', 'force_verify_deposit',
      'reference', reference
    )
  );

  SELECT balance INTO v_balance
  FROM public.wallets
  WHERE id = v_tx.wallet_id;

  RETURN jsonb_build_object(
    'success', COALESCE((v_result->>'success')::boolean, false),
    'state', COALESCE(v_result->>'state', v_tx.wallet_state::text),
    'reference', reference,
    'transaction_id', v_tx.id,
    'new_balance', v_balance,
    'settlement', v_result
  );
END;
$$;
