-- Add new fields to events table
ALTER TABLE "public"."events" ADD COLUMN IF NOT EXISTS "season" text;
ALTER TABLE "public"."events" ADD COLUMN IF NOT EXISTS "lobbies" integer DEFAULT 1;
ALTER TABLE "public"."events" ADD COLUMN IF NOT EXISTS "teams" jsonb;
ALTER TABLE "public"."events" ADD COLUMN IF NOT EXISTS "host_id" uuid REFERENCES "public"."profiles"("id");
ALTER TABLE "public"."events" ADD COLUMN IF NOT EXISTS "room_link" text;
ALTER TABLE "public"."events" ADD COLUMN IF NOT EXISTS "room_code" text;
ALTER TABLE "public"."events" ADD COLUMN IF NOT EXISTS "password" text;
ALTER TABLE "public"."events" ADD COLUMN IF NOT EXISTS "compulsory" boolean DEFAULT false;
ALTER TABLE "public"."events" ADD COLUMN IF NOT EXISTS "public" boolean DEFAULT false;
ALTER TABLE "public"."events" ADD COLUMN IF NOT EXISTS "thumbnail_url" text;
ALTER TABLE "public"."events" ADD COLUMN IF NOT EXISTS "highlight_reel" text;

-- Add RLS policies for public access if not already present
-- Assuming "events" has RLS enabled
-- Allow public read access to events where public = true
CREATE POLICY "Public events are viewable by everyone" 
ON "public"."events" FOR SELECT 
USING (public = true);
