-- 1. Update Constraints to allow 'limbo'
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_status_check;
ALTER TABLE bills ADD CONSTRAINT bills_status_check 
  CHECK (status IN ('pending', 'concluded', 'overdue', 'frozen', 'limbo'));

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_status_check 
  CHECK (status IN ('pending', 'concluded', 'overdue', 'frozen', 'under_review', 'limbo'));

-- 2. Update Pending Data with No Dates to Limbo
UPDATE bills 
SET status = 'limbo', status_reason = 'Undated item (Migrated from Pending)'
WHERE status = 'pending' 
  AND date_committed IS NULL 
  AND presentation_date IS NULL 
  AND date_laid IS NULL;

UPDATE documents 
SET status = 'limbo', status_reason = 'Undated item (Migrated from Pending)'
WHERE status = 'pending' 
  AND date_committed IS NULL 
  AND presentation_date IS NULL 
  AND date_laid IS NULL;
