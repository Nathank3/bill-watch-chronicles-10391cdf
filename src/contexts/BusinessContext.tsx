import React, { createContext, useState, useContext, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { Business, BusinessContextType, BusinessType, BusinessStatus, Committee } from "@/types/business";
import { calculatePresentationDate, calculatePendingDays } from "@/utils/documentUtils";
import { addDays } from "date-fns";

// Generate mock committees
const generateMockCommittees = (): Committee[] => {
  const names = ["Agriculture", "Education", "Finance", "Health", "Transportation", "Justice", "Environment", "Trade"];
  
  return names.map((name, index) => ({
    id: (index + 1).toString(),
    name,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
};

// Generate mock businesses
const generateMockBusinesses = (): Business[] => {
  const committees = ["Agriculture", "Education", "Finance", "Health", "Transportation"];
  const types: BusinessType[] = ["bill", "statement", "report", "regulation", "policy", "petition"];
  
  const now = new Date();
  
  return Array(20).fill(null).map((_, index) => {
    const id = (index + 1).toString();
    const committee = committees[index % committees.length];
    const type = types[index % types.length];
    const createdAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const daysAllocated = Math.floor(Math.random() * 20) + 5; // 5-25 days
    const dateCommitted = new Date(createdAt);
    
    let presentationDate: Date;
    let status: BusinessStatus;
    let overduedays = 0;
    
    // Distribute businesses across different statuses
    if (index < 12) { // Pending businesses
      presentationDate = calculatePresentationDate(dateCommitted, daysAllocated);
      status = "pending";
      
      // Some businesses might be overdue
      if (index < 3 && presentationDate < now) {
        status = "overdue";
        overduedays = Math.floor((now.getTime() - presentationDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    } else { // Passed businesses
      presentationDate = new Date(dateCommitted.getTime() - (Math.random() * 10 + 1) * 24 * 60 * 60 * 1000);
      status = "passed";
    }
    
    const pendingDays = calculatePendingDays(presentationDate);
    
    return {
      id,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} ${id} - ${committee} Reform`,
      committee,
      dateCommitted,
      daysAllocated,
      pendingDays,
      presentationDate,
      status,
      type,
      overduedays,
      dateLaid: Math.random() > 0.5 ? new Date(dateCommitted.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000) : undefined,
      createdAt,
      updatedAt: new Date(createdAt.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000)
    };
  });
};

// Create the context
const BusinessContext = createContext<BusinessContextType>({
  businesses: [],
  committees: [],
  pendingBusinesses: () => [],
  concludedBusinesses: () => [],
  addBusiness: () => {},
  updateBusiness: () => {},
  deleteBusiness: () => {},
  updateBusinessStatus: () => {},
  rescheduleBusiness: () => {},
  getBusinessById: () => undefined,
  searchBusinesses: () => [],
  filterBusinesses: () => [],
  addCommittee: () => {},
  updateCommittee: () => {},
  deleteCommittee: () => {}
});

// Business provider component
export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);

  // Initialize with mock data
  useEffect(() => {
    const storedBusinesses = localStorage.getItem("businesses");
    const storedCommittees = localStorage.getItem("committees");
    
    if (storedBusinesses) {
      const parsedBusinesses = JSON.parse(storedBusinesses).map((business: any) => ({
        ...business,
        presentationDate: new Date(business.presentationDate),
        dateCommitted: new Date(business.dateCommitted),
        dateLaid: business.dateLaid ? new Date(business.dateLaid) : undefined,
        createdAt: new Date(business.createdAt),
        updatedAt: new Date(business.updatedAt)
      }));
      setBusinesses(parsedBusinesses);
    } else {
      const mockBusinesses = generateMockBusinesses();
      setBusinesses(mockBusinesses);
      localStorage.setItem("businesses", JSON.stringify(mockBusinesses));
    }
    
    if (storedCommittees) {
      const parsedCommittees = JSON.parse(storedCommittees).map((committee: any) => ({
        ...committee,
        createdAt: new Date(committee.createdAt),
        updatedAt: new Date(committee.updatedAt)
      }));
      setCommittees(parsedCommittees);
    } else {
      const mockCommittees = generateMockCommittees();
      setCommittees(mockCommittees);
      localStorage.setItem("committees", JSON.stringify(mockCommittees));
    }
  }, []);

  // Save data to local storage whenever they change
  useEffect(() => {
    if (businesses.length > 0) {
      localStorage.setItem("businesses", JSON.stringify(businesses));
    }
  }, [businesses]);

  useEffect(() => {
    if (committees.length > 0) {
      localStorage.setItem("committees", JSON.stringify(committees));
    }
  }, [committees]);

  // Filtered businesses
  const pendingBusinesses = (type?: BusinessType) => businesses
    .filter(business => 
      (business.status === "pending" || business.status === "overdue") && 
      (!type || business.type === type)
    )
    .sort((a, b) => a.presentationDate.getTime() - b.presentationDate.getTime());

  const concludedBusinesses = (type?: BusinessType) => businesses
    .filter(business => 
      business.status === "passed" && 
      (!type || business.type === type)
    )
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  // Add new business
  const addBusiness = (businessData: Omit<Business, "id" | "createdAt" | "updatedAt" | "status" | "presentationDate" | "pendingDays">) => {
    const now = new Date();
    const presentationDate = calculatePresentationDate(businessData.dateCommitted, businessData.daysAllocated);
    const pendingDays = calculatePendingDays(presentationDate);
    
    const newBusiness: Business = {
      id: (businesses.length + 1).toString(),
      ...businessData,
      status: "pending",
      presentationDate,
      pendingDays,
      createdAt: now,
      updatedAt: now
    };

    setBusinesses(prevBusinesses => [...prevBusinesses, newBusiness]);
    
    toast({
      title: "Business added",
      description: `"${businessData.title}" has been successfully added`,
    });
  };

  // Update business
  const updateBusiness = (id: string, updates: Partial<Business>) => {
    setBusinesses(prevBusinesses =>
      prevBusinesses.map(business => {
        if (business.id === id) {
          const updated = { ...business, ...updates, updatedAt: new Date() };
          
          // Recalculate presentation date and pending days if needed
          if ((updates.dateCommitted || updates.daysAllocated) && business.status !== "passed") {
            updated.presentationDate = calculatePresentationDate(
              updates.dateCommitted || business.dateCommitted,
              updates.daysAllocated || business.daysAllocated
            );
            updated.pendingDays = calculatePendingDays(updated.presentationDate);
          }
          
          return updated;
        }
        return business;
      })
    );
    
    toast({
      title: "Business updated",
      description: `Business has been successfully updated`,
    });
  };

  // Delete business
  const deleteBusiness = (id: string) => {
    setBusinesses(prevBusinesses => prevBusinesses.filter(business => business.id !== id));
    
    toast({
      title: "Business deleted",
      description: "Business has been successfully deleted",
    });
  };

  // Update business status
  const updateBusinessStatus = (id: string, status: BusinessStatus) => {
    setBusinesses(prevBusinesses =>
      prevBusinesses.map(business => {
        if (business.id === id) {
          return {
            ...business,
            status,
            updatedAt: new Date()
          };
        }
        return business;
      })
    );
    
    const statusMessages = {
      pending: "Business has been marked as pending",
      passed: "Business has been marked as passed",
      overdue: "Business has been marked as overdue",
    };
    
    toast({
      title: "Status updated",
      description: statusMessages[status],
    });
  };

  // Reschedule business
  const rescheduleBusiness = (id: string, additionalDays: number) => {
    setBusinesses(prevBusinesses =>
      prevBusinesses.map(business => {
        if (business.id === id && business.status !== "passed") {
          const newPresentationDate = addDays(business.presentationDate, additionalDays);
          const pendingDays = calculatePendingDays(newPresentationDate);
          
          return {
            ...business,
            presentationDate: newPresentationDate,
            daysAllocated: business.daysAllocated + additionalDays,
            pendingDays,
            updatedAt: new Date()
          };
        }
        return business;
      })
    );
    
    toast({
      title: "Business rescheduled",
      description: `Business has been rescheduled by ${additionalDays} days`,
    });
  };

  // Get business by ID
  const getBusinessById = (id: string) => {
    return businesses.find(business => business.id === id);
  };

  // Search businesses
  const searchBusinesses = (query: string, type?: BusinessType) => {
    const lowercaseQuery = query.toLowerCase();
    return businesses.filter(
      business =>
        (!type || business.type === type) &&
        (business.title.toLowerCase().includes(lowercaseQuery) ||
        business.committee.toLowerCase().includes(lowercaseQuery))
    );
  };

  // Filter businesses
  const filterBusinesses = (filters: {
    type?: BusinessType;
    year?: number;
    committee?: string;
    status?: BusinessStatus;
  }) => {
    return businesses.filter(business => {
      if (filters.type && business.type !== filters.type) {
        return false;
      }
      
      if (filters.year && business.presentationDate.getFullYear() !== filters.year) {
        return false;
      }

      if (filters.committee && business.committee !== filters.committee) {
        return false;
      }

      if (filters.status && business.status !== filters.status) {
        return false;
      }

      return true;
    });
  };

  // Committee management
  const addCommittee = (name: string) => {
    const newCommittee: Committee = {
      id: (committees.length + 1).toString(),
      name,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setCommittees(prevCommittees => [...prevCommittees, newCommittee]);
    
    toast({
      title: "Committee added",
      description: `"${name}" committee has been successfully added`,
    });
  };

  const updateCommittee = (id: string, name: string) => {
    setCommittees(prevCommittees =>
      prevCommittees.map(committee => {
        if (committee.id === id) {
          return {
            ...committee,
            name,
            updatedAt: new Date()
          };
        }
        return committee;
      })
    );
    
    toast({
      title: "Committee updated",
      description: `Committee has been successfully updated`,
    });
  };

  const deleteCommittee = (id: string) => {
    setCommittees(prevCommittees => prevCommittees.filter(committee => committee.id !== id));
    
    toast({
      title: "Committee deleted",
      description: "Committee has been successfully deleted",
    });
  };

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        committees,
        pendingBusinesses,
        concludedBusinesses,
        addBusiness,
        updateBusiness,
        deleteBusiness,
        updateBusinessStatus,
        rescheduleBusiness,
        getBusinessById,
        searchBusinesses,
        filterBusinesses,
        addCommittee,
        updateCommittee,
        deleteCommittee
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

// Custom hook for accessing business context
export const useBusiness = () => useContext(BusinessContext);