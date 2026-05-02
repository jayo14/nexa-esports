-- Add configurable wallet minimums for deposits and withdrawals.
INSERT INTO public.app_settings (key, value, description)
VALUES
  ('min_deposit_amount', '500', 'Minimum amount users can deposit into their wallet'),
  ('min_withdrawal_amount', '500', 'Minimum amount users can withdraw from their wallet')
ON CONFLICT (key) DO NOTHING;

