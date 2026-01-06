CREATE OR REPLACE FUNCTION credit_wallet(
    p_user_id UUID,
    p_amount DECIMAL,
    p_reference TEXT,
    p_currency TEXT
)
RETURNS DECIMAL AS $$
DECLARE
    v_wallet_id UUID;
    v_new_balance DECIMAL;
    v_fee DECIMAL;
    v_net_amount DECIMAL;
    v_transaction_id UUID;
BEGIN
    -- Calculate 4% fee
    v_fee := ROUND(p_amount * 0.04, 2);
    v_net_amount := p_amount - v_fee;

    -- Get the user's wallet id
    SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_user_id;

    -- If the user doesn't have a wallet, create one
    IF v_wallet_id IS NULL THEN
        INSERT INTO wallets (user_id, balance)
        VALUES (p_user_id, 0)
        RETURNING id INTO v_wallet_id;
    END IF;

    -- Update the wallet balance
    UPDATE wallets
    SET balance = balance + v_net_amount
    WHERE id = v_wallet_id
    RETURNING balance INTO v_new_balance;

    -- Create a new transaction (store net amount for clarity)
    INSERT INTO transactions (wallet_id, amount, type, status, reference, currency)
    VALUES (v_wallet_id, v_net_amount, 'deposit'::transaction_type, 'success', p_reference, p_currency)
    RETURNING id INTO v_transaction_id;

    -- Log the fee as earnings
    INSERT INTO earnings (transaction_id, amount, source)
    VALUES (v_transaction_id, v_fee, 'deposit_fee');

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;