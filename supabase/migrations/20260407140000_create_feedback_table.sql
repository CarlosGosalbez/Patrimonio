-- supabase/migrations/20260407140000_create_feedback_table.sql
-- Description: User feedback / bug reports table.
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.feedback CASCADE;

CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'bug', -- 'bug' | 'mejora' | 'duda'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_feedback_title CHECK (char_length(trim(title)) > 0),
    CONSTRAINT chk_feedback_type CHECK (
        type IN ('bug', 'mejora', 'duda')
    )
);

CREATE INDEX idx_feedback_user ON public.feedback (user_id);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_feedback" ON public.feedback FOR
SELECT USING (
        auth.uid () = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "users_insert_feedback" ON public.feedback FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);