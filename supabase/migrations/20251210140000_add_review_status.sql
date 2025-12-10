-- Drop existing check constraints
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_status_check;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;

-- Add new check constraints including 'frozen' and 'under_review'
ALTER TABLE bills ADD CONSTRAINT bills_status_check 
  CHECK (status IN ('pending', 'concluded', 'overdue', 'frozen', 'under_review'));

ALTER TABLE documents ADD CONSTRAINT documents_status_check 
  CHECK (status IN ('pending', 'concluded', 'overdue', 'frozen', 'under_review'));
