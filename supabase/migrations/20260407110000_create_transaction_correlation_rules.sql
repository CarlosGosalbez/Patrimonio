-- supabase/migrations/20260407110000_create_transaction_correlation_rules.sql
-- Description: Rules that automatically link imported transactions to recurring commitments
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_tcr_updated_at ON public.transaction_correlation_rules;
--   DROP TABLE IF EXISTS public.transaction_correlation_rules CASCADE;
--   DROP TYPE IF EXISTS public.correlation_match_type;

-- ============================================================
-- 1. ENUM
-- ============================================================
CREATE TYPE public.correlation_match_type AS ENUM (
  'exact_amount',
  'amount_range',
  'concept_contains',
  'concept_regex'
);

-- ============================================================
-- 2. TABLE
-- ============================================================
CREATE TABLE public.transaction_correlation_rules (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

-- Target: link to a recurring commitment (subscriptions will be added later)
commitment_id UUID REFERENCES public.recurring_commitments (id) ON DELETE CASCADE,

-- Matching strategy

match_type              public.correlation_match_type NOT NULL,
  match_value             TEXT         NOT NULL,            -- amount in cents (string), keyword, or regex
  match_tolerance_cents   INTEGER,                         -- only for 'amount_range'
  auto_apply              BOOLEAN      NOT NULL DEFAULT true,
  is_active               BOOLEAN      NOT NULL DEFAULT true,

  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ,

  CONSTRAINT chk_tcr_match_value_not_empty
    CHECK (char_length(trim(match_value)) > 0),
  CONSTRAINT chk_tcr_tolerance_range_only
    CHECK (match_tolerance_cents IS NULL OR match_type = 'amount_range'),
  CONSTRAINT chk_tcr_tolerance_positive
    CHECK (match_tolerance_cents IS NULL OR match_tolerance_cents > 0),
  CONSTRAINT chk_tcr_deleted_order
    CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

COMMENT ON
TABLE public.transaction_correlation_rules IS 'User-defined rules for automatically linking imported bank transactions to recurring commitments.';

COMMENT ON COLUMN public.transaction_correlation_rules.match_value IS 'For exact_amount / amount_range: amount in cents as text. For concept_*: keyword or regex pattern.';

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX idx_tcr_user ON public.transaction_correlation_rules (user_id);

CREATE INDEX idx_tcr_commitment ON public.transaction_correlation_rules (commitment_id)
WHERE
    commitment_id IS NOT NULL;

CREATE INDEX idx_tcr_active ON public.transaction_correlation_rules (user_id)
WHERE
    deleted_at IS NULL
    AND is_active = true;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.transaction_correlation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_tcr" ON public.transaction_correlation_rules FOR
SELECT USING (
        auth.uid () = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "users_insert_tcr" ON public.transaction_correlation_rules FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "users_update_tcr" ON public.transaction_correlation_rules FOR
UPDATE USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- ============================================================
-- 5. TRIGGER
-- ============================================================
CREATE TRIGGER trg_tcr_updated_at
  BEFORE UPDATE ON public.transaction_correlation_rules
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- 6. ADD commitment_id TO TRANSACTIONS (for correlation linking)
-- ============================================================
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS commitment_id UUID REFERENCES public.recurring_commitments (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_commitment ON public.transactions (commitment_id)
WHERE
    commitment_id IS NOT NULL;

-- ============================================================
-- 7. ADD expiration_alert_dismissed TO RECURRING COMMITMENTS
-- ============================================================
ALTER TABLE public.recurring_commitments
ADD COLUMN IF NOT EXISTS expiration_alert_dismissed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.recurring_commitments.expiration_alert_dismissed IS 'User dismissed the "commitment expired but still appearing in statements" alert.';