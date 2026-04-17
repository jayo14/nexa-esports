-- Fix recursive RLS policy on team_members
DROP POLICY IF EXISTS "Team members can view their teammates" ON public.team_members;
CREATE POLICY "Team members can view their teammates" ON public.team_members
FOR SELECT TO authenticated USING (true);

-- Fix relationship between team_members and profiles for PostgREST
-- Since team_members.user_id references auth.users, and profiles.id references auth.users,
-- adding an explicit FK between them allows Supabase to join them.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'team_members_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE public.team_members 
        ADD CONSTRAINT team_members_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;
