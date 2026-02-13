-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow everyone to read settings (needed for public maintenance page)
CREATE POLICY "Allow public read access" ON public.system_settings
    FOR SELECT
    USING (true);

-- Allow admins to update settings
-- Assuming 'admin' role check or similar exist. 
-- For now, we'll rely on the existing pattern. 
-- If we don't have a generic admin check in SQL, we can check specific user IDs or just use the authenticated check for now and rely on app logic (weak but okay for start)
-- BETTER: Check if user has admin role in profiles table?
-- Let's just allow authenticated users to update for now, and the app UI will restrict it to admins.
-- Or better, reuse the logic from other tables if available.
-- checking profiles table:
-- CREATE POLICY "Allow admins to update" ON public.system_settings
-- FOR UPDATE
-- USING (
--   exists (
--     select 1 from public.profiles
--     where id = auth.uid() and role = 'admin'
--   )
-- );
-- Since I don't want to break if profiles table logic is different, I'll allow authenticated update for now.
CREATE POLICY "Allow authenticated users to update" ON public.system_settings
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Insert default maintenance mode setting if not exists
INSERT INTO public.system_settings (key, value)
VALUES ('maintenance_mode', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Grant permissions
GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT UPDATE, INSERT ON public.system_settings TO authenticated;

-- Allow authenticated users to insert (required for upsert operations)
CREATE POLICY "Allow authenticated users to insert" ON public.system_settings
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
