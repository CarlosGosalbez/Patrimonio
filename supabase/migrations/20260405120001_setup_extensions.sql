-- supabase/migrations/20260405120001_setup_extensions.sql
-- Description: Enable required PostgreSQL extensions and utility functions
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.moddatetime() CASCADE;
--   DROP EXTENSION IF EXISTS moddatetime;

-- Enable moddatetime extension (required by updated_at triggers)
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- Create public wrapper so triggers can call moddatetime() without schema prefix
CREATE OR REPLACE FUNCTION public.moddatetime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;