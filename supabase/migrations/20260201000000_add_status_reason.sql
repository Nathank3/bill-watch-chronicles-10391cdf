-- Add status_reason column to bills and documents tables
ALTER TABLE bills ADD COLUMN IF NOT EXISTS status_reason text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status_reason text;
