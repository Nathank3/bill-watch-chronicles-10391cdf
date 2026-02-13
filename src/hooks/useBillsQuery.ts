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
  concluded_at?: string | null;
  [key: string]: unknown;
}

const mapDbToBill = (data: DbBillResult): Bill => ({
  id: data.id,
  title: data.title,
  committee: data.committee,
  dateCommitted: data.date_committed ? new Date(data.date_committed) : null,
  pendingDays: data.pending_days || 0,
  presentationDate: data.presentation_date ? new Date(data.presentation_date) : null,
  status: (data.status === "pending" && !data.presentation_date) ? "tbd" : data.status as BillStatus,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
  daysAllocated: data.days_allocated || 0,
  currentCountdown: data.current_countdown || 0,
  extensionsCount: data.extensions_count || 0,
  concludedAt: data.concluded_at ? new Date(data.concluded_at) : null
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
        if (status === "limbo" as BillStatus || status === "tbd" as BillStatus) {
            query = query.or("status.eq.tbd,status.eq.limbo,and(status.eq.pending,presentation_date.is.null)");
        } else if (status === "pending") {
            query = query.eq("status", "pending").not("presentation_date", "is", null);
        } else {
            query = query.eq("status", status);
        }
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
      query = query.range(from, to)
        .order("presentation_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data.map(mapDbToBill),
        count: count || 0,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // Data considered fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Garbage collection time: 5 minutes
    ...options
  });
};

export const useBillStats = () => {
  return useQuery({
    queryKey: ["bills-stats"],
    queryFn: async () => {
      const now = new Date();
      
      // Fetch all bills to classify them correctly in memory
      // We need date info to calculate overdue status dynamically
      const { data: bills, error } = await supabase
        .from("bills")
        .select("id, status, presentation_date, extensions_count, created_at");

      if (error) throw error;

      const stats = {
        total: 0,
        pending: 0,
        concluded: 0,
        overdue: 0,
        frozen: 0, // Keeping for type compatibility, though removed from UI
        underReview: 0,
        limbo: 0, // Keeping for type compatibility
        tbd: 0,
      };

      if (!bills) return stats;

      stats.total = bills.length;

      bills.forEach((bill) => {
        // Normalize status
        const status = bill.status as string;
        
        if (status === "concluded") {
          stats.concluded++;
          return;
        }

        if (status === "under_review") {
            stats.underReview++;
            return;
        }

        if (status === "frozen") {
            stats.frozen++;
            // Frozen items are technically pending/stuck
            return;
        }

        // Check for TBD/Limbo
        // Logic: Status is limbo/tbd OR (pending and no presentation date)
        if (status === "limbo" || status === "tbd" || (status === "pending" && !bill.presentation_date)) {
            stats.tbd++;
            // stats.limbo++; // Removed to prevent double counting in Overview
            return;
        }

        // Check for Overdue
        // Logic: Status is overdue OR (pending and past date) OR extensions > 0
        let isOverdue = false;
        if (status === "overdue") {
            isOverdue = true;
        } else if (bill.presentation_date) {
            const presDate = new Date(bill.presentation_date);
            // reset time part for accurate day comparison if needed, but simple comparison works for now
            if (presDate < now) isOverdue = true;
        }
        
        if (bill.extensions_count > 0) isOverdue = true;

        if (isOverdue) {
            stats.overdue++;
        } else {
            // If not concluded, not tbd, not overdue, it's a normal pending bill
            stats.pending++;
        }
      });

      return stats;
    },
    staleTime: 3 * 60 * 1000, // Stats fresh for 3 minutes
    gcTime: 10 * 60 * 1000, // Garbage collection time: 10 minutes
  });
};
