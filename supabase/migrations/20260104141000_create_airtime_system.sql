-- Migration: Create Airtime System with VTPASS Integration
-- This adds tables and functions for airtime purchase and transfer

-- Create airtime_transactions table
CREATE TABLE IF NOT EXISTS public.airtime_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase', 'transfer')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    phone_number VARCHAR(20) NOT NULL,
    network_provider VARCHAR(50) NOT NULL CHECK (network_provider IN ('MTN', 'GLO', 'AIRTEL', '9MOBILE')),
    recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(20),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    vtpass_request_id VARCHAR(255),
    vtpass_transaction_id VARCHAR(255),
    vtpass_response JSONB,
    error_message TEXT,
    wallet_balance_before DECIMAL(10, 2),
    wallet_balance_after DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_airtime_transactions_user_id ON public.airtime_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_airtime_transactions_status ON public.airtime_transactions(status);
CREATE INDEX IF NOT EXISTS idx_airtime_transactions_created_at ON public.airtime_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_airtime_transactions_recipient ON public.airtime_transactions(recipient_user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_airtime_transaction_updated_at()
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
CREATE TRIGGER trigger_update_airtime_transaction_updated_at
    BEFORE UPDATE ON public.airtime_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_airtime_transaction_updated_at();

-- Enable RLS
ALTER TABLE public.airtime_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for airtime_transactions table
-- Users can view their own transactions
CREATE POLICY "Users can view their own airtime transactions"
    ON public.airtime_transactions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR recipient_user_id = auth.uid());

-- Users can insert their own transactions
CREATE POLICY "Users can create their own airtime transactions"
    ON public.airtime_transactions FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own pending transactions
CREATE POLICY "Users can update their own pending airtime transactions"
    ON public.airtime_transactions FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND status = 'pending')
    WITH CHECK (user_id = auth.uid());

-- Admins can view all transactions
CREATE POLICY "Admins can view all airtime transactions"
    ON public.airtime_transactions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    );

-- Admins can update any transaction
CREATE POLICY "Admins can update any airtime transaction"
    ON public.airtime_transactions FOR UPDATE
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

-- Add airtime provider settings to app_settings table (if not exists)
INSERT INTO public.app_settings (key, value, description)
VALUES 
    ('vtpass_enabled', 'true', 'Enable VTPASS airtime integration'),
    ('airtime_min_amount', '50', 'Minimum airtime purchase amount in Naira'),
    ('airtime_max_amount', '10000', 'Maximum airtime purchase amount in Naira'),
    ('airtime_fee_percentage', '0', 'Fee percentage for airtime purchases')
ON CONFLICT (key) DO NOTHING;

-- Create view for airtime statistics
CREATE OR REPLACE VIEW airtime_statistics AS
SELECT
    user_id,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN transaction_type = 'purchase' THEN amount ELSE 0 END) as total_purchased,
    SUM(CASE WHEN transaction_type = 'transfer' THEN amount ELSE 0 END) as total_transferred,
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_completed_amount,
    SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as total_failed_amount,
    MAX(created_at) as last_transaction_date
FROM airtime_transactions
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON airtime_statistics TO authenticated;
