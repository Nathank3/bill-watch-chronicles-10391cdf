-- Create system_audit table
CREATE TABLE IF NOT EXISTS public.system_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.system_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to insert (audit their own actions)
CREATE POLICY "Enable insert for authenticated users" ON public.system_audit
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow valid users to view logs (adjust as needed, e.g., admins only)
CREATE POLICY "Enable select for authenticated users" ON public.system_audit
    FOR SELECT
    TO authenticated
    USING (true);
