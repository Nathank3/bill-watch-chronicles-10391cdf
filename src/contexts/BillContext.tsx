
import React, { createContext, useState, useContext, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";

// Define bill status type
export type BillStatus = "pending" | "passed" | "rejected" | "rescheduled";

// Define bill interface
export interface Bill {
  id: string;
  title: string;
  mca: string;
  department: string;
  presentationDate: Date;
  status: BillStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Define bill context type
interface BillContextType {
  bills: Bill[];
  pendingBills: Bill[];
  passedBills: Bill[];
  rejectedBills: Bill[];
  addBill: (bill: Omit<Bill, "id" | "createdAt" | "updatedAt" | "status">) => void;
  updateBill: (id: string, updates: Partial<Bill>) => void;
  updateBillStatus: (id: string, status: BillStatus, newDate?: Date) => void;
  getBillById: (id: string) => Bill | undefined;
  searchBills: (query: string) => Bill[];
  filterBills: (filters: {
    year?: number;
    department?: string;
    mca?: string;
    status?: BillStatus;
  }) => Bill[];
}

// Generate mock data
const generateMockBills = (): Bill[] => {
  const departments = ["Health", "Education", "Finance", "Transportation", "Agriculture"];
  const mcaNames = ["John Doe", "Jane Smith", "Robert Johnson", "Emily Davis", "Michael Wilson"];
  
  const now = new Date();
  
  return Array(15).fill(null).map((_, index) => {
    const id = (index + 1).toString();
    const createdAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within the last 30 days
    
    let presentationDate: Date;
    let status: BillStatus;
    
    // Distribute bills across different statuses
    if (index < 8) { // Pending bills with future dates
      presentationDate = new Date(now.getTime() + (Math.random() * 14 + 1) * 24 * 60 * 60 * 1000); // 1-15 days in future
      status = "pending";
    } else if (index < 11) { // Passed bills
      presentationDate = new Date(now.getTime() - (Math.random() * 10 + 1) * 24 * 60 * 60 * 1000); // 1-10 days in past
      status = "passed";
    } else if (index < 14) { // Rejected bills
      presentationDate = new Date(now.getTime() - (Math.random() * 10 + 1) * 24 * 60 * 60 * 1000); // 1-10 days in past
      status = "rejected";
    } else { // Rescheduled bill
      presentationDate = new Date(now.getTime() + (Math.random() * 7 + 1) * 24 * 60 * 60 * 1000); // 1-7 days in future
      status = "rescheduled";
    }
    
    return {
      id,
      title: `Bill ${id} - ${departments[index % departments.length]} Reform Act`,
      mca: mcaNames[index % mcaNames.length],
      department: departments[index % departments.length],
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
  passedBills: [],
  rejectedBills: [],
  addBill: () => {},
  updateBill: () => {},
  updateBillStatus: () => {},
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
    .filter(bill => bill.status === "pending" || bill.status === "rescheduled")
    .sort((a, b) => a.presentationDate.getTime() - b.presentationDate.getTime()); // Sort by date (soonest first)

  const passedBills = bills
    .filter(bill => bill.status === "passed")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()); // Sort by update date (newest first)

  const rejectedBills = bills
    .filter(bill => bill.status === "rejected")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()); // Sort by update date (newest first)

  // Add new bill
  const addBill = (billData: Omit<Bill, "id" | "createdAt" | "updatedAt" | "status">) => {
    const now = new Date();
    const newBill: Bill = {
      id: (bills.length + 1).toString(),
      ...billData,
      status: "pending",
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
      prevBills.map(bill =>
        bill.id === id
          ? { ...bill, ...updates, updatedAt: new Date() }
          : bill
      )
    );
    
    toast({
      title: "Bill updated",
      description: `Bill has been successfully updated`,
    });
  };

  // Update bill status
  const updateBillStatus = (id: string, status: BillStatus, newDate?: Date) => {
    setBills(prevBills =>
      prevBills.map(bill => {
        if (bill.id === id) {
          const updatedBill = {
            ...bill,
            status,
            updatedAt: new Date()
          };
          
          // If rescheduled, update presentation date
          if (status === "rescheduled" && newDate) {
            updatedBill.presentationDate = newDate;
          }
          
          return updatedBill;
        }
        return bill;
      })
    );
    
    const statusMessages = {
      passed: "Bill has been marked as passed",
      rejected: "Bill has been marked as rejected",
      rescheduled: "Bill has been rescheduled",
      pending: "Bill status has been reset to pending"
    };
    
    toast({
      title: "Status updated",
      description: statusMessages[status],
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
        bill.mca.toLowerCase().includes(lowercaseQuery) ||
        bill.department.toLowerCase().includes(lowercaseQuery)
    );
  };

  // Filter bills
  const filterBills = (filters: {
    year?: number;
    department?: string;
    mca?: string;
    status?: BillStatus;
  }) => {
    return bills.filter(bill => {
      // Filter by year if specified
      if (filters.year && bill.presentationDate.getFullYear() !== filters.year) {
        return false;
      }

      // Filter by department if specified
      if (filters.department && bill.department !== filters.department) {
        return false;
      }

      // Filter by MCA if specified
      if (filters.mca && bill.mca !== filters.mca) {
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
        passedBills,
        rejectedBills,
        addBill,
        updateBill,
        updateBillStatus,
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
