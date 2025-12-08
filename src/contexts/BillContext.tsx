import React, { createContext, useState, useContext, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { migrateLocalStorageData } from "@/utils/dataMigration";
import { adjustForSittingDay, calculatePresentationDate } from "@/utils/documentUtils";
import { useNotifications } from "./NotificationContext";

// Define bill status type - Including frozen
export type BillStatus = "pending" | "concluded" | "overdue" | "frozen";

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
  addBill: (bill: Omit<Bill, "id" | "createdAt" | "updatedAt" | "status" | "presentationDate" | "daysAllocated" | "currentCountdown" | "extensionsCount">) => void;
  updateBill: (id: string, updates: Partial<Bill>) => void;
  updateBillStatus: (id: string, status: BillStatus) => void;
  rescheduleBill: (id: string, newDate: Date) => void;
  deleteBill: (id: string) => void;
  getBillById: (id: string) => Bill | undefined;
  searchBills: (query: string) => Bill[];
  filterBills: (filters: {
    year?: number;
    committee?: string;
    pendingDays?: number;
    status?: BillStatus;
  }) => Bill[];
}

// Create the context
const BillContext = createContext<BillContextType>({
  bills: [],
  pendingBills: [],
  concludedBills: [],
  addBill: () => { },
  updateBill: () => { },
  updateBillStatus: () => { },
  rescheduleBill: () => { },
  deleteBill: () => { },
  getBillById: () => undefined,
  searchBills: () => [],
  filterBills: () => []
});

// Custom hook for checking and freezing bills
const useFreezeCheck = (bills: Bill[], updateBillStatus: (id: string, status: BillStatus) => void, addNotification: (n: any) => void) => {
  useEffect(() => {
    const checkFreezeStatus = () => {
      bills.forEach(bill => {
        // If bill is pending or overdue and countdown is zero or less
        if ((bill.status === "pending" || bill.status === "overdue") && bill.currentCountdown <= 0) {
          // Skip if already frozen to avoid loops (though status check above handles it)

          // Update status to frozen
          updateBillStatus(bill.id, "frozen");

          // Trigger persistent notification
          addNotification({
            type: "action_required",
            title: "Bill Frozen",
            message: `"${bill.title}" has been frozen due to expired deadline.`,
            businessId: bill.id,
            businessType: "bill",
            businessTitle: bill.title
          });
        }
      });
    };

    // Check on mount and every minute
    checkFreezeStatus();
    const interval = setInterval(checkFreezeStatus, 60000);
    return () => clearInterval(interval);
  }, [bills, updateBillStatus, addNotification]);
};

// Bill provider component
export const BillProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const { addNotification } = useNotifications();

  // Initialize with mock data ...
  // (Original initialization logic remains same)
  useEffect(() => {
    // Run migration once on first load
    const migrated = localStorage.getItem("data_migrated_v1");
    if (!migrated) {
      migrateLocalStorageData();
      localStorage.setItem("data_migrated_v1", "true");
    }

    const storedBills = localStorage.getItem("bills");
    if (storedBills) {
      try {
        const parsedBills = JSON.parse(storedBills).map((bill: any) => ({
          ...bill,
          presentationDate: new Date(bill.presentationDate),
          dateCommitted: new Date(bill.dateCommitted || bill.createdAt),
          createdAt: new Date(bill.createdAt),
          updatedAt: new Date(bill.updatedAt),
          daysAllocated: bill.daysAllocated || bill.pendingDays || 0,
          currentCountdown: bill.currentCountdown !== undefined ? bill.currentCountdown : bill.pendingDays || 0,
          extensionsCount: bill.extensionsCount || 0
        }));
        setBills(parsedBills);
      } catch (error) {
        console.error("Error parsing stored bills:", error);
        setBills([]);
      }
    } else {
      setBills([]);
      localStorage.setItem("bills", JSON.stringify([]));
    }
  }, []);

  // Save bills to local storage whenever they change
  useEffect(() => {
    localStorage.setItem("bills", JSON.stringify(bills));
  }, [bills]);

  // Hook up the freeze checker
  // We need to be careful not to cause infinite loops if updateBillStatus updates 'bills' triggering this effect again
  // The 'updateBillStatus' function changes status, so 'bills' changes. 
  // But inside 'useFreezeCheck', we only act if status is NOT 'frozen'. 
  // Once it becomes 'frozen', the condition fails and we stop updating.
  // Ideally, we move this logic inside a dedicated effect in the provider or a separate hook.

  // Implemented inline here to avoid 'useFreezeCheck' hoisting issues if defined outside
  useEffect(() => {
    const checkFreezeStatus = () => {
      bills.forEach(bill => {
        if ((bill.status === "pending" || bill.status === "overdue") && bill.currentCountdown <= 0) {
          // We initiate the update. Since 'updateBillStatus' is in scope, we can call it.
          // However, calling 'updateBillStatus' will trigger a state update for 'bills'
          // which re-runs this effect.
          // BUT, the condition (bill.status === "pending" || "overdue") will be false next time.
          // So it converges.

          // Direct state update to avoid circular dependency on 'updateBillStatus' function reference if we used it in dependency array
          // But we can just use the function defined below.

          // We need to use the function that sets state.
          setBills(prevBills =>
            prevBills.map(b => {
              if (b.id === bill.id) {
                return { ...b, status: "frozen", updatedAt: new Date() };
              }
              return b;
            })
          );

          addNotification({
            type: "action_required",
            title: "Bill Frozen",
            message: `"${bill.title}" has been frozen due to expired deadline.`,
            businessId: bill.id,
            businessType: "bill",
            businessTitle: bill.title
          });

          toast({
            title: "Bill Frozen",
            description: `"${bill.title}" is now frozen.`,
            variant: "destructive"
          });
        }
      });
    };

    // Check purely on 'bills' change ensures we catch updates (like manual reschedule that might somehow result in 0 days? unlikely but possible)
    // Also runs on mount.
    checkFreezeStatus();

  }, [bills, addNotification]);


  // Filtered bills by status - include pending, overdue AND frozen
  const pendingBills = bills
    .filter(bill => bill.status === "pending" || bill.status === "overdue" || bill.status === "frozen")
    .sort((a, b) => a.presentationDate.getTime() - b.presentationDate.getTime());

  const concludedBills = bills
    .filter(bill => bill.status === "concluded")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  // Add new bill
  const addBill = (billData: Omit<Bill, "id" | "createdAt" | "updatedAt" | "status" | "presentationDate" | "daysAllocated" | "currentCountdown" | "extensionsCount">) => {
    const now = new Date();
    const presentationDate = calculatePresentationDate(billData.dateCommitted, billData.pendingDays);

    const newBill: Bill = {
      id: (bills.length + 1).toString(),
      ...billData,
      status: "pending",
      presentationDate,
      createdAt: now,
      updatedAt: now,
      daysAllocated: billData.pendingDays,
      currentCountdown: billData.pendingDays,
      extensionsCount: 0
    };

    setBills(prevBills => [...prevBills, newBill]);

    addNotification({
      type: "business_created",
      title: "Bill Created",
      message: `New bill "${newBill.title}" has been created.`,
      businessId: newBill.id,
      businessType: "bill",
      businessTitle: newBill.title
    });

    toast({
      title: "Bill added",
      description: `"${billData.title}" has been successfully added`,
    });
  };

  // Update bill
  const updateBill = (id: string, updates: Partial<Bill>) => {
    setBills(prevBills =>
      prevBills.map(bill => {
        if (bill.id === id) {
          const updated = { ...bill, ...updates, updatedAt: new Date() };

          if ((updates.dateCommitted || updates.pendingDays) && bill.status === "pending") {
            updated.presentationDate = calculatePresentationDate(
              updates.dateCommitted || bill.dateCommitted,
              updates.pendingDays || bill.pendingDays
            );
          }

          return updated;
        }
        return bill;
      })
    );

    toast({
      title: "Bill updated",
      description: `Bill has been successfully updated`,
    });
  };

  // Update bill status
  const updateBillStatus = (id: string, status: BillStatus) => {
    setBills(prevBills =>
      prevBills.map(bill => {
        if (bill.id === id) {
          return {
            ...bill,
            status,
            updatedAt: new Date()
          };
        }
        return bill;
      })
    );

    const statusMessages = {
      pending: "Bill has been marked as pending",
      concluded: "Bill has been marked as concluded",
      overdue: "Bill has been marked as overdue",
      frozen: "Bill has been marked as frozen",
    };

    toast({
      title: "Status updated",
      description: statusMessages[status] || "Status updated",
    });
  };

  // ... (rescheduleBill, deleteBill, searchBills, filterBills remain mostly same but filterBills needs update for 'frozen')

  // rescheduleBill logic remains same - it forces 'overdue' which is fine, 
  // but if new date implies it's still 0 days? 'rescheduleBill' calculates daysDiff.
  // If daysDiff <= 0, it currently sets 0. 
  // If it sets 0, our effect will catch it and freeze it again immediately.
  // A reschedule should presumably ADD time. 
  // If user reschedules to today (0 days), it freezes immediately. That's consistent.

  const rescheduleBill = (id: string, newDate: Date) => {
    setBills(prevBills =>
      prevBills.map(bill => {
        if (bill.id === id) {
          const adjustedDate = adjustForSittingDay(newDate);
          const now = new Date();
          const daysDiff = Math.ceil((adjustedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // If we reschedule, we likely want to reset status from 'frozen' to 'overdue' (as per prev logic) or 'pending'
          // The previous code set it to 'overdue' if daysDiff > 0? No, checking prev code:
          // pendingDays: daysDiff > 0 ? daysDiff : 0
          // status: "overdue"

          return {
            ...bill,
            presentationDate: adjustedDate,
            pendingDays: daysDiff > 0 ? daysDiff : 0,
            daysAllocated: bill.daysAllocated,
            currentCountdown: daysDiff,
            extensionsCount: bill.extensionsCount + 1,
            status: "overdue" as BillStatus,
            updatedAt: new Date()
          };
        }
        return bill;
      })
    );

    toast({
      title: "Bill rescheduled",
      description: `Bill has been rescheduled to ${format(newDate, "PPP")}`,
    });
  };

  const deleteBill = (id: string) => {
    setBills(prevBills => prevBills.filter(bill => bill.id !== id));
    toast({ title: "Bill deleted", description: "Bill has been successfully deleted" });
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
        addBill,
        updateBill,
        updateBillStatus,
        rescheduleBill,
        deleteBill,
        getBillById,
        searchBills,
        filterBills
      }}
    >
      {children}
    </BillContext.Provider>
  );
};

// Custom hook for accessing bill context
export const useBills = () => useContext(BillContext);
