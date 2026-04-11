-- Allow admin/clan_master to assign users to teams without requiring user_id = auth.uid()
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;

CREATE POLICY "team_members_insert" ON public.team_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'clan_master')
  )
);
