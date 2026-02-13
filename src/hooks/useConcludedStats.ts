import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { startOfMonth, endOfMonth } from "date-fns";

export const useConcludedStats = () => {
  return useQuery({
    queryKey: ["concluded-stats"],
    queryFn: async () => {
      const now = new Date();
      // Using local time for month boundaries
      const start = startOfMonth(now).toISOString();
      const end = endOfMonth(now).toISOString();

      try {
        // Query bills
        const { count: billsCount, error: billsError } = await supabase
          .from("bills")
          .select("id", { count: "exact", head: true })
          .eq("status", "concluded")
          .gte("concluded_at", start)
          .lte("concluded_at", end);

        if (billsError) console.error("Error fetching concluded bills:", billsError);

        // Query documents
        const { count: docsCount, error: docsError } = await supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("status", "concluded")
          .gte("concluded_at", start)
          .lte("concluded_at", end);

        if (docsError) console.error("Error fetching concluded docs:", docsError);

        return (billsCount || 0) + (docsCount || 0);

      } catch (e) {
        console.error("Failed to fetch concluded stats", e);
        return 0;
      }
    },
    // Refresh reasonably often but not on every focus
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
