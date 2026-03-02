-- Create storage bucket for event thumbnails
INSERT INTO storage.buckets (id, name, public)
SELECT 'event-thumbnails', 'event-thumbnails', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'event-thumbnails'
);

-- Public read access for event thumbnails
DROP POLICY IF EXISTS "Public can view event thumbnails" ON storage.objects;
CREATE POLICY "Public can view event thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-thumbnails');

-- Admin and clan leadership can upload event thumbnails
DROP POLICY IF EXISTS "Privileged users can upload event thumbnails" ON storage.objects;
CREATE POLICY "Privileged users can upload event thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-thumbnails'
  AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'clan_master'::user_role, 'moderator'::user_role])
);

-- Admin and clan leadership can update event thumbnails
DROP POLICY IF EXISTS "Privileged users can update event thumbnails" ON storage.objects;
CREATE POLICY "Privileged users can update event thumbnails"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-thumbnails'
  AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'clan_master'::user_role, 'moderator'::user_role])
);

-- Admin and clan leadership can delete event thumbnails
DROP POLICY IF EXISTS "Privileged users can delete event thumbnails" ON storage.objects;
CREATE POLICY "Privileged users can delete event thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-thumbnails'
  AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'clan_master'::user_role, 'moderator'::user_role])
);
