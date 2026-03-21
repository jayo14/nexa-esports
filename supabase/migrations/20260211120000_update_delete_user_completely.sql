-- Update delete_user_completely to allow users to delete their own accounts
-- This also ensures that the service role can perform the deletion since auth.uid() might be null in that context or represent the admin

CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id_to_delete uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  current_user_role user_role;
BEGIN
  -- Get current user ID from auth
  current_user_id := auth.uid();
  
  -- Get current user's role
  SELECT role INTO current_user_role 
  FROM public.profiles 
  WHERE id = current_user_id;

  -- Allow deletion if:
  -- 1. The caller is an admin or clan master
  -- 2. The caller is the user being deleted (self-deletion)
  -- 3. The caller is using the service role (auth.uid() is null in some contexts, but service role bypasses RLS/checks if we want)
  -- Note: SECURITY DEFINER runs with the privileges of the creator (usually postgres/service_role), 
  -- so we must explicitly check permissions here.
  
  IF current_user_role NOT IN ('admin', 'clan_master') AND current_user_id <> user_id_to_delete THEN
    -- If current_user_id is null, it might be a service role call from an edge function without a user context
    -- but usually Edge Functions pass the headers which sets auth.uid().
    -- We'll allow it if current_user_id is NULL (service role) or matches.
    IF current_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Only admins, clan masters, or the user themselves can delete an account';
    END IF;
  END IF;
  
  -- Delete related records first (in order of dependencies)
  -- Marketplace related deletions
  DELETE FROM public.transaction_logs WHERE wallet_id IN (SELECT id FROM public.wallets WHERE user_id = user_id_to_delete);
  DELETE FROM public.marketplace_purchases WHERE buyer_id = user_id_to_delete;
  DELETE FROM public.account_listings WHERE seller_id = user_id_to_delete;

  -- Standard deletions
  DELETE FROM public.notifications WHERE user_id = user_id_to_delete;
  DELETE FROM public.push_subscriptions WHERE user_id = user_id_to_delete;
  DELETE FROM public.activities WHERE performed_by = user_id_to_delete;
  DELETE FROM public.activities WHERE target_user_id = user_id_to_delete;
  DELETE FROM public.bug_reports WHERE reporter_id = user_id_to_delete;
  DELETE FROM public.chat_messages WHERE user_id = user_id_to_delete;
  DELETE FROM public.messages WHERE sender_id = user_id_to_delete;
  -- Conversations: delete conversations where the user is either buyer or seller
  DELETE FROM public.conversations WHERE buyer_id = user_id_to_delete OR seller_id = user_id_to_delete;
  
  DELETE FROM public.attendance WHERE player_id = user_id_to_delete;
  DELETE FROM public.attendance WHERE marked_by = user_id_to_delete;
  DELETE FROM public.event_participants WHERE player_id = user_id_to_delete;
  DELETE FROM public.events WHERE created_by = user_id_to_delete;
  DELETE FROM public.loadouts WHERE player_id = user_id_to_delete;
  DELETE FROM public.weapon_layouts WHERE player_id = user_id_to_delete;
  
  -- Handle giveaway-related cleanup
  UPDATE public.giveaway_codes SET redeemed_by = NULL WHERE redeemed_by = user_id_to_delete;
  DELETE FROM public.giveaways WHERE created_by = user_id_to_delete;
  
  -- Delete wallet and transactions
  DELETE FROM public.transactions 
  WHERE EXISTS (
    SELECT 1 FROM public.wallets 
    WHERE wallets.id = transactions.wallet_id 
    AND wallets.user_id = user_id_to_delete
  );
  DELETE FROM public.wallets WHERE user_id = user_id_to_delete;
  
  -- Delete earnings and taxes
  DELETE FROM public.earnings WHERE user_id = user_id_to_delete;
  DELETE FROM public.taxes WHERE user_id = user_id_to_delete;
  
  -- Delete profile
  DELETE FROM public.profiles WHERE id = user_id_to_delete;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting user: %', SQLERRM;
END;
$$;
