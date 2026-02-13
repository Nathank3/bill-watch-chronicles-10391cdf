-- Add concluded_at column to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS concluded_at TIMESTAMP WITH TIME ZONE;

-- Add concluded_at column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS concluded_at TIMESTAMP WITH TIME ZONE;
