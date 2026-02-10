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
  status: (data.status === "pending" && !data.presentation_date) ? "tbd" : data.status as DocumentStatus,
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
        if (status === "limbo" as DocumentStatus) {
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
      const now = new Date();
      
      let query = supabase
        .from("documents")
        .select("id, status, type, presentation_date, extensions_count, created_at");
        
      if (type) {
        query = query.eq("type", type);
      }
      
      const { data: docs, error } = await query;
      
      if (error) {
        console.error(`Error fetching stats for ${type}:`, error);
        throw error;
      };

      const stats = {
        total: 0,
        pending: 0,
        concluded: 0,
        overdue: 0,
        frozen: 0,
        underReview: 0,
        limbo: 0,
        tbd: 0,
      };

      if (!docs) return stats;

      stats.total = docs.length;

      docs.forEach((doc) => {
        // Normalize status
        const status = doc.status as string;
        
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
            return;
        }

        // Check for TBD/Limbo
        if (status === "limbo" || status === "tbd" || (status === "pending" && !doc.presentation_date)) {
            stats.tbd++;
            // stats.limbo++; // Removed to prevent double counting
            return;
        }

        // Check for Overdue
        let isOverdue = false;
        if (status === "overdue") {
            isOverdue = true;
        } else if (doc.presentation_date) {
            const presDate = new Date(doc.presentation_date);
            if (presDate < now) isOverdue = true;
        }
        
        if (doc.extensions_count && doc.extensions_count > 0) isOverdue = true;

        if (isOverdue) {
            stats.overdue++;
        } else {
            stats.pending++;
        }
      });

      return stats;
    },
  });
};
