ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS invite_code TEXT;

ALTER TABLE public.teams
  ALTER COLUMN invite_code SET DEFAULT substr(md5(gen_random_uuid()::text), 1, 8);

UPDATE public.teams
SET invite_code = substr(md5(gen_random_uuid()::text), 1, 8)
WHERE invite_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_invite_code_unique
  ON public.teams(invite_code);
