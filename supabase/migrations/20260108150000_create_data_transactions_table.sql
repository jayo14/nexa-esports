-- Migration: Create Data Transactions Table for VTPASS Integration
-- This adds the data_transactions table for data bundle purchases

-- Create data_transactions table
CREATE TABLE IF NOT EXISTS public.data_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL DEFAULT 'purchase' CHECK (transaction_type IN ('purchase')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    phone_number VARCHAR(20) NOT NULL,
    network_provider VARCHAR(50) NOT NULL CHECK (network_provider IN ('MTN', 'GLO', 'AIRTEL', '9MOBILE')),
    variation_code VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    vtpass_request_id VARCHAR(255),
    vtpass_transaction_id VARCHAR(255),
    vtpass_response JSONB,
    error_message TEXT,
    wallet_balance_before DECIMAL(10, 2),
    wallet_balance_after DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    webhook_received_at TIMESTAMPTZ
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_data_transactions_user_id ON public.data_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_data_transactions_status ON public.data_transactions(status);
CREATE INDEX IF NOT EXISTS idx_data_transactions_created_at ON public.data_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_transactions_vtpass_request_id ON public.data_transactions(vtpass_request_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_data_transaction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
CREATE TRIGGER trigger_update_data_transaction_updated_at
    BEFORE UPDATE ON public.data_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_data_transaction_updated_at();

-- Enable RLS
ALTER TABLE public.data_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data_transactions table
-- Users can view their own transactions
CREATE POLICY "Users can view their own data transactions"
    ON public.data_transactions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own transactions
CREATE POLICY "Users can create their own data transactions"
    ON public.data_transactions FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own pending transactions
CREATE POLICY "Users can update their own pending data transactions"
    ON public.data_transactions FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND status = 'pending')
    WITH CHECK (user_id = auth.uid());

-- Admins can view all transactions
CREATE POLICY "Admins can view all data transactions"
    ON public.data_transactions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    );

-- Admins can update any transaction
CREATE POLICY "Admins can update any data transaction"
    ON public.data_transactions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    );

-- Add data provider settings to app_settings table (if not exists)
INSERT INTO public.app_settings (key, value, description)
VALUES 
    ('data_min_amount', '100', 'Minimum data purchase amount in Naira'),
    ('data_max_amount', '20000', 'Maximum data purchase amount in Naira'),
    ('data_fee_percentage', '0', 'Fee percentage for data purchases')
ON CONFLICT (key) DO NOTHING;

-- Create view for data statistics
CREATE OR REPLACE VIEW data_statistics AS
SELECT
    user_id,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN transaction_type = 'purchase' THEN amount ELSE 0 END) as total_purchased,
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_completed_amount,
    SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as total_failed_amount,
    MAX(created_at) as last_transaction_date
FROM data_transactions
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON data_statistics TO authenticated;
