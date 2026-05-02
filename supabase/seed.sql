-- Example: Seed data for testing
-- Run with: psql -U postgres -d postgres -f seed.sql

-- Insert test user profile (requires auth.users entry first)
-- This is just an example, you should use Supabase auth to create real users

-- Example accounts
INSERT INTO
    public.accounts (
        id,
        user_id,
        name,
        type,
        institution,
        currency,
        current_balance,
        is_active
    )
VALUES (
        gen_random_uuid (),
        'YOUR_USER_ID',
        'ING Cuenta Corriente',
        'bank',
        'ING',
        'EUR',
        5000.00,
        true
    ),
    (
        gen_random_uuid (),
        'YOUR_USER_ID',
        'TradeRepublic',
        'investment',
        'TradeRepublic',
        'EUR',
        0,
        true
    );

-- Example stock holdings
-- INSERT INTO public.stock_holdings (user_id, account_id, ticker, company_name, shares, average_cost)
-- VALUES ('YOUR_USER_ID', 'YOUR_ACCOUNT_ID', 'AAPL', 'Apple Inc.', 10, 150.00);

-- Note: Replace 'YOUR_USER_ID' and 'YOUR_ACCOUNT_ID' with actual UUIDs