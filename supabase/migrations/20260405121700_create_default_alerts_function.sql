-- supabase/migrations/20260405121700_create_default_alerts_function.sql
-- Description: Function to create default custom alerts for new users
-- ROLLBACK: DROP FUNCTION IF EXISTS create_default_custom_alerts(UUID);

CREATE OR REPLACE FUNCTION create_default_custom_alerts(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario autenticado es el propietario
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Crear alertas predefinidas
  INSERT INTO custom_alerts (user_id, name, description, recurrence, due_date, advance_notice_days, expected_amount_cents)
  VALUES
    (p_user_id, 'IBI (Impuesto sobre Bienes Inmuebles)', 'Impuesto municipal sobre la vivienda', 'annual', date_trunc('year', CURRENT_DATE) + interval '6 months', 60, NULL),
    (p_user_id, 'IRPF (Declaración de la Renta)', 'Declaración anual del impuesto sobre la renta', 'annual', date_trunc('year', CURRENT_DATE) + interval '4 months', 60, NULL),
    (p_user_id, 'Impuesto de Circulación (IVTM)', 'Impuesto de vehículos de tracción mecánica', 'annual', date_trunc('year', CURRENT_DATE) + interval '9 months', 30, NULL),
    (p_user_id, 'Seguro del Coche', 'Renovación del seguro del vehículo', 'annual', CURRENT_DATE + interval '11 months', 30, NULL),
    (p_user_id, 'Seguro del Hogar', 'Renovación del seguro de la vivienda', 'annual', CURRENT_DATE + interval '11 months', 30, NULL),
    (p_user_id, 'Tasa de Basura', 'Tasa municipal de recogida de residuos', 'annual', date_trunc('year', CURRENT_DATE) + interval '8 months', 30, NULL)
  ON CONFLICT DO NOTHING;
END;
$$;

COMMENT ON FUNCTION create_default_custom_alerts IS 'Creates default custom alerts for a new user during onboarding';
