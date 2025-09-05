export type BusinessType = "bill" | "statement" | "report" | "regulation" | "policy" | "petition";

export type BusinessStatus = "pending" | "passed" | "overdue";

export interface Committee {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Business {
  id: string;
  title: string;
  committee: string;
  dateCommitted: Date;
  daysAllocated: number;
  pendingDays: number;
  presentationDate: Date;
  status: BusinessStatus;
  type: BusinessType;
  overduedays?: number;
  dateLaid?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessContextType {
  businesses: Business[];
  committees: Committee[];
  pendingBusinesses: (type?: BusinessType) => Business[];
  concludedBusinesses: (type?: BusinessType) => Business[];
  addBusiness: (business: Omit<Business, "id" | "createdAt" | "updatedAt" | "status" | "presentationDate" | "pendingDays">) => void;
  updateBusiness: (id: string, updates: Partial<Business>) => void;
  deleteBusiness: (id: string) => void;
  updateBusinessStatus: (id: string, status: BusinessStatus) => void;
  rescheduleBusiness: (id: string, additionalDays: number) => void;
  getBusinessById: (id: string) => Business | undefined;
  searchBusinesses: (query: string, type?: BusinessType) => Business[];
  filterBusinesses: (filters: {
    type?: BusinessType;
    year?: number;
    committee?: string;
    status?: BusinessStatus;
  }) => Business[];
  addCommittee: (name: string) => void;
  updateCommittee: (id: string, name: string) => void;
  deleteCommittee: (id: string) => void;
}