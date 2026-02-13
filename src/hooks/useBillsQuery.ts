import { useQuery, keepPreviousData, UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { Bill, BillStatus } from "@/contexts/BillContext.tsx";

export interface BillFilters {
  status?: BillStatus | "all";
  committee?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  startDate?: Date;
  endDate?: Date;
}

// Helper to map DB result to App type
interface DbBillResult {
  id: string;
  title: string;
  committee: string;
  date_committed: string;
  created_at: string;
  pending_days: number;
  presentation_date: string;
  status: string;
  updated_at: string;
  days_allocated: number;
  current_countdown: number;
  extensions_count: number;
  [key: string]: unknown;
}

const mapDbToBill = (data: DbBillResult): Bill => ({
  id: data.id,
  title: data.title,
  committee: data.committee,
  dateCommitted: new Date(data.date_committed || data.created_at),
  pendingDays: data.pending_days || 0,
  presentationDate: new Date(data.presentation_date),
  status: data.status as BillStatus,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
  daysAllocated: data.days_allocated || 0,
  currentCountdown: data.current_countdown || 0,
  extensionsCount: data.extensions_count || 0
});

export const useBillList = (
  { status = "all", committee = "all", search = "", page = 1, pageSize = 10, startDate, endDate }: BillFilters,
  options?: Omit<UseQueryOptions<{ data: Bill[]; count: number }>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: ["bills", { status, committee, search, page, pageSize, startDate, endDate }],
    queryFn: async () => {
      let query = supabase
        .from("bills")
        .select("*", { count: "exact" });

      // Apply status filter
      if (status !== "all") {
        query = query.eq("status", status);
      }

      // Apply committee filter
      // If a specific committee is selected, we show items for that committee OR items assigned to "All Committees"
      if (committee && committee !== "all") {
        query = query.or(`committee.eq.${committee},committee.eq.All Committees`);
      }

      // Apply search filter
      if (search) {
        query = query.or(`title.ilike.%${search}%,committee.ilike.%${search}%`);
      }

      // Apply date range filter
      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }
      if (endDate) {
        // Set to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to).order("created_at", { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data.map(mapDbToBill),
        count: count || 0,
      };
    },
    placeholderData: keepPreviousData,
    ...options
  });
};

export const useBillStats = () => {
  return useQuery({
    queryKey: ["bills-stats"],
    queryFn: async () => {
      // Parallel requests for counts to be super fast
      // Or we could do one query and group by, but Supabase API for group-by count is tricky via JS client
      // straightforward method:
      const [all, pending, concluded, overdue, frozen, underReview] = await Promise.all([
        supabase.from("bills").select("*", { count: "exact", head: true }),
        supabase.from("bills").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("bills").select("*", { count: "exact", head: true }).eq("status", "concluded"),
        supabase.from("bills").select("*", { count: "exact", head: true }).eq("status", "overdue"),
        supabase.from("bills").select("*", { count: "exact", head: true }).eq("status", "frozen"),
        supabase.from("bills").select("*", { count: "exact", head: true }).eq("status", "under_review"),
      ]);

      return {
        total: all.count || 0,
        pending: pending.count || 0,
        concluded: concluded.count || 0,
        overdue: overdue.count || 0,
        frozen: frozen.count || 0,
        underReview: underReview.count || 0,
      };
    },
  });
};
