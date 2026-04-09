-- supabase/migrations/20260410000000_add_interest_fields.sql
-- Description: Add interest rate fields for savings/credit accounts
-- ROLLBACK:
--   ALTER TABLE accounts DROP COLUMN IF EXISTS interest_capitalization;
--   ALTER TABLE accounts DROP COLUMN IF EXISTS annual_interest_rate;

-- ============================================================
-- ADD INTEREST RATE FIELDS
-- ============================================================
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS annual_interest_rate DECIMAL(5, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS interest_capitalization VARCHAR(50) DEFAULT 'annual';

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON COLUMN accounts.annual_interest_rate IS 'Annual interest rate as decimal (e.g., 0.0500 = 5%). 0 = no interest. Only applies to savings/credit accounts.';

COMMENT ON COLUMN accounts.interest_capitalization IS 'Interest capitalization frequency: monthly, quarterly, annual. Only applies when annual_interest_rate > 0.';

-- ============================================================
-- CONSTRAINTS
-- ============================================================
-- Rate must be between 0 and 1 (0-100%)
ALTER TABLE accounts
ADD CONSTRAINT chk_accounts_interest_rate CHECK (
    annual_interest_rate >= 0
    AND annual_interest_rate <= 1
);

-- Valid capitalization values
ALTER TABLE accounts
ADD CONSTRAINT chk_accounts_capitalization CHECK (
    interest_capitalization IN (
        'monthly',
        'quarterly',
        'annual'
    )
);