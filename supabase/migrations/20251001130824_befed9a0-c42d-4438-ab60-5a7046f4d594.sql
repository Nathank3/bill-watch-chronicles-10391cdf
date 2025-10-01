-- First, drop the existing check constraints
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_status_check;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;

-- Add new check constraints that include 'overdue' status
ALTER TABLE bills ADD CONSTRAINT bills_status_check 
  CHECK (status IN ('pending', 'concluded', 'overdue'));

ALTER TABLE documents ADD CONSTRAINT documents_status_check 
  CHECK (status IN ('pending', 'concluded', 'overdue'));

-- Now update bills table to recalculate current_countdown based on presentation_date
UPDATE bills
SET current_countdown = CASE
  WHEN status = 'concluded' THEN 0
  ELSE EXTRACT(DAY FROM (presentation_date - CURRENT_DATE))::integer
END
WHERE current_countdown = 0 OR current_countdown IS NULL;

-- Update documents table to recalculate current_countdown based on presentation_date
UPDATE documents
SET current_countdown = CASE
  WHEN status = 'concluded' THEN 0
  ELSE EXTRACT(DAY FROM (presentation_date - CURRENT_DATE))::integer
END
WHERE current_countdown = 0 OR current_countdown IS NULL;

-- Update status to 'overdue' for items that have passed their presentation date or been extended
UPDATE bills
SET status = 'overdue'
WHERE status = 'pending' 
  AND (presentation_date < CURRENT_DATE OR extensions_count > 0);

UPDATE documents
SET status = 'overdue'
WHERE status = 'pending' 
  AND (presentation_date < CURRENT_DATE OR extensions_count > 0);

-- Ensure days_allocated is set for all records
UPDATE bills
SET days_allocated = COALESCE(days_allocated, pending_days)
WHERE days_allocated IS NULL OR days_allocated = 0;

UPDATE documents
SET days_allocated = COALESCE(days_allocated, pending_days)
WHERE days_allocated IS NULL OR days_allocated = 0;