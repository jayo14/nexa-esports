-- Add verification_url to attendance table for visual proofs
ALTER TABLE public.attendance ADD COLUMN verification_url TEXT;

-- Create storage bucket for attendance proofs if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-proofs', 'attendance-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for attendance proofs
CREATE POLICY "Anyone can view attendance proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'attendance-proofs');

CREATE POLICY "Authenticated users can upload attendance proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'attendance-proofs' AND auth.role() = 'authenticated');
