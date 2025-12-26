import React, { createContext, useState, useContext, useEffect } from "react";
import { toast } from "@/components/ui/use-toast.ts";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client.ts";
import { adjustForSittingDay, calculatePresentationDate } from "@/utils/documentUtils.ts";
import { calculateCurrentCountdown } from "@/utils/countdownUtils.ts";
import { useNotifications } from "./NotificationContext.tsx";
import { useAuth } from "./AuthContext.tsx";

// Define bill status type - Including frozen
export type BillStatus = "pending" | "concluded" | "overdue" | "frozen" | "under_review";

// Define bill interface
export interface Bill {
  id: string;
  title: string;
  committee: string;
  dateCommitted: Date;
  pendingDays: number;
  presentationDate: Date;
  status: BillStatus;
  createdAt: Date;
  updatedAt: Date;
  daysAllocated: number; // Total cumulative days in the house
  currentCountdown: number; // Current countdown value (always decreasing)
  extensionsCount: number; // Number of times extended
}

// Define bill context type
interface BillContextType {
  bills: Bill[];
  pendingBills: Bill[];
  concludedBills: Bill[];
  underReviewBills: Bill[];
  addBill: (bill: Omit<Bill, "id" | "createdAt" | "updatedAt" | "status" | "presentationDate" | "daysAllocated" | "currentCountdown" | "extensionsCount">) => Promise<void>;
  updateBill: (id: string, updates: Partial<Bill>) => Promise<void>;
  updateBillStatus: (id: string, status: BillStatus, silent?: boolean) => Promise<void>;
  approveBill: (id: string) => Promise<void>;
  rejectBill: (id: string) => Promise<void>;
  rescheduleBill: (id: string, newDate: Date) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  getBillById: (id: string) => Bill | undefined;
  searchBills: (query: string) => Bill[];
  filterBills: (filters: {
    year?: number;
    committee?: string;
    pendingDays?: number;
    status?: BillStatus;
  }) => Bill[];
  isLoading: boolean;
}

// Create the context
const BillContext = createContext<BillContextType>({
  bills: [],
  pendingBills: [],
  concludedBills: [],
  underReviewBills: [],
  addBill: async () => { },
  updateBill: async () => { },
  updateBillStatus: async () => { },
  approveBill: async () => { },
  rejectBill: async () => { },
  rescheduleBill: async () => { },
  deleteBill: async () => { },
  getBillById: () => undefined,
  searchBills: () => [],
  filterBills: () => [],
  isLoading: true
});

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

