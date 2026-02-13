-- Scalability Improvements: Indexing and RPC for Stats

-- 1. Create Indexes for Common Filter Columns
-- These indexes support the extensive filtering done in useBillsQuery and useDocumentsQuery
-- "IF NOT EXISTS" is used to prevent errors if they were already created manually

-- Bills Table Indexes
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_committee ON public.bills(committee);
CREATE INDEX IF NOT EXISTS idx_bills_presentation_date ON public.bills(presentation_date); -- Used for sorting and overdue checks
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON public.bills(created_at); -- Used for default sort and date range filters
CREATE INDEX IF NOT EXISTS idx_bills_date_committed ON public.bills(date_committed); -- Used for sorting
CREATE INDEX IF NOT EXISTS idx_bills_concluded_at ON public.bills(concluded_at); -- Used for daily report filtering

-- Documents Table Indexes
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type); -- Crucial for separating motions, petitions, etc.
CREATE INDEX IF NOT EXISTS idx_documents_committee ON public.documents(committee);
CREATE INDEX IF NOT EXISTS idx_documents_presentation_date ON public.documents(presentation_date);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_concluded_at ON public.documents(concluded_at);

-- 2. Create RPC Function for Efficient Statistics
-- This function calculates stats on the server side, preventing the need to fetch all records to the client.
-- This reduces data transfer from O(N) to O(1) and leverages DB speed.

CREATE OR REPLACE FUNCTION public.get_business_stats(target_type text DEFAULT 'bill')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    _total int;
    _pending int;
    _concluded int;
    _overdue int;
    _frozen int;
    _under_review int;
    _tbd int;
    
    -- Helper variable to hold the logic for excluding higher priority statuses from overdue check
    -- Logic mirrors the TypeScript "early return" pattern:
    -- 1. Concluded
    -- 2. Under Review
    -- 3. Frozen
    -- 4. TBD (Limbo/Pending w/o date)
    -- 5. Overdue
    -- 6. Pending (Default)
BEGIN
    IF target_type = 'bill' THEN
        SELECT
            COUNT(*),
            -- Concluded
            COUNT(CASE WHEN status = 'concluded' THEN 1 END),
            -- Under Review
            COUNT(CASE WHEN status = 'under_review' THEN 1 END),
            -- Frozen
            COUNT(CASE WHEN status = 'frozen' THEN 1 END),
            -- TBD
            COUNT(CASE WHEN status IN ('limbo', 'tbd') OR (status = 'pending' AND presentation_date IS NULL) THEN 1 END),
            -- Overdue
            -- Must exclude Concluded, Under Review, Frozen, and TBD cases first
            COUNT(CASE 
                WHEN status IN ('concluded', 'under_review', 'frozen', 'limbo', 'tbd') THEN NULL
                WHEN status = 'pending' AND presentation_date IS NULL THEN NULL
                WHEN status = 'overdue' OR extensions_count > 0 OR (presentation_date IS NOT NULL AND presentation_date < NOW()) THEN 1 
            END),
            -- Pending (Remainder)
            COUNT(CASE 
                WHEN status IN ('concluded', 'under_review', 'frozen', 'limbo', 'tbd') THEN NULL
                WHEN status = 'pending' AND presentation_date IS NULL THEN NULL
                WHEN status = 'overdue' OR extensions_count > 0 OR (presentation_date IS NOT NULL AND presentation_date < NOW()) THEN NULL
                ELSE 1 
            END)
        INTO _total, _concluded, _under_review, _frozen, _tbd, _overdue, _pending
        FROM public.bills;
        
    ELSE
        SELECT
            COUNT(*),
            COUNT(CASE WHEN status = 'concluded' THEN 1 END),
            COUNT(CASE WHEN status = 'under_review' THEN 1 END),
            COUNT(CASE WHEN status = 'frozen' THEN 1 END),
            COUNT(CASE WHEN status IN ('limbo', 'tbd') OR (status = 'pending' AND presentation_date IS NULL) THEN 1 END),
            COUNT(CASE 
                WHEN status IN ('concluded', 'under_review', 'frozen', 'limbo', 'tbd') THEN NULL
                WHEN status = 'pending' AND presentation_date IS NULL THEN NULL
                WHEN status = 'overdue' OR extensions_count > 0 OR (presentation_date IS NOT NULL AND presentation_date < NOW()) THEN 1 
            END),
            COUNT(CASE 
                WHEN status IN ('concluded', 'under_review', 'frozen', 'limbo', 'tbd') THEN NULL
                WHEN status = 'pending' AND presentation_date IS NULL THEN NULL
                WHEN status = 'overdue' OR extensions_count > 0 OR (presentation_date IS NOT NULL AND presentation_date < NOW()) THEN NULL
                ELSE 1 
            END)
        INTO _total, _concluded, _under_review, _frozen, _tbd, _overdue, _pending
        FROM public.documents
        WHERE type = target_type::document_type;
    END IF;

    result := json_build_object(
        'total', _total,
        'concluded', _concluded,
        'underReview', _under_review,
        'frozen', _frozen,
        'tbd', _tbd,
        'overdue', _overdue,
        'pending', _pending
    );
    
    RETURN result;
END;
$$;
