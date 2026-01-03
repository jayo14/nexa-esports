-- Add global theme setting to store app-wide theme
-- Create a new table for app-wide settings that support string values
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read app settings
CREATE POLICY "Anyone can read app settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins and clan masters can update app settings
CREATE POLICY "Only admins can update app settings"
  ON app_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'clan_master')
    )
  );

-- Policy: Only admins and clan masters can insert app settings
CREATE POLICY "Only admins can insert app settings"
  ON app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'clan_master')
    )
  );

-- Insert default theme setting
INSERT INTO app_settings (key, value, description)
VALUES ('global_theme', 'default', 'Global theme applied to all users')
ON CONFLICT (key) DO NOTHING;

-- Create function to update app settings timestamp
CREATE OR REPLACE FUNCTION update_app_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp update
CREATE TRIGGER update_app_settings_timestamp
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_timestamp();
