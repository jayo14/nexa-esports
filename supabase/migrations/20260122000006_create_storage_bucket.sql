-- Migration: Create Marketplace Assets Bucket
-- This script ensures the 'marketplace-assets' bucket exists for account videos and images

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'marketplace-assets', 'marketplace-assets', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'marketplace-assets'
);

-- 2. Set up Storage Policies
-- Allow public read access to the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketplace-assets');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload marketplace assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marketplace-assets');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own marketplace assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'marketplace-assets' AND auth.uid() = owner);
