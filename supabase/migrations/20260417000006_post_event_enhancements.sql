-- Post-Event Enhancements Migration

-- 1. Add columns to events table for recap and MVP
ALTER TABLE events ADD COLUMN IF NOT EXISTS post_event_recap TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS mvp_player_id UUID REFERENCES profiles(id);

-- 2. Create event_clips table for gameplay highlights
CREATE TABLE IF NOT EXISTS event_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id),
  clip_url TEXT NOT NULL,
  caption TEXT,
  clip_type TEXT DEFAULT 'file', -- 'file', 'youtube', 'streamable'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create event_clip_reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS event_clip_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID REFERENCES event_clips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clip_id, user_id, emoji)
);

-- 4. Enable RLS
ALTER TABLE event_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_clip_reactions ENABLE ROW LEVEL SECURITY;

-- 5. Policies for event_clips
-- Everyone can view clips
CREATE POLICY "Clips are viewable by everyone" 
ON event_clips FOR SELECT 
USING (true);

-- Admins and Clan Masters can upload clips
CREATE POLICY "Admins and Clan Masters can upload clips" 
ON event_clips FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'clan_master')
  )
);

-- Uploaders and Admins can delete clips
CREATE POLICY "Uploaders and Admins can delete clips" 
ON event_clips FOR DELETE 
USING (
  auth.uid() = uploaded_by OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'clan_master'))
);

-- 6. Policies for event_clip_reactions
-- Everyone can view reactions
CREATE POLICY "Reactions are viewable by everyone" 
ON event_clip_reactions FOR SELECT 
USING (true);

-- Authenticated users can react
CREATE POLICY "Authenticated users can react" 
ON event_clip_reactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions" 
ON event_clip_reactions FOR DELETE 
USING (auth.uid() = user_id);

-- 7. Ensure event-clips bucket (This is usually done via Supabase dashboard or storage schema)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-clips', 'event-clips', true, 209715200, ARRAY['video/mp4', 'video/quicktime', 'video/webm'])
ON CONFLICT (id) DO UPDATE 
SET file_size_limit = 209715200, allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/webm'];

-- 8. Storage Policies for event-clips
-- Public read
CREATE POLICY "Public Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-clips');

-- Admin/Clan Master upload
CREATE POLICY "Admin Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-clips' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'clan_master')
  )
);
