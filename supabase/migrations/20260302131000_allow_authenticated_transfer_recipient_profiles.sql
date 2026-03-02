-- Ensure all authenticated users can view recipient profile fields used in transfer flow

GRANT SELECT (id, ign, username, avatar_url, status, is_banned)
ON public.profiles
TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can view transfer recipients" ON public.profiles;
CREATE POLICY "Authenticated users can view transfer recipients"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
