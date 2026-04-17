-- 1. Atomic updates and Negative Balance Protection
ALTER TABLE public.wallets ADD CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0);

-- 2. Update debit_wallet to be truly atomic with FOR UPDATE
CREATE OR REPLACE FUNCTION public.debit_wallet(
    p_user_id    UUID,
    p_amount     DECIMAL,
    p_reference  TEXT,
    p_currency   TEXT DEFAULT 'NGN',
    p_metadata   JSONB DEFAULT '{}'::jsonb,
    p_type       TEXT DEFAULT 'clan'
)
RETURNS JSONB AS $$
DECLARE
    v_wallet_id    UUID;
    v_balance      DECIMAL;
    v_new_balance  DECIMAL;
    v_fee          DECIMAL;
    v_net_amount   DECIMAL;
BEGIN
    -- Use FOR UPDATE to lock the specific wallet row for the user and type
    SELECT id, balance INTO v_wallet_id, v_balance
    FROM public.wallets
    WHERE user_id = p_user_id AND wallet_type = p_type
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'wallet_not_found');
    END IF;

    IF v_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance', 'balance', v_balance);
    END IF;

    v_fee        := ROUND(p_amount * 0.04, 2);
    v_net_amount := ROUND(p_amount - v_fee, 2);
    v_new_balance := ROUND(v_balance - p_amount, 2);

    UPDATE public.wallets
    SET balance    = v_new_balance,
        updated_at = NOW()
    WHERE id = v_wallet_id;

    INSERT INTO public.transactions
           (wallet_id, user_id, amount, type, status, reference, currency, metadata)
    VALUES (v_wallet_id, p_user_id, p_amount,
            'withdrawal'::transaction_type, 'pending', p_reference, p_currency, p_metadata)
    ON CONFLICT (reference) DO NOTHING;

    RETURN jsonb_build_object(
        'success',      true,
        'wallet_id',    v_wallet_id,
        'new_balance',  v_new_balance,
        'fee',          v_fee,
        'net_amount',   v_net_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Row-Level Security Hardening
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Wallets
DROP POLICY IF EXISTS "Users can view their own wallets" ON public.wallets;
CREATE POLICY "Users can view their own wallets" ON public.wallets
FOR SELECT USING (auth.uid() = user_id);

-- Transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" ON public.transactions
FOR SELECT USING (auth.uid() = user_id);

-- Earnings (Strict)
DROP POLICY IF EXISTS "Only staff can view earnings" ON public.earnings;
CREATE POLICY "Only staff can view earnings" ON public.earnings
FOR SELECT USING (
  get_user_role(auth.uid()) IN ('admin', 'clan_master')
);

-- Account Transactions (Marketplace Escrow)
DROP POLICY IF EXISTS "Participants can view their escrow transactions" ON public.account_transactions;
CREATE POLICY "Participants can view their escrow transactions" ON public.account_transactions
FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Team Members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members can view their teammates" ON public.team_members;
CREATE POLICY "Team members can view their teammates" ON public.team_members
FOR SELECT TO authenticated USING (true);

-- Team Messages
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members can view chat" ON public.team_messages;
CREATE POLICY "Team members can view chat" ON public.team_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = public.team_messages.team_id AND tm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Team members can send chat" ON public.team_messages;
CREATE POLICY "Team members can send chat" ON public.team_messages
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = public.team_messages.team_id AND tm.user_id = auth.uid()
  )
);
