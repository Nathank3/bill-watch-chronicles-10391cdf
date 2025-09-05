-- Update bills table with new fields
ALTER TABLE public.bills 
ADD COLUMN IF NOT EXISTS days_allocated INTEGER,
ADD COLUMN IF NOT EXISTS overdue_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS date_laid TIMESTAMP WITH TIME ZONE;

-- Update existing bills to set days_allocated from pending_days
UPDATE public.bills 
SET days_allocated = pending_days 
WHERE days_allocated IS NULL;

-- Make days_allocated not null after migration
ALTER TABLE public.bills 
ALTER COLUMN days_allocated SET NOT NULL;