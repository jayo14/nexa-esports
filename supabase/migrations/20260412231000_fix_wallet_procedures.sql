
-- Fix credit_wallet to handle existing pending transactions
CREATE OR REPLACE FUNCTION public.credit_wallet(
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
    v_existing_status TEXT;
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

    -- Check if transaction already exists
    SELECT id, status INTO v_transaction_id, v_existing_status FROM transactions WHERE reference = p_reference;

    IF v_transaction_id IS NOT NULL THEN
        -- If it exists and is not success, update it
        IF v_existing_status != 'success' THEN
            UPDATE transactions
            SET status = 'success',
                amount = v_net_amount,
                currency = p_currency,
                updated_at = NOW()
            WHERE id = v_transaction_id;

            -- Update the wallet balance
            UPDATE wallets
            SET balance = balance + v_net_amount,
                updated_at = NOW()
            WHERE id = v_wallet_id
            RETURNING balance INTO v_new_balance;

            -- Log the fee as earnings
            INSERT INTO earnings (transaction_id, amount, source)
            VALUES (v_transaction_id, v_fee, 'deposit_fee');
        ELSE
            -- If it was already success, just return current balance
            SELECT balance INTO v_new_balance FROM wallets WHERE id = v_wallet_id;
        END IF;
    ELSE
        -- Update the wallet balance
        UPDATE wallets
        SET balance = balance + v_net_amount,
            updated_at = NOW()
        WHERE id = v_wallet_id
        RETURNING balance INTO v_new_balance;

        -- Create a new transaction
        INSERT INTO transactions (wallet_id, amount, type, status, reference, currency)
        VALUES (v_wallet_id, v_net_amount, 'deposit'::transaction_type, 'success', p_reference, p_currency)
        RETURNING id INTO v_transaction_id;

        -- Log the fee as earnings
        INSERT INTO earnings (transaction_id, amount, source)
        VALUES (v_transaction_id, v_fee, 'deposit_fee');
    END IF;

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix update_wallet_and_create_transaction to handle existing pending transactions
CREATE OR REPLACE FUNCTION public.update_wallet_and_create_transaction(
    p_wallet_id UUID,
    p_new_balance DECIMAL(10, 2), -- This is deprecated now as we should calculate balance in the function
    p_transaction_amount DECIMAL(10, 2),
    p_transaction_type TEXT,
    p_transaction_status TEXT,
    p_transaction_reference TEXT,
    p_transaction_currency TEXT DEFAULT 'NGN'
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_existing_status TEXT;
BEGIN
    -- Check if transaction already exists
    SELECT id, status INTO v_transaction_id, v_existing_status FROM transactions WHERE reference = p_transaction_reference;

    IF v_transaction_id IS NOT NULL THEN
        -- Update existing transaction
        IF v_existing_status != 'success' AND p_transaction_status = 'success' THEN
            UPDATE transactions
            SET status = p_transaction_status,
                amount = p_transaction_amount,
                currency = p_transaction_currency,
                updated_at = NOW()
            WHERE id = v_transaction_id;

            -- Update wallet balance (incrementally to be safe)
            UPDATE wallets
            SET balance = balance + p_transaction_amount,
                updated_at = NOW()
            WHERE id = p_wallet_id;
        ELSIF v_existing_status != 'success' THEN
            -- Just update status if not successful
            UPDATE transactions
            SET status = p_transaction_status,
                updated_at = NOW()
            WHERE id = v_transaction_id;
        END IF;
    ELSE
        -- Insert new transaction
        INSERT INTO transactions (wallet_id, amount, type, status, reference, currency)
        VALUES (p_wallet_id, p_transaction_amount, p_transaction_type::transaction_type, p_transaction_status, p_transaction_reference, p_transaction_currency)
        RETURNING id INTO v_transaction_id;

        -- Update wallet balance if success
        IF p_transaction_status = 'success' THEN
            UPDATE wallets
            SET balance = balance + p_transaction_amount,
                updated_at = NOW()
            WHERE id = p_wallet_id;
        END IF;
    END IF;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
