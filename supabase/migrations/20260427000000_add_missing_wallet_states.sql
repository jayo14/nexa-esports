-- Add missing states to wallet_tx_state enum
ALTER TYPE public.wallet_tx_state ADD VALUE IF NOT EXISTS 'debited';
ALTER TYPE public.wallet_tx_state ADD VALUE IF NOT EXISTS 'credited';
