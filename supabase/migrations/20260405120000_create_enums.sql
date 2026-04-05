-- supabase/migrations/20260405120000_create_enums.sql
-- Description: Create all ENUM types for Patrimio
-- ROLLBACK:
--   DROP TYPE IF EXISTS investment_type CASCADE;
--   DROP TYPE IF EXISTS operation_type CASCADE;
--   DROP TYPE IF EXISTS frequency_type CASCADE;
--   DROP TYPE IF EXISTS budget_period CASCADE;
--   DROP TYPE IF EXISTS commitment_type_enum CASCADE;
--   DROP TYPE IF EXISTS alert_recurrence_type CASCADE;
--   DROP TYPE IF EXISTS notification_type CASCADE;
--   DROP TYPE IF EXISTS alert_severity CASCADE;

-- Investment types
CREATE TYPE investment_type AS ENUM (
  'stock',          -- Acción individual
  'etf',            -- Fondo cotizado
  'fund',           -- Fondo de inversión
  'crypto',         -- Criptomoneda
  'deposit',        -- Depósito a plazo
  'bond',           -- Bono
  'reit',           -- REIT / SOCIMI
  'other'           -- Otros
);

-- Investment operation types
CREATE TYPE operation_type AS ENUM (
  'buy',            -- Compra
  'sell',           -- Venta
  'dividend',       -- Dividendo
  'split',          -- Split / Desdoblamiento
  'fee',            -- Comisión
  'transfer_in',    -- Transferencia entrante
  'transfer_out'    -- Transferencia saliente
);

-- Recurrence frequency
CREATE TYPE frequency_type AS ENUM (
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannual',
  'annual'
);

-- Budget period
CREATE TYPE budget_period AS ENUM (
  'monthly',
  'annual'
);

-- Commitment type (recurring transactions)
CREATE TYPE commitment_type_enum AS ENUM (
  'mortgage',         -- Hipoteca
  'rent_income',      -- Ingreso por alquiler
  'rent_expense',     -- Gastos de alquiler
  'subscription',     -- Suscripción
  'tax',              -- Impuesto
  'insurance',        -- Seguro
  'utility',          -- Suministro (luz, agua, gas)
  'other'             -- Otro
);

-- Custom alert recurrence
CREATE TYPE alert_recurrence_type AS ENUM (
  'monthly',
  'quarterly',
  'semiannual',
  'annual',
  'biennial',         -- Bienal (IBI, etc.)
  'once'              -- Una sola vez
);

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'budget_exceeded',            -- Presupuesto excedido
  'commitment_due',             -- Compromiso próximo a vencer
  'investment_alert',           -- Alerta de inversión
  'custom_alert_due',           -- Alerta personalizada próxima
  'subscription_unexpected_charge', -- Cargo inesperado de suscripción cancelada
  'expected_income_unpaid',     -- Ingreso esperado no recibido
  'anomaly_detected',           -- Anomalía en gastos detectada
  'system'                      -- Notificación de sistema
);

-- Alert severity
CREATE TYPE alert_severity AS ENUM (
  'info',
  'warning',
  'critical'
);