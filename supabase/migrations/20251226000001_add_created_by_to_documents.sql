-- Add created_by column to documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update existing documents to have a default (optional, can stay null if unknown)
-- Or if you want to assign them to a specific user (e.g. the first admin), you can do that here.
