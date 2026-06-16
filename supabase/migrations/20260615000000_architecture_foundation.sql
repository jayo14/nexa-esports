-- Phase 1: Architecture Foundation
-- Adds version column, non-negative constraint, audit log table,
-- version increment trigger, and pre-migration balance snapshot.

-- 1. Add version column to wallets for optimistic concurrency control
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- 2. Enforce wallets.balance cannot go negative
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_balance_non_negative;
ALTER TABLE public.wallets ADD CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0);

-- 3. Immutable audit log for all wallet state changes
CREATE TABLE IF NOT EXISTS public.wallet_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT        NOT NULL,
  entity_id   UUID        NOT NULL,
  action      TEXT        NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  actor       TEXT        NOT NULL,
  actor_id    UUID,
  evidence    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_audit_entity
  ON public.wallet_audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_actor
  ON public.wallet_audit_log(actor, created_at DESC);

-- 4. Auto-increment version on every wallet UPDATE
CREATE OR REPLACE FUNCTION public.wallet_increment_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.version    := OLD.version + 1;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_version ON public.wallets;
CREATE TRIGGER trg_wallet_version
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.wallet_increment_version();

-- 5. Pre-migration balance snapshot (one row per wallet, idempotent)
CREATE TABLE IF NOT EXISTS public.migration_balance_snapshot (
  wallet_id              UUID        PRIMARY KEY,
  user_id                UUID        NOT NULL,
  wallet_type            TEXT        NOT NULL,
  balance_at_snapshot    NUMERIC(18,2) NOT NULL,
  ledger_computed_balance NUMERIC(18,2),
  snapshot_taken_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  migration_run          TEXT        NOT NULL DEFAULT 'june_2026'
);

INSERT INTO public.migration_balance_snapshot (wallet_id, user_id, wallet_type, balance_at_snapshot)
SELECT id, user_id, COALESCE(wallet_type, 'clan'), balance
FROM public.wallets
ON CONFLICT (wallet_id) DO NOTHING;
