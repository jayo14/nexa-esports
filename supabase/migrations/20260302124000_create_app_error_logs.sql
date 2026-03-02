CREATE TABLE IF NOT EXISTS public.app_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NULL,
  error_type text NOT NULL,
  message text NOT NULL,
  stack text NULL,
  path text NULL,
  user_agent text NULL
);

ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert app error logs" ON public.app_error_logs;
CREATE POLICY "Authenticated users can insert app error logs"
ON public.app_error_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Service role can read app error logs" ON public.app_error_logs;
CREATE POLICY "Service role can read app error logs"
ON public.app_error_logs
FOR SELECT
TO service_role
USING (true);

GRANT INSERT ON public.app_error_logs TO authenticated;
