-- Marketplace escrow workflow improvements:
-- 1) Seller can explicitly mark order as delivered.
-- 2) Buyer is notified in-app when seller marks delivered.
-- 3) Preserve strict authorization and status transitions.

CREATE OR REPLACE FUNCTION public.marketplace_mark_transaction_delivered(
  p_transaction_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id UUID;
  v_buyer_id UUID;
  v_seller_id UUID;
  v_current_status TEXT;
  v_listing_title TEXT;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT
    t.buyer_id,
    t.seller_id,
    t.status,
    l.title
  INTO
    v_buyer_id,
    v_seller_id,
    v_current_status,
    v_listing_title
  FROM public.account_transactions t
  JOIN public.account_listings l ON l.id = t.listing_id
  WHERE t.id = p_transaction_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;

  IF v_actor_id <> v_seller_id
     AND NOT EXISTS (
       SELECT 1
       FROM public.profiles p
       WHERE p.id = v_actor_id
         AND p.role IN ('admin', 'clan_master')
     ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_current_status NOT IN ('processing', 'funds_held') THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'error',
      format('Cannot mark delivered from status: %s', v_current_status)
    );
  END IF;

  UPDATE public.account_transactions
  SET
    status = 'delivered',
    seller_confirmed = true,
    updated_at = now()
  WHERE id = p_transaction_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_buyer_id,
    'marketplace_delivery_update',
    'Seller marked order as delivered',
    format('Your order "%s" is ready. Please verify account access and confirm receipt.', COALESCE(v_listing_title, 'Marketplace purchase')),
    jsonb_build_object('transaction_id', p_transaction_id)
  );

  RETURN jsonb_build_object('success', true, 'status', 'delivered');
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_mark_transaction_delivered(UUID) TO authenticated;
