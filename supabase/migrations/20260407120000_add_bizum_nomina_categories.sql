-- supabase/migrations/20260407120000_add_bizum_nomina_categories.sql
-- Description: Add Bizum and Nómina system categories
-- ROLLBACK: DELETE FROM categories WHERE name IN ('Bizum recibido', 'Bizum enviado', 'Nómina') AND user_id IS NULL;

INSERT INTO
    categories (
        id,
        user_id,
        name,
        icon,
        color,
        is_income,
        sort_order
    )
VALUES (
        gen_random_uuid (),
        NULL,
        'Nómina',
        '💼',
        '#3b82f6',
        true,
        6
    ),
    (
        gen_random_uuid (),
        NULL,
        'Bizum recibido',
        '📲',
        '#10b981',
        true,
        7
    ),
    (
        gen_random_uuid (),
        NULL,
        'Bizum enviado',
        '📤',
        '#ef4444',
        false,
        91
    ) ON CONFLICT DO NOTHING;