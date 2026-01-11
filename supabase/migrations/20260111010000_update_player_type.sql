-- Change player_type column to text to allow flexible values
ALTER TABLE public.profiles ALTER COLUMN player_type DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN player_type TYPE text USING player_type::text;

-- Drop the enum type if it exists and is no longer needed
DROP TYPE IF EXISTS public.player_type;
