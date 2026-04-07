-- ============================================================
-- PATRIMIO - Migraciones FASE 2-3 Consolidadas
-- ============================================================
-- Aplica vía Supabase Dashboard → SQL Editor
-- Copia y pega todo este contenido → Run
-- ============================================================

-- ============================================================
-- FASE 2: Completar extensión de profiles
-- ============================================================

-- Añadir date_of_birth (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='date_of_birth') THEN
        ALTER TABLE profiles ADD COLUMN date_of_birth DATE;
        COMMENT ON COLUMN profiles.date_of_birth IS 'Date of birth for age-related features (optional)';
    END IF;
END $$;

-- Constraints (solo si no existen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_avatar_url_storage') THEN
        ALTER TABLE profiles
        ADD CONSTRAINT chk_profiles_avatar_url_storage CHECK (
            avatar_url IS NULL
            OR avatar_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/(public|sign)/avatars/'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_full_name_safe') THEN
        ALTER TABLE profiles
        ADD CONSTRAINT chk_profiles_full_name_safe CHECK (
            full_name IS NULL
            OR (
                char_length(full_name) BETWEEN 1 AND 200
                AND full_name !~ '[<>"'';\\]'
            )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_date_of_birth_valid') THEN
        ALTER TABLE profiles
        ADD CONSTRAINT chk_profiles_date_of_birth_valid CHECK (
            date_of_birth IS NULL
            OR (
                date_of_birth < CURRENT_DATE
                AND date_of_birth >= CURRENT_DATE - INTERVAL '120 years'
            )
        );
    END IF;
END $$;

-- Index (solo si no existe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_avatar') THEN
        CREATE INDEX idx_profiles_avatar ON profiles (avatar_url)
        WHERE avatar_url IS NOT NULL;
    END IF;
END $$;

-- ============================================================
-- FASE 2: Crear bucket de avatars con RLS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies para avatars
CREATE POLICY IF NOT EXISTS "users_insert_own_avatar" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    (storage.filename(name)) !~ '\.\.|/'
  );

CREATE POLICY IF NOT EXISTS "users_update_own_avatar" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY IF NOT EXISTS "users_delete_own_avatar" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY IF NOT EXISTS "public_read_avatars" ON storage.objects FOR
SELECT TO public USING (bucket_id = 'avatars');

-- ============================================================
-- FASE 3: GDPR Data Export RPC
-- ============================================================

CREATE OR REPLACE FUNCTION export_user_data(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Security check: caller must own this user_id
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot export data for other users';
  END IF;

  -- Aggregate all user data
  SELECT jsonb_build_object(
    'user_id', target_user_id,
    'exported_at', NOW() AT TIME ZONE 'UTC',
    'export_version', '1.0',
    
    'profile', (
      SELECT row_to_json(p.*)
      FROM profiles p
      WHERE p.user_id = target_user_id
    ),
    
    'preferences', (
      SELECT row_to_json(up.*)
      FROM user_preferences up
      WHERE up.user_id = target_user_id
    ),
    
    'accounts', (
      SELECT COALESCE(jsonb_agg(row_to_json(a.*)), '[]'::jsonb)
      FROM accounts a
      WHERE a.user_id = target_user_id AND a.deleted_at IS NULL
    ),
    
    'transactions', (
      SELECT COALESCE(jsonb_agg(row_to_json(t.*)), '[]'::jsonb)
      FROM transactions t
      WHERE t.user_id = target_user_id AND t.deleted_at IS NULL
    ),
    
    'categories', (
      SELECT COALESCE(jsonb_agg(row_to_json(c.*)), '[]'::jsonb)
      FROM categories c
      WHERE c.user_id = target_user_id AND c.deleted_at IS NULL
    ),
    
    'budgets', (
      SELECT COALESCE(jsonb_agg(row_to_json(b.*)), '[]'::jsonb)
      FROM budgets b
      WHERE b.user_id = target_user_id AND b.deleted_at IS NULL
    ),
    
    'investments', (
      SELECT COALESCE(jsonb_agg(row_to_json(i.*)), '[]'::jsonb)
      FROM investments i
      WHERE i.user_id = target_user_id AND i.deleted_at IS NULL
    ),
    
    'investment_operations', (
      SELECT COALESCE(jsonb_agg(row_to_json(io.*)), '[]'::jsonb)
      FROM investment_operations io
      WHERE io.user_id = target_user_id AND io.deleted_at IS NULL
    ),
    
    'commitments', (
      SELECT COALESCE(jsonb_agg(row_to_json(rc.*)), '[]'::jsonb)
      FROM recurring_commitments rc
      WHERE rc.user_id = target_user_id AND rc.deleted_at IS NULL
    ),
    
    'custom_alerts', (
      SELECT COALESCE(jsonb_agg(row_to_json(ca.*)), '[]'::jsonb)
      FROM custom_alerts ca
      WHERE ca.user_id = target_user_id AND ca.deleted_at IS NULL
    ),
    
    'notifications', (
      SELECT COALESCE(jsonb_agg(row_to_json(n.*)), '[]'::jsonb)
      FROM notifications n
      WHERE n.user_id = target_user_id
        AND n.created_at >= NOW() - INTERVAL '90 days'
    ),
    
    'categorization_rules', (
      SELECT COALESCE(jsonb_agg(row_to_json(acr.*)), '[]'::jsonb)
      FROM auto_categorization_rules acr
      WHERE acr.user_id = target_user_id AND acr.deleted_at IS NULL
    ),
    
    'correlation_rules', (
      SELECT COALESCE(jsonb_agg(row_to_json(tcr.*)), '[]'::jsonb)
      FROM transaction_correlation_rules tcr
      WHERE tcr.user_id = target_user_id AND tcr.deleted_at IS NULL
    ),
    
    'summary', jsonb_build_object(
      'total_accounts', (SELECT COUNT(*) FROM accounts WHERE user_id = target_user_id AND deleted_at IS NULL),
      'total_transactions', (SELECT COUNT(*) FROM transactions WHERE user_id = target_user_id AND deleted_at IS NULL),
      'total_investments', (SELECT COUNT(*) FROM investments WHERE user_id = target_user_id AND deleted_at IS NULL),
      'total_commitments', (SELECT COUNT(*) FROM recurring_commitments WHERE user_id = target_user_id AND deleted_at IS NULL),
      'account_created_at', (SELECT created_at FROM profiles WHERE user_id = target_user_id)
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION export_user_data (UUID) TO authenticated;

COMMENT ON FUNCTION export_user_data (UUID) IS 'GDPR Article 20: Export all user data as JSON';

-- ============================================================
-- ¡HECHO! Ahora regenera types/database.ts con: npm run db:types
-- ============================================================