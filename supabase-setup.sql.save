-- ============================================
-- Услуги Бензо — Supabase Setup SQL
-- Запусти это в SQL Editor Supabase
-- ============================================

-- 1. Таблица конфигурации
CREATE TABLE IF NOT EXISTS public.config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
);

-- 2. Начальные значения
INSERT INTO public.config (key, value) VALUES
    ('greeting_text', 'Приветствуем на <strong>Услуги Бензо</strong>! Ознакомьтесь с нашими услугами.'),
    ('telegram', '@murderirl'),
    ('channel', '@god_benzo')
ON CONFLICT (key) DO NOTHING;

-- 3. Включаем Row Level Security
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- 4. RLS: читать могут ВСЕ
CREATE POLICY "read_all"
    ON public.config
    FOR SELECT
    USING (true);

-- 5. RLS: писать могут только авторизованные админы
CREATE POLICY "write_admin"
    ON public.config
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "update_admin"
    ON public.config
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 6. Создай пользователя-админа вручную:
--    Settings → Authentication → Users → Add User
--    Email: твой_email
--    Password: твой_пароль