// Bill provider component
export const BillProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addNotification, clearBusinessNotifications } = useNotifications();
  const { isAdmin } = useAuth();

  // Fetch bills from Supabase
  const fetchBills = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setBills(data.map(mapDbToBill));
      }
    } catch (error) {
      console.error("Error fetching bills:", error);
      toast({
        title: "Error fetching bills",
        description: "Could not load bills from the database.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchBills();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills'
        },
        () => {
          fetchBills();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Hook up the freeze checker (simplified to run locally on fetched data for notifications)
  useEffect(() => {
    const checkFreezeStatus = () => {
      bills.forEach((bill) => {
        const countdown = calculateCurrentCountdown(bill.presentationDate);

        if ((bill.status === "pending" || bill.status === "overdue") && countdown <= 0) {
          updateBillStatus(bill.id, "frozen", true).then(() => {
            addNotification({
              type: "action_required",
              title: "Bill Frozen",
              message: `"${bill.title}" has been frozen due to expired deadline.`,
              businessId: bill.id,
              businessType: "bill",
              businessTitle: bill.title
            });
          }).catch(() => {
            // Even if RLS blocks the DB update, we still want the persistent notification
            // for the local user if they are the one seeing it frozen.
            addNotification({
              type: "action_required",
              title: "Bill Frozen",
              message: `"${bill.title}" has been frozen due to expired deadline.`,
              businessId: bill.id,
              businessType: "bill",
              businessTitle: bill.title
            });
          });
        } else if (bill.status === "concluded" || (bill.status === "pending" && countdown > 0)) {
          // If it was fixed, clear the frozen notification
          clearBusinessNotifications(bill.id);
        }
      });
    };
    
    // Check immediately
    checkFreezeStatus();
    
    // Check periodically
    const interval = setInterval(checkFreezeStatus, 60000); // Every minute
    return () => clearInterval(interval);
  }, [bills, addNotification]);

  // Filtered bills getters
  const pendingBills = bills
    .filter(bill => bill.status === "pending" || bill.status === "overdue" || bill.status === "frozen")
    .sort((a, b) => a.presentationDate.getTime() - b.presentationDate.getTime());

  const concludedBills = bills
    .filter(bill => bill.status === "concluded")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const underReviewBills = bills
    .filter(bill => bill.status === "under_review")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Add new bill
  const addBill = async (billData: Omit<Bill, "id" | "createdAt" | "updatedAt" | "status" | "presentationDate" | "daysAllocated" | "currentCountdown" | "extensionsCount">) => {

    const presentationDate = calculatePresentationDate(billData.dateCommitted, billData.pendingDays);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to add a bill.",
        variant: "destructive"
      });
      throw new Error("User not authenticated");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newBill = {
      title: billData.title,
      committee: billData.committee,
      date_committed: billData.dateCommitted.toISOString(),
      pending_days: billData.pendingDays,
      status: isAdmin ? "pending" : "under_review",
      presentation_date: presentationDate.toISOString(),
      days_allocated: billData.pendingDays,
      current_countdown: billData.pendingDays,
      extensions_count: 0,
      created_by: user.id, 
      department: "Legal", // Default value as it's required
      mca: "System" // Default value as it's required
    };

    try {
      const { error } = await supabase.from('bills').insert(newBill);
      if (error) throw error;

      // Notification is handled by realtime subscription or manual refetch, 
      // but we can show immediate feedback toast
      toast({
        title: isAdmin ? "Bill published" : "Bill submitted for review",
        description: isAdmin 
          ? `"${billData.title}" has been successfully added` 
          : `"${billData.title}" is now under review by an admin.`,
      });
      
      // Also send notification explicitly if needed, but the Subscription handles data refresh
      addNotification({
        type: "business_created",
        title: "Bill Created",
        message: `New bill "${billData.title}" has been created.`,
        businessId: "pending", // ID not available yet without return
        businessType: "bill",
        businessTitle: billData.title
      });

    } catch (error) {
      console.error("Error adding bill:", error);
      toast({
        title: "Error adding bill",
        description: "Could not save to database.",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Update bill
  const updateBill = async (id: string, updates: Partial<Bill>) => {
    try {
      // Map frontend updates to DB columns
      const dbUpdates: Record<string, string | number | undefined> = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.committee) dbUpdates.committee = updates.committee;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.dateCommitted) dbUpdates.date_committed = updates.dateCommitted.toISOString();
      if (updates.pendingDays !== undefined) dbUpdates.pending_days = updates.pendingDays;
      if (updates.presentationDate) dbUpdates.presentation_date = updates.presentationDate.toISOString();
      if (updates.daysAllocated !== undefined) dbUpdates.days_allocated = updates.daysAllocated;
      if (updates.currentCountdown !== undefined) dbUpdates.current_countdown = updates.currentCountdown;
      if (updates.extensionsCount !== undefined) dbUpdates.extensions_count = updates.extensionsCount;

      // Specialized logic from original context: if dates changed, recalc presentation date
      const currentBill = bills.find(b => b.id === id);
      if (currentBill && (updates.dateCommitted || updates.pendingDays) && currentBill.status === "pending") {
        const newDate = calculatePresentationDate(
          updates.dateCommitted || currentBill.dateCommitted,
          updates.pendingDays || currentBill.pendingDays
        );
        dbUpdates.presentation_date = newDate.toISOString();
      }

      const { error } = await supabase
        .from('bills')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Bill updated",
        description: `Bill has been successfully updated`,
      });
    } catch (error) {
      console.error("Error updating bill:", error);
      toast({
        title: "Error updating bill",
        description: "Could not update the database.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const approveBill = async (id: string) => {
    // Check if item exists and status is actually under_review to avoid redundant updates?
    // For now simplistic approach is fine
    await updateBillStatus(id, "pending");
    toast({ title: "Bill Approved", description: "Bill has been published successfully." });
  };

  const rejectBill = async (id: string) => {
    await deleteBill(id);
    toast({ title: "Bill Rejected", description: "Bill has been rejected and removed." });
  };

  // Update bill status
  const updateBillStatus = async (id: string, status: BillStatus, silent: boolean = false) => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.warn(`Update status yielded NO matched rows for ${id}. This might be due to RLS policies.`);
      }

      // If status is changed away from frozen/overdue, clear notifications
      if (status === "concluded" || status === "pending") {
        clearBusinessNotifications(id);
      }

      const statusMessages = {
        pending: "Bill has been marked as pending",
        concluded: "Bill has been marked as concluded",
        overdue: "Bill has been marked as overdue",
        frozen: "Bill has been marked as frozen"
      };

      toast({
        title: "Status updated",
        description: statusMessages[status] || "Status updated",
      });
    } catch (error) {
      console.error("Error updating status:", error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Could not update status.",
          variant: "destructive"
        });
      }
      throw error;
    }
  };

  const rescheduleBill = async (id: string, newDate: Date) => {
    try {
      const bill = bills.find(b => b.id === id);
      if (!bill) return;

      const adjustedDate = adjustForSittingDay(newDate);
      const now = new Date();
      const daysDiff = Math.ceil((adjustedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const { error } = await supabase
        .from('bills')
        .update({
          presentation_date: adjustedDate.toISOString(),
          pending_days: daysDiff > 0 ? daysDiff : 0,
          current_countdown: daysDiff,
          extensions_count: bill.extensionsCount + 1,
          status: "overdue",
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Clear notifications on reschedule (it's no longer frozen)
      clearBusinessNotifications(id);

      toast({
        title: "Bill rescheduled",
        description: `Bill has been rescheduled to ${format(newDate, "PPP")}`,
      });
    } catch (error) {
      console.error("Error rescheduling bill:", error);
      toast({
        title: "Error",
        description: "Could not reschedule bill.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteBill = async (id: string) => {
    try {
      const { error } = await supabase.from('bills').delete().eq('id', id);
      if (error) throw error;

      // Update local state immediately
      setBills(prev => prev.filter(bill => bill.id !== id));

      toast({ title: "Bill deleted", description: "Bill has been successfully deleted" });
    } catch (error) {
      console.error("Error deleting bill:", error);
      toast({ title: "Error", description: "Could not delete bill.", variant: "destructive" });
      throw error;
    }
  };

  const getBillById = (id: string) => bills.find(bill => bill.id === id);
  const searchBills = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return bills.filter(
      bill =>
        bill.title.toLowerCase().includes(lowercaseQuery) ||
        bill.committee.toLowerCase().includes(lowercaseQuery)
    );
  };

  const filterBills = (filters: {
    year?: number;
    committee?: string;
    pendingDays?: number;
    status?: BillStatus;
  }) => {
    return bills.filter(bill => {
      if (filters.year && bill.presentationDate.getFullYear() !== filters.year) return false;
      if (filters.committee && bill.committee !== filters.committee) return false;
      if (filters.pendingDays && bill.pendingDays !== filters.pendingDays) return false;
      if (filters.status && bill.status !== filters.status) return false;
      return true;
    });
  };

  return (
    <BillContext.Provider
      value={{
        bills,
        pendingBills,
        concludedBills,
        underReviewBills,
        addBill,
        updateBill,
        updateBillStatus,
        approveBill,
        rejectBill,
        rescheduleBill,
        deleteBill,
        getBillById,
        searchBills,
        filterBills,
        isLoading
      }}
    >
      {children}
    </BillContext.Provider>
  );
};

// Custom hook for accessing bill context
export const useBills = () => useContext(BillContext);
