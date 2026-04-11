-- Team chat messages
CREATE TABLE IF NOT EXISTS public.team_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_messages_team_id ON public.team_messages(team_id, created_at DESC);

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Only team members can read or write their team's chat
DROP POLICY IF EXISTS "team_messages_select" ON public.team_messages;
CREATE POLICY "team_messages_select" ON public.team_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_messages.team_id AND tm.user_id = auth.uid()));

DROP POLICY IF EXISTS "team_messages_insert" ON public.team_messages;
CREATE POLICY "team_messages_insert" ON public.team_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_messages.team_id AND tm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "team_messages_delete" ON public.team_messages;
CREATE POLICY "team_messages_delete" ON public.team_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());

