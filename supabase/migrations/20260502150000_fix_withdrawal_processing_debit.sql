-- Ensure accepted/queued withdrawals immediately debit the wallet if the intent path did not already do so.
CREATE OR REPLACE FUNCTION public.wallet_settle_transaction(
  p_transaction_id UUID,
  p_decision public.wallet_tx_state,
  p_source TEXT,
  p_evidence JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
  v_res public.wallet_reservations%ROWTYPE;
  v_fee NUMERIC;
  v_net NUMERIC;
BEGIN
  SELECT * INTO v_tx
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'transaction_not_found');
  END IF;

  IF v_tx.wallet_state IN ('success'::public.wallet_tx_state, 'failed'::public.wallet_tx_state, 'reversed'::public.wallet_tx_state, 'expired'::public.wallet_tx_state) THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'state', v_tx.wallet_state::TEXT);
  END IF;

  IF p_decision = 'processing' THEN
    IF v_tx.type = 'withdrawal'::transaction_type AND v_tx.wallet_state = 'pending'::public.wallet_tx_state THEN
      SELECT * INTO v_res
      FROM public.wallet_reservations
      WHERE transaction_id = p_transaction_id
      FOR UPDATE;

      IF FOUND AND v_res.state = 'open' THEN
        PERFORM public.wallet_debit(p_transaction_id, v_tx.wallet_id, v_res.amount);
      END IF;
    END IF;

    UPDATE public.transactions
    SET wallet_state = 'processing'::public.wallet_tx_state,
        settlement_source = p_source,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
    WHERE id = p_transaction_id;

    RETURN jsonb_build_object('success', true, 'state', 'processing');
  END IF;

  IF v_tx.type = 'deposit'::transaction_type THEN
    IF p_decision = 'success' THEN
      v_fee := ROUND(v_tx.amount * 0.04, 2);
      v_net := ROUND(v_tx.amount - v_fee, 2);

      PERFORM public.wallet_credit(
        p_transaction_id,
        v_tx.wallet_id,
        v_net,
        v_tx.paga_reference,
        'completed',
        'success'
      );

      UPDATE public.transactions
      SET wallet_state = 'success'::public.wallet_tx_state,
          settled_at = NOW(),
          settlement_source = p_source,
          amount = v_net,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'grossAmount', v_tx.amount,
            'fee', v_fee,
            'lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb)
          )
      WHERE id = p_transaction_id;

      RETURN jsonb_build_object('success', true, 'state', 'success', 'credited', v_net);
    END IF;

    IF p_decision IN ('failed', 'expired', 'reversed') THEN
      UPDATE public.transactions
      SET wallet_state = p_decision::public.wallet_tx_state,
          settled_at = NOW(),
          settlement_source = p_source,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
      WHERE id = p_transaction_id;

      RETURN jsonb_build_object('success', true, 'state', p_decision::TEXT);
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'invalid_decision_for_deposit');
  END IF;

  IF v_tx.type = 'withdrawal'::transaction_type THEN
    SELECT * INTO v_res
    FROM public.wallet_reservations
    WHERE transaction_id = p_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'reservation_not_found');
    END IF;

    IF p_decision = 'success' THEN
      IF v_res.state = 'open' THEN
        UPDATE public.wallet_reservations
        SET state = 'consumed',
            consumed_at = NOW(),
            updated_at = NOW()
        WHERE transaction_id = p_transaction_id;
      END IF;

      UPDATE public.transactions
      SET wallet_state = 'success'::public.wallet_tx_state,
          settled_at = NOW(),
          settlement_source = p_source,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
      WHERE id = p_transaction_id;

      RETURN jsonb_build_object('success', true, 'state', 'success');
    END IF;

    IF p_decision IN ('failed', 'reversed', 'expired') THEN
      IF v_res.state = 'open' THEN
        PERFORM public.wallet_credit(
          p_transaction_id,
          v_tx.wallet_id,
          v_res.amount,
          v_tx.paga_reference,
          'reversed',
          'reversed'
        );

        UPDATE public.wallet_reservations
        SET state = 'released',
            released_at = NOW(),
            updated_at = NOW()
        WHERE transaction_id = p_transaction_id;
      END IF;

      UPDATE public.transactions
      SET wallet_state = p_decision::public.wallet_tx_state,
          settled_at = NOW(),
          settlement_source = p_source,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
      WHERE id = p_transaction_id;

      RETURN jsonb_build_object('success', true, 'state', p_decision::TEXT);
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'invalid_decision_for_withdrawal');
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'unsupported_transaction_type');
END;
$$;
