import React, { createContext, useState, useContext, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { migrateLocalStorageData } from "@/utils/dataMigration";
import { adjustForSittingDay, calculatePresentationDate } from "@/utils/documentUtils";

// Define bill status type - Including overdue status
export type BillStatus = "pending" | "concluded" | "overdue";

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

// Bill provider component
export const BillProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bills, setBills] = useState<Bill[]>([]);

  // Initialize with mock data
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
        // Parse stored bills and convert date strings back to Date objects
        const parsedBills = JSON.parse(storedBills).map((bill: any) => ({
          ...bill,
          presentationDate: new Date(bill.presentationDate),
          dateCommitted: new Date(bill.dateCommitted || bill.createdAt),
          createdAt: new Date(bill.createdAt),
          updatedAt: new Date(bill.updatedAt),
          // Ensure new fields exist with defaults for backward compatibility
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
      // Initialize with empty array instead of mock data
      setBills([]);
      localStorage.setItem("bills", JSON.stringify([]));
    }
  }, []);

  // Save bills to local storage whenever they change
  useEffect(() => {
    // Always save bills, even if empty array
    localStorage.setItem("bills", JSON.stringify(bills));
  }, [bills]);

  // Filtered bills by status - include both pending and overdue
  const pendingBills = bills
    .filter(bill => bill.status === "pending" || bill.status === "overdue")
    .sort((a, b) => a.presentationDate.getTime() - b.presentationDate.getTime()); // Sort by date (soonest first)

  const concludedBills = bills
    .filter(bill => bill.status === "concluded")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()); // Sort by update date (newest first)

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

          // Recalculate presentation date if needed
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
    };

    toast({
      title: "Status updated",
      description: statusMessages[status] || "Status updated",
    });
  };

  // Add reschedule bill function
  const rescheduleBill = (id: string, newDate: Date) => {
    setBills(prevBills =>
      prevBills.map(bill => {
        if (bill.id === id) {
          // Adjust the new date for sitting days
          const adjustedDate = adjustForSittingDay(newDate);

          // Calculate new pending days relative to now
          const now = new Date();
          const daysDiff = Math.ceil((adjustedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

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

  // Delete bill function
  const deleteBill = (id: string) => {
    setBills(prevBills => prevBills.filter(bill => bill.id !== id));

    toast({
      title: "Bill deleted",
      description: "Bill has been successfully deleted",
    });
  };

  // Get bill by ID
  const getBillById = (id: string) => {
    return bills.find(bill => bill.id === id);
  };

  // Search bills
  const searchBills = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return bills.filter(
      bill =>
        bill.title.toLowerCase().includes(lowercaseQuery) ||
        bill.committee.toLowerCase().includes(lowercaseQuery)
    );
  };

  // Filter bills
  const filterBills = (filters: {
    year?: number;
    committee?: string;
    pendingDays?: number;
    status?: BillStatus;
  }) => {
    return bills.filter(bill => {
      // Filter by year if specified
      if (filters.year && bill.presentationDate.getFullYear() !== filters.year) {
        return false;
      }

      // Filter by committee if specified
      if (filters.committee && bill.committee !== filters.committee) {
        return false;
      }

      // Filter by pending days if specified
      if (filters.pendingDays && bill.pendingDays !== filters.pendingDays) {
        return false;
      }

      // Filter by status if specified
      if (filters.status && bill.status !== filters.status) {
        return false;
      }

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
