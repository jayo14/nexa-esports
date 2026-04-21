-- Reconciliation run tracking and findings

CREATE TABLE IF NOT EXISTS public.wallet_reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'running',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_reconciliation_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.wallet_reconciliation_runs(id) ON DELETE CASCADE,
  transaction_id UUID NULL REFERENCES public.transactions(id) ON DELETE SET NULL,
  severity TEXT NOT NULL,
  finding_type TEXT NOT NULL,
  db_state TEXT NULL,
  provider_state TEXT NULL,
  action_state TEXT NOT NULL DEFAULT 'open',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_reconciliation_findings_run
  ON public.wallet_reconciliation_findings(run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_reconciliation_findings_action
  ON public.wallet_reconciliation_findings(action_state, severity, created_at DESC);

CREATE OR REPLACE FUNCTION public.wallet_start_reconciliation_run()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run_id UUID;
BEGIN
  INSERT INTO public.wallet_reconciliation_runs(status)
  VALUES ('running')
  RETURNING id INTO v_run_id;

  RETURN v_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_add_reconciliation_finding(
  p_run_id UUID,
  p_transaction_id UUID,
  p_severity TEXT,
  p_finding_type TEXT,
  p_db_state TEXT,
  p_provider_state TEXT,
  p_action_state TEXT,
  p_details JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.wallet_reconciliation_findings(
    run_id,
    transaction_id,
    severity,
    finding_type,
    db_state,
    provider_state,
    action_state,
    details
  ) VALUES (
    p_run_id,
    p_transaction_id,
    p_severity,
    p_finding_type,
    p_db_state,
    p_provider_state,
    COALESCE(p_action_state, 'open'),
    COALESCE(p_details, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_finish_reconciliation_run(
  p_run_id UUID,
  p_status TEXT,
  p_summary JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.wallet_reconciliation_runs
  SET status = COALESCE(p_status, 'completed'),
      summary = COALESCE(p_summary, '{}'::jsonb),
      finished_at = NOW()
  WHERE id = p_run_id;
END;
$$;

ALTER TABLE public.wallet_reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_reconciliation_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view reconciliation runs" ON public.wallet_reconciliation_runs;
CREATE POLICY "Staff can view reconciliation runs"
ON public.wallet_reconciliation_runs
FOR SELECT
USING (get_user_role(auth.uid()) IN ('admin', 'clan_master'));

DROP POLICY IF EXISTS "Staff can view reconciliation findings" ON public.wallet_reconciliation_findings;
CREATE POLICY "Staff can view reconciliation findings"
ON public.wallet_reconciliation_findings
FOR SELECT
USING (get_user_role(auth.uid()) IN ('admin', 'clan_master'));
