-- Fix spammy notifications by using broadcast notifications instead of per-user rows
-- And ensure all users can view broadcast notifications (where user_id is null)

-- 1. Update create_event_notification to create a single broadcast notification
CREATE OR REPLACE FUNCTION create_event_notification()
RETURNS TRIGGER AS $$
DECLARE
  event_time TEXT;
BEGIN
  -- Format the event time
  event_time := TO_CHAR(NEW.date::date, 'Mon DD, YYYY') || ' at ' || 
                TO_CHAR(NEW.time::time, 'HH12:MI AM');

  -- Create a SINGLE broadcast notification (user_id IS NULL)
  INSERT INTO notifications (
    type,
    title,
    message,
    user_id,
    data,
    action_data
  ) VALUES (
    'event_created',
    'New Event Scheduled',
    NEW.name || ' has been scheduled for ' || event_time || '.',
    NULL, -- Broadcast
    jsonb_build_object(
      'event_id', NEW.id,
      'event_name', NEW.name,
      'event_type', NEW.type,
      'event_date', NEW.date,
      'event_time', NEW.time
    ),
    jsonb_build_object(
      'action', 'view_event',
      'event_id', NEW.id
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create event notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update redeem_giveaway_code to create a single broadcast notification
CREATE OR REPLACE FUNCTION public.redeem_giveaway_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id UUID;
    v_code_record RECORD;
    v_wallet_id UUID;
    v_new_balance DECIMAL(10, 2);
    v_redeemer_ign TEXT;
    v_giveaway_title TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Get redeemer IGN
    SELECT ign INTO v_redeemer_ign FROM profiles WHERE id = v_user_id;

    -- Get code details with lock
    SELECT * INTO v_code_record
    FROM giveaway_codes
    WHERE code = UPPER(p_code)
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid code');
    END IF;

    IF v_code_record.is_redeemed THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code already redeemed');
    END IF;

    IF v_code_record.expires_at < NOW() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code expired');
    END IF;

    -- Get giveaway title
    SELECT title INTO v_giveaway_title FROM giveaways WHERE id = v_code_record.giveaway_id;

    -- Get or create user wallet
    SELECT id INTO v_wallet_id FROM wallets WHERE user_id = v_user_id;
    IF NOT FOUND THEN
        INSERT INTO wallets (user_id, balance) VALUES (v_user_id, 0) RETURNING id INTO v_wallet_id;
    END IF;

    -- Credit wallet
    UPDATE wallets
    SET balance = balance + v_code_record.value, updated_at = NOW()
    WHERE id = v_wallet_id
    RETURNING balance INTO v_new_balance;

    -- Record transaction
    INSERT INTO transactions (wallet_id, amount, type, status, reference)
    VALUES (v_wallet_id, v_code_record.value, 'giveaway_redeemed', 'success', 'redeem_' || p_code);

    -- Mark code as redeemed
    UPDATE giveaway_codes
    SET is_redeemed = true, redeemed_by = v_user_id, redeemed_at = NOW()
    WHERE id = v_code_record.id;

    -- Update giveaway stats
    UPDATE giveaways
    SET redeemed_count = redeemed_count + 1,
        redeemed_amount = redeemed_amount + v_code_record.value,
        updated_at = NOW()
    WHERE id = v_code_record.giveaway_id;

    -- Create ONE broadcast notification about the redemption
    INSERT INTO notifications (type, title, message, user_id, data)
    VALUES (
        'giveaway_redeemed',
        '🎉 Code Redeemed!',
        v_redeemer_ign || ' just redeemed ₦' || v_code_record.value || ' from ' || v_giveaway_title,
        NULL, -- Broadcast
        jsonb_build_object(
            'giveaway_id', v_code_record.giveaway_id,
            'redeemer', v_redeemer_ign,
            'amount', v_code_record.value
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'amount', v_code_record.value,
        'new_balance', v_new_balance,
        'message', 'Successfully redeemed ₦' || v_code_record.value
    );
END;
$$;

-- 3. Ensure RLS on notifications allows viewing broadcast notifications
-- Drop old policies to be safe
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can see their own notifications or broadcasts" ON notifications;

CREATE POLICY "Users can see their own notifications or broadcasts"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- Allow admins to see everything
DROP POLICY IF EXISTS "Admins can see everything on notifications" ON notifications;
CREATE POLICY "Admins can see everything on notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) IN ('admin', 'clan_master')
);

-- 4. Cleanup existing duplicates (Optional but good for immediate results)
-- Delete notifications where user_id is not null but they were broadcasts (announcements/event_created)
-- that now exist as duplicates. 
-- Actually, it's safer to just let them be or delete all old 'announcement' and 'event_created'
-- that have user_id if we want to start fresh.
-- DELETE FROM notifications WHERE user_id IS NOT NULL AND type IN ('announcement', 'event_created', 'giveaway_redeemed');
