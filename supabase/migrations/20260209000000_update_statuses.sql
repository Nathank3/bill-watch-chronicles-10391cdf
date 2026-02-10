-- Drop existing constraints to modify data
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_status_check;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;

-- Update existing data to new statuses
-- 'limbo' becomes 'tbd' as requested
UPDATE bills SET status = 'tbd' WHERE status = 'limbo';
UPDATE documents SET status = 'tbd' WHERE status = 'limbo';

-- 'frozen' becomes 'tbd' (assuming frozen means indefinitely paused/to be determined)
-- Alternatively could be 'pending', but 'tbd' feels safer for a "frozen" item.
UPDATE bills SET status = 'tbd' WHERE status = 'frozen';
UPDATE documents SET status = 'tbd' WHERE status = 'frozen';

-- 'under_review' becomes 'pending' (merging into standard workflow if review stage is removed)
UPDATE bills SET status = 'pending' WHERE status = 'under_review';
UPDATE documents SET status = 'pending' WHERE status = 'under_review';

-- Add new constraints with the FINAL list: Pending, Overdue, Concluded, TBD
-- Note: Postgres enums are case sensitive in checks usually, I'll use lowercase as per existing convention
ALTER TABLE bills ADD CONSTRAINT bills_status_check 
  CHECK (status IN ('pending', 'concluded', 'overdue', 'tbd'));

ALTER TABLE documents ADD CONSTRAINT documents_status_check 
  CHECK (status IN ('pending', 'concluded', 'overdue', 'tbd'));
