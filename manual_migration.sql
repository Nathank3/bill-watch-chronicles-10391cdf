-- MANUAL MIGRATION FOR MANAGERIAL REPORTS
-- Please run this entire script in your Supabase SQL Editor to fix the "No data available" error.

-- 1. Create Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_committee ON public.bills(committee);
CREATE INDEX IF NOT EXISTS idx_bills_presentation_date ON public.bills(presentation_date);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON public.bills(created_at);
CREATE INDEX IF NOT EXISTS idx_bills_concluded_at ON public.bills(concluded_at);

CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_committee ON public.documents(committee);
CREATE INDEX IF NOT EXISTS idx_documents_presentation_date ON public.documents(presentation_date);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_concluded_at ON public.documents(concluded_at);

-- 2. Create the Managerial Stats Function
CREATE OR REPLACE FUNCTION public.get_managerial_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- result variables
    result json;
    
    -- Date ranges
    start_current_month timestamp;
    start_last_month timestamp;
    end_last_month timestamp;
    
    -- Current Month Counts
    curr_bills_introduced int;
    curr_bills_concluded int;
    curr_motions_introduced int;
    curr_motions_concluded int;
    
    -- Last Month Counts
    last_bills_introduced int;
    last_bills_concluded int;
    last_motions_introduced int;
    last_motions_concluded int;
    
    -- Committee Stats
    committee_stats json;
    
BEGIN
    -- Set Timeframes
    start_current_month := date_trunc('month', now());
    start_last_month := date_trunc('month', now() - interval '1 month');
    end_last_month := date_trunc('month', now()) - interval '1 second';
    
    -- 1. Calculate Bill Metrics
    -- Current Month
    SELECT COUNT(*) INTO curr_bills_introduced FROM public.bills 
    WHERE created_at >= start_current_month;
    
    SELECT COUNT(*) INTO curr_bills_concluded FROM public.bills 
    WHERE status = 'concluded' AND concluded_at >= start_current_month;
    
    -- Last Month
    SELECT COUNT(*) INTO last_bills_introduced FROM public.bills 
    WHERE created_at >= start_last_month AND created_at <= end_last_month;
    
    SELECT COUNT(*) INTO last_bills_concluded FROM public.bills 
    WHERE status = 'concluded' AND concluded_at >= start_last_month AND concluded_at <= end_last_month;

    -- 2. Calculate Motion Metrics (Type = 'motion')
    -- Current Month
    SELECT COUNT(*) INTO curr_motions_introduced FROM public.documents 
    WHERE type = 'motion' AND created_at >= start_current_month;
    
    SELECT COUNT(*) INTO curr_motions_concluded FROM public.documents 
    WHERE type = 'motion' AND status = 'concluded' AND concluded_at >= start_current_month;
    
    -- Last Month
    SELECT COUNT(*) INTO last_motions_introduced FROM public.documents 
    WHERE type = 'motion' AND created_at >= start_last_month AND created_at <= end_last_month;
    
    SELECT COUNT(*) INTO last_motions_concluded FROM public.documents 
    WHERE type = 'motion' AND status = 'concluded' AND concluded_at >= start_last_month AND concluded_at <= end_last_month;

    -- 3. Committee Performance
    WITH all_business AS (
        SELECT committee, status, concluded_at FROM public.bills
        UNION ALL
        SELECT committee, status, concluded_at FROM public.documents
    ),
    comm_stats AS (
        SELECT 
            committee,
            COUNT(*) as total_items,
            COUNT(CASE WHEN status = 'concluded' THEN 1 END) as concluded_items,
            COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_items,
            COUNT(CASE WHEN status = 'concluded' AND concluded_at >= start_current_month THEN 1 END) as concluded_this_month
        FROM all_business
        WHERE committee IS NOT NULL AND committee != ''
        GROUP BY committee
    )
    SELECT json_agg(row_to_json(comm_stats)) INTO committee_stats FROM comm_stats;

    -- 4. Build JSON Result
    result := json_build_object(
        'trends', json_build_object(
            'bills', json_build_object(
                'introduced', json_build_object('current', curr_bills_introduced, 'last', last_bills_introduced),
                'concluded', json_build_object('current', curr_bills_concluded, 'last', last_bills_concluded)
            ),
            'motions', json_build_object(
                'introduced', json_build_object('current', curr_motions_introduced, 'last', last_motions_introduced),
                'concluded', json_build_object('current', curr_motions_concluded, 'last', last_motions_concluded)
            )
        ),
        'committees', COALESCE(committee_stats, '[]'::json)
    );

    RETURN result;
END;
$$;
