-- Update app_settings SELECT policy to allow public access
-- This is necessary so non-authenticated users can see the global theme on the landing page

DROP POLICY IF EXISTS "Anyone can read app settings" ON app_settings;

CREATE POLICY "Anyone can read app settings"
  ON app_settings
  FOR SELECT
  TO public
  USING (true);
