import { useQuery, keepPreviousData, UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { Document, DocumentType, DocumentStatus } from "@/types/document.ts";

export interface DocumentFilters {
  type?: DocumentType;
  status?: DocumentStatus | "all";
  committee?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  startDate?: Date;
  endDate?: Date;
}

interface DbDocumentResult {
  id: string;
  title: string;
  committee: string;
  date_committed: string | null;
  created_at: string;
  pending_days: number | null;
  presentation_date: string;
  status: string;
  type: string;
  updated_at: string;
  days_allocated: number | null;
  current_countdown: number | null;
  extensions_count: number | null;
}

const mapDbToDocument = (data: DbDocumentResult): Document => ({
  id: data.id,
  title: data.title,
  committee: data.committee,
  dateCommitted: data.date_committed ? new Date(data.date_committed) : null,
  pendingDays: data.pending_days || 0,
  presentationDate: data.presentation_date ? new Date(data.presentation_date) : null,
  status: (data.status === "pending" && !data.presentation_date) ? "limbo" : data.status as DocumentStatus,
  type: data.type as DocumentType,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
  daysAllocated: data.days_allocated || 0,
  currentCountdown: data.current_countdown || 0,
  extensionsCount: data.extensions_count || 0
});

export const useDocumentList = (
  { type, status = "all", committee = "all", search = "", page = 1, pageSize = 10, startDate, endDate }: DocumentFilters,
  options?: Omit<UseQueryOptions<{ data: Document[]; count: number }>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: ["documents", { type, status, committee, search, page, pageSize, startDate, endDate }],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select("*", { count: "exact" });

      if (type) {
        query = query.eq("type", type);
      }

      if (status !== "all") {
        if (status === "limbo") {
            query = query.eq("status", "pending").is("presentation_date", null);
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

      if (search) {
        query = query.or(`title.ilike.%${search}%,committee.ilike.%${search}%`);
      }

      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to)
        .order("presentation_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data.map(mapDbToDocument),
        count: count || 0,
      };
    },
    placeholderData: keepPreviousData,
    ...options
  });
};

export const useDocumentStats = (type?: DocumentType) => {
  return useQuery({
    queryKey: ["documents-stats", { type }],
    queryFn: async () => {
      const getCount = async (status?: string, isLimbo: boolean = false) => {
        // Use 'id' selection instead of head:true to ensure reliable counting while minimizing data transfer
        // Also creates a fresh builder instance for each call to avoid any potential state reuse issues
        let query = supabase.from("documents").select("id", { count: "exact" });
        
        if (type) query = query.eq("type", type);
        
        if (status) query = query.eq("status", status);
        
        if (isLimbo) {
            query = query.is("presentation_date", null).eq("status", "pending");
        } else if (status === "pending") {
            query = query.not("presentation_date", "is", null);
        }
        
        const { count, error } = await query;
        if (error) {
            console.error(`Error fetching stats for ${type}/${status}:`, error);
            return 0;
        }
        return count || 0;
      };

      const [total, pending, concluded, overdue, frozen, underReview, limbo] = await Promise.all([
        getCount(), // total
        getCount("pending"), // pending (excluding limbo)
        getCount("concluded"),
        getCount("overdue"),
        getCount("frozen"),
        getCount("under_review"),
        getCount("pending", true), // limbo
      ]);

      return {
        total,
        pending,
        concluded,
        overdue,
        frozen,
        underReview,
        limbo,
      };
    },
  });
};
