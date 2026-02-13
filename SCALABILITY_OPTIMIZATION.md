/*

- SCALABILITY OPTIMIZATION GUIDE
- ==============================
-
- As your database grows beyond 5,000 records, calculating statistics in the
  React client
- (using useBillStats) will become slow and consume too much memory.
-
- To fix this, you should move the calculation logic to the Database (Supabase).
-
- INSTRUCTIONS:
-
  1. Log in to your Supabase Dashboard.
-
  2. Go to the "SQL Editor" tab.
-
  3. Create a new query.
-
  4. Paste the SQL code below and run it.
-
  5. This creates a "Remote Procedure Call" (RPC) that the frontend can call
     instantly. */

-- 1. Create a function to get dashboard stats efficiently CREATE OR REPLACE
FUNCTION get_dashboard_stats() RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS
$$ DECLARE result json; BEGIN SELECT json_build_object( 'total', (SELECT
count(_) FROM bills), 'pending', (SELECT count(_) FROM bills WHERE status =
'pending' AND presentation_date IS NOT NULL), 'concluded', (SELECT count(_) FROM
bills WHERE status = 'concluded'), 'overdue', ( SELECT count(_) FROM bills WHERE
status = 'overdue' OR (status = 'pending' AND presentation_date < NOW()) OR
extensions_count > 0 ), 'tbd', (SELECT count(*) FROM bills WHERE status = 'tbd'
OR (status = 'pending' AND presentation_date IS NULL)) ) INTO result;

    RETURN result;

END; $$;

/*

- HOW TO USE IN FRONTEND:
-
- Replace the logic in `useBillsQuery.ts` (useBillStats) with:
-
- const { data, error } = await supabase.rpc('get_dashboard_stats');
-
- This reduces data transfer from ~5MB (all bills) to ~200 bytes (just the
  numbers). */
