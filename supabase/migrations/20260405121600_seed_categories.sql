-- supabase/migrations/20260405121600_seed_categories.sql
-- Description: Seed system categories (user_id = NULL)
-- ROLLBACK: DELETE FROM categories WHERE user_id IS NULL;

-- Default system categories (user_id = NULL = visible to all users)
INSERT INTO categories (id, user_id, name, icon, color, is_income, sort_order) VALUES
  -- Income categories
  (gen_random_uuid(), NULL, 'Salario', '💰', '#10B981', true, 1),
  (gen_random_uuid(), NULL, 'Freelance', '💼', '#10B981', true, 2),
  (gen_random_uuid(), NULL, 'Alquiler (ingreso)', '🏠', '#10B981', true, 3),
  (gen_random_uuid(), NULL, 'Inversiones', '📈', '#10B981', true, 4),
  (gen_random_uuid(), NULL, 'Otros ingresos', '➕', '#10B981', true, 5),
  
  -- Expense categories - Housing
  (gen_random_uuid(), NULL, 'Hipoteca / Alquiler', '🏡', '#EF4444', false, 10),
  (gen_random_uuid(), NULL, 'Suministros (luz, agua, gas)', '💡', '#F59E0B', false, 11),
  (gen_random_uuid(), NULL, 'Comunidad', '🏢', '#F59E0B', false, 12),
  
  -- Expense categories - Food
  (gen_random_uuid(), NULL, 'Supermercado', '🛒', '#F97316', false, 20),
  (gen_random_uuid(), NULL, 'Restaurantes', '🍽️', '#F97316', false, 21),
  
  -- Expense categories - Transportation
  (gen_random_uuid(), NULL, 'Gasolina', '⛽', '#3B82F6', false, 30),
  (gen_random_uuid(), NULL, 'Transporte público', '🚇', '#3B82F6', false, 31),
  (gen_random_uuid(), NULL, 'Seguro coche', '🚗', '#3B82F6', false, 32),
  (gen_random_uuid(), NULL, 'Mantenimiento vehículo', '🔧', '#3B82F6', false, 33),
  
  -- Expense categories - Health
  (gen_random_uuid(), NULL, 'Sanidad', '🏥', '#EC4899', false, 40),
  (gen_random_uuid(), NULL, 'Farmacia', '💊', '#EC4899', false, 41),
  (gen_random_uuid(), NULL, 'Seguro médico', '🩺', '#EC4899', false, 42),
  
  -- Expense categories - Entertainment
  (gen_random_uuid(), NULL, 'Ocio y entretenimiento', '🎭', '#8B5CF6', false, 50),
  (gen_random_uuid(), NULL, 'Suscripciones', '📺', '#8B5CF6', false, 51),
  (gen_random_uuid(), NULL, 'Viajes', '✈️', '#8B5CF6', false, 52),
  
  -- Expense categories - Shopping
  (gen_random_uuid(), NULL, 'Ropa', '👕', '#06B6D4', false, 60),
  (gen_random_uuid(), NULL, 'Tecnología', '💻', '#06B6D4', false, 61),
  
  -- Expense categories - Education & Personal Development
  (gen_random_uuid(), NULL, 'Educación', '📚', '#14B8A6', false, 70),
  
  -- Expense categories - Taxes & Insurance
  (gen_random_uuid(), NULL, 'Impuestos', '🏛️', '#DC2626', false, 80),
  (gen_random_uuid(), NULL, 'Seguros', '🛡️', '#DC2626', false, 81),
  
  -- Expense categories - Other
  (gen_random_uuid(), NULL, 'Otros gastos', '➖', '#6B7280', false, 90)
ON CONFLICT DO NOTHING;
