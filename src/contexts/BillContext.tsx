import React, { createContext, useState, useContext, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { addDays, isSaturday, isSunday, format } from "date-fns";

// Define bill status type - Including overdue status
export type BillStatus = "pending" | "concluded" | "overdue";

// Define bill interface
export interface Bill {
  id: string;
  title: string;
  committee: string; // Changed from 'department'
  dateCommitted: Date; // Added dateCommitted field
  pendingDays: number; // This is now days allocated
  presentationDate: Date; // This becomes the "date due"
  status: BillStatus;
  createdAt: Date;
  updatedAt: Date;
  // New fields for enhanced tracking
  days_allocated?: number;
  overdue_days?: number;
  date_laid?: string;
}

// Define bill context type
interface BillContextType {
  bills: Bill[];
  pendingBills: Bill[];
  concludedBills: Bill[];
  addBill: (bill: Omit<Bill, "id" | "createdAt" | "updatedAt" | "status" | "presentationDate">) => void;
  updateBill: (id: string, updates: Partial<Bill>) => void;
  updateBillStatus: (id: string, status: BillStatus) => void;
  rescheduleBill: (id: string, additionalDays: number) => void;
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

// Import the sitting day utilities
import { adjustForSittingDay, calculatePresentationDate, adjustForWeekend } from "@/utils/documentUtils";

// Generate mock data
const generateMockBills = (): Bill[] => {
  const committees = ["Agriculture", "Education", "Finance", "Health", "Transportation"];
  
  const now = new Date();
  
  return Array(15).fill(null).map((_, index) => {
    const id = (index + 1).toString();
    const committee = committees[index % committees.length];
    const createdAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within the last 30 days
    const pendingDays = Math.floor(Math.random() * 20) + 5; // 5-25 days
    const dateCommitted = new Date(createdAt);
    
    let presentationDate: Date;
    let status: BillStatus;
    
    // Distribute bills across different statuses
    if (index < 10) { // Pending bills
      presentationDate = calculatePresentationDate(dateCommitted, pendingDays);
      status = "pending";
    } else { // Concluded bills
      presentationDate = new Date(dateCommitted.getTime() - (Math.random() * 10 + 1) * 24 * 60 * 60 * 1000); // Date in the past
      status = "concluded";
    }
    
    return {
      id,
      title: `Bill ${id} - ${committee} Reform Act`,
      committee,
      dateCommitted,
      pendingDays,
      presentationDate,
      status,
      createdAt,
      updatedAt: new Date(createdAt.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000) // 0-5 days after creation
    };
  });
};

// Create the context
const BillContext = createContext<BillContextType>({
  bills: [],
  pendingBills: [],
  concludedBills: [],
  addBill: () => {},
  updateBill: () => {},
  updateBillStatus: () => {},
  rescheduleBill: () => {},
  deleteBill: () => {},
  getBillById: () => undefined,
  searchBills: () => [],
  filterBills: () => []
});

// Bill provider component
export const BillProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bills, setBills] = useState<Bill[]>([]);

  // Initialize with mock data
  useEffect(() => {
    const storedBills = localStorage.getItem("bills");
    if (storedBills) {
      // Parse stored bills and convert date strings back to Date objects
      const parsedBills = JSON.parse(storedBills).map((bill: any) => ({
        ...bill,
        presentationDate: new Date(bill.presentationDate),
        dateCommitted: new Date(bill.dateCommitted || bill.createdAt), // Fallback for older data
        createdAt: new Date(bill.createdAt),
        updatedAt: new Date(bill.updatedAt)
      }));
      setBills(parsedBills);
    } else {
      const mockBills = generateMockBills();
      setBills(mockBills);
      localStorage.setItem("bills", JSON.stringify(mockBills));
    }
  }, []);

  // Save bills to local storage whenever they change
  useEffect(() => {
    if (bills.length > 0) {
      localStorage.setItem("bills", JSON.stringify(bills));
    }
  }, [bills]);

  // Filtered bills by status
  const pendingBills = bills
    .filter(bill => bill.status === "pending")
    .sort((a, b) => a.presentationDate.getTime() - b.presentationDate.getTime()); // Sort by date (soonest first)

  const concludedBills = bills
    .filter(bill => bill.status === "concluded")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()); // Sort by update date (newest first)

  // Add new bill
  const addBill = (billData: Omit<Bill, "id" | "createdAt" | "updatedAt" | "status" | "presentationDate">) => {
    const now = new Date();
    const presentationDate = calculatePresentationDate(billData.dateCommitted, billData.pendingDays);
    
    const newBill: Bill = {
      id: (bills.length + 1).toString(),
      ...billData,
      status: "pending",
      presentationDate,
      createdAt: now,
      updatedAt: now
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
    };
    
    toast({
      title: "Status updated",
      description: statusMessages[status],
    });
  };

  // Add reschedule bill function
  const rescheduleBill = (id: string, additionalDays: number) => {
    setBills(prevBills =>
      prevBills.map(bill => {
        if (bill.id === id && bill.status === "pending") {
          const newPresentationDate = addDays(bill.presentationDate, additionalDays);
          const adjustedDate = adjustForSittingDay(newPresentationDate);
          
          return {
            ...bill,
            presentationDate: adjustedDate,
            pendingDays: bill.pendingDays + additionalDays,
            updatedAt: new Date()
          };
        }
        return bill;
      })
    );
    
    toast({
      title: "Bill rescheduled",
      description: `Bill has been rescheduled by ${additionalDays} days`,
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
