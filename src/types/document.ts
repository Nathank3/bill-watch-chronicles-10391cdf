


// Define document types
export type DocumentType = "bill" | "statement" | "report" | "regulation" | "policy" | "petition";

// Define document status type
// Define document status type
export type DocumentStatus = "pending" | "concluded" | "overdue" | "frozen" | "under_review" | "limbo";

// Define document interface
export interface Document {
  id: string;
  title: string;
  committee: string;
  dateCommitted: Date | null;
  pendingDays: number;
  presentationDate: Date | null;
  status: DocumentStatus;
  type: DocumentType;
  createdAt: Date;
  updatedAt: Date;
  daysAllocated: number; // Total cumulative days in the house
  currentCountdown: number; // Current countdown value (always decreasing)
  extensionsCount: number; // Number of times extended
}

// Define document filters interface
export interface DocumentFilters {
  type?: DocumentType;
  year?: number;
  committee?: string;
  pendingDays?: number;
  status?: DocumentStatus;
}

// Define document context type
export interface DocumentContextType {
  documents: Document[];
  pendingDocuments: (type: DocumentType) => Document[];
  concludedDocuments: (type: DocumentType) => Document[];
  underReviewDocuments: (type: DocumentType) => Document[];
  addDocument: (document: Omit<Document, "id" | "createdAt" | "updatedAt" | "status" | "presentationDate" | "daysAllocated" | "currentCountdown" | "extensionsCount">) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  updateDocumentStatus: (id: string, status: DocumentStatus, silent?: boolean) => void;
  approveDocument: (id: string) => Promise<void>;
  rejectDocument: (id: string) => Promise<void>;
  rescheduleDocument: (id: string, newDate: Date) => void;
  getDocumentById: (id: string) => Document | undefined;
  searchDocuments: (query: string, type?: DocumentType) => Document[];
  filterDocuments: (filters: DocumentFilters) => Document[];
  getDocumentsByType: (type: DocumentType) => Document[];
}
