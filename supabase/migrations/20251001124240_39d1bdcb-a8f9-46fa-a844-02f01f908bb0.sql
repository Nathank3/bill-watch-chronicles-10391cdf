-- Add current_countdown and extensions_count to bills table
ALTER TABLE public.bills 
ADD COLUMN current_countdown integer,
ADD COLUMN extensions_count integer NOT NULL DEFAULT 0;

-- Add current_countdown and extensions_count to documents table
ALTER TABLE public.documents 
ADD COLUMN current_countdown integer,
ADD COLUMN extensions_count integer NOT NULL DEFAULT 0;

-- Populate current_countdown for existing bills
-- Calculate days remaining from presentation_date
UPDATE public.bills
SET current_countdown = GREATEST(
  0,
  EXTRACT(DAY FROM (presentation_date - CURRENT_DATE))::integer
)
WHERE current_countdown IS NULL;

-- Populate current_countdown for existing documents
UPDATE public.documents
SET current_countdown = GREATEST(
  0,
  EXTRACT(DAY FROM (presentation_date - CURRENT_DATE))::integer
)
WHERE current_countdown IS NULL;

-- Make current_countdown NOT NULL after populating
ALTER TABLE public.bills 
ALTER COLUMN current_countdown SET NOT NULL;

ALTER TABLE public.documents 
ALTER COLUMN current_countdown SET NOT NULL;