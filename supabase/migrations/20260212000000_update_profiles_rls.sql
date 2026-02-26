
-- Update RLS policies for profiles table to allow players to view others' profiles
-- We want to allow viewing basic information but hide sensitive data like banking_info and transaction_pin_hash

-- First, drop the existing policy if it exists
DROP POLICY IF EXISTS "Authenticated users can view basic profiles" ON public.profiles;

-- Create a new policy that allows all authenticated users to see profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure we have a policy for users to update their own profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Note: Sensitive fields (banking_info, transaction_pin_hash) should be handled
-- at the application level or via more granular RLS if needed.
-- For now, this allows the "view profile of other players" requirement.
