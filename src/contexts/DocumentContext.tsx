
import React, { createContext, useState, useContext, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { useBills } from "./BillContext";
import { Document, DocumentType, DocumentStatus, DocumentContextType } from "@/types/document";
import { calculatePresentationDate } from "@/utils/documentUtils";
import { generateMockDocuments } from "@/utils/mockDocuments";

// Create the context
const DocumentContext = createContext<DocumentContextType>({
  documents: [],
  pendingDocuments: () => [],
  concludedDocuments: () => [],
  addDocument: () => {},
  updateDocument: () => {},
  updateDocumentStatus: () => {},
  getDocumentById: () => undefined,
  searchDocuments: () => [],
  filterDocuments: () => []
});

// Document provider component
export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const { bills } = useBills();

  // Initialize with mock data
  useEffect(() => {
    const storedDocuments = localStorage.getItem("documents");
    if (storedDocuments) {
      // Parse stored documents and convert date strings back to Date objects
      const parsedDocuments = JSON.parse(storedDocuments).map((doc: any) => ({
        ...doc,
        presentationDate: new Date(doc.presentationDate),
        dateCommitted: new Date(doc.dateCommitted),
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt)
      }));
      setDocuments(parsedDocuments);
    } else {
      const mockDocuments = generateMockDocuments();
      setDocuments(mockDocuments);
      localStorage.setItem("documents", JSON.stringify(mockDocuments));
    }
  }, []);

  // Convert bills to documents format for unified handling
  useEffect(() => {
    if (bills.length > 0) {
      const billDocuments: Document[] = bills.map(bill => ({
        id: `bill-${bill.id}`,
        title: bill.title,
        committee: bill.committee,
        dateCommitted: bill.dateCommitted,
        pendingDays: bill.pendingDays,
        presentationDate: bill.presentationDate,
        status: bill.status,
        type: "bill",
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt
      }));
      
      // Update document storage with bills
      setDocuments(prevDocuments => {
        // Remove existing bill documents
        const nonBillDocuments = prevDocuments.filter(doc => doc.type !== "bill");
        return [...nonBillDocuments, ...billDocuments];
      });
    }
  }, [bills]);

  // Save documents to local storage whenever they change
  useEffect(() => {
    if (documents.length > 0) {
      // Only save non-bill documents as bills are managed separately
      const nonBillDocuments = documents.filter(doc => doc.type !== "bill");
      localStorage.setItem("documents", JSON.stringify(nonBillDocuments));
    }
  }, [documents]);

  // Filtered documents by type and status
  const pendingDocuments = (type: DocumentType) => documents
    .filter(doc => doc.type === type && doc.status === "pending")
    .sort((a, b) => a.presentationDate.getTime() - b.presentationDate.getTime());

  const concludedDocuments = (type: DocumentType) => documents
    .filter(doc => doc.type === type && doc.status === "concluded")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  // Add new document
  const addDocument = (docData: Omit<Document, "id" | "createdAt" | "updatedAt" | "status" | "presentationDate">) => {
    const now = new Date();
    const presentationDate = calculatePresentationDate(docData.dateCommitted, docData.pendingDays);
    
    const newDocument: Document = {
      id: `${docData.type}-${documents.length + 1}`,
      ...docData,
      status: "pending",
      presentationDate,
      createdAt: now,
      updatedAt: now
    };

    setDocuments(prevDocs => [...prevDocs, newDocument]);
    
    toast({
      title: "Document added",
      description: `"${docData.title}" has been successfully added`,
    });
  };

  // Update document
  const updateDocument = (id: string, updates: Partial<Document>) => {
    setDocuments(prevDocs =>
      prevDocs.map(doc => {
        if (doc.id === id) {
          const updated = { ...doc, ...updates, updatedAt: new Date() };
          
          // Recalculate presentation date if needed
          if ((updates.dateCommitted || updates.pendingDays) && doc.status === "pending") {
            updated.presentationDate = calculatePresentationDate(
              updates.dateCommitted || doc.dateCommitted,
              updates.pendingDays || doc.pendingDays
            );
          }
          
          return updated;
        }
        return doc;
      })
    );
    
    toast({
      title: "Document updated",
      description: `Document has been successfully updated`,
    });
  };

  // Update document status
  const updateDocumentStatus = (id: string, status: DocumentStatus) => {
    setDocuments(prevDocs =>
      prevDocs.map(doc => {
        if (doc.id === id) {
          return {
            ...doc,
            status,
            updatedAt: new Date()
          };
        }
        return doc;
      })
    );
    
    const statusMessages = {
      pending: "Document has been marked as pending",
      concluded: "Document has been marked as concluded",
    };
    
    toast({
      title: "Status updated",
      description: statusMessages[status],
    });
  };

  // Get document by ID
  const getDocumentById = (id: string) => {
    return documents.find(doc => doc.id === id);
  };

  // Search documents
  const searchDocuments = (query: string, type?: DocumentType) => {
    const lowercaseQuery = query.toLowerCase();
    return documents.filter(
      doc =>
        (!type || doc.type === type) &&
        (doc.title.toLowerCase().includes(lowercaseQuery) ||
        doc.committee.toLowerCase().includes(lowercaseQuery))
    );
  };

  // Filter documents
  const filterDocuments = (filters: {
    type?: DocumentType;
    year?: number;
    committee?: string;
    pendingDays?: number;
    status?: DocumentStatus;
  }) => {
    return documents.filter(doc => {
      // Filter by type if specified
      if (filters.type && doc.type !== filters.type) {
        return false;
      }
      
      // Filter by year if specified
      if (filters.year && doc.presentationDate.getFullYear() !== filters.year) {
        return false;
      }

      // Filter by committee if specified
      if (filters.committee && doc.committee !== filters.committee) {
        return false;
      }

      // Filter by pending days if specified
      if (filters.pendingDays && doc.pendingDays !== filters.pendingDays) {
        return false;
      }

      // Filter by status if specified
      if (filters.status && doc.status !== filters.status) {
        return false;
      }

      return true;
    });
  };

  return (
    <DocumentContext.Provider
      value={{
        documents,
        pendingDocuments,
        concludedDocuments,
        addDocument,
        updateDocument,
        updateDocumentStatus,
        getDocumentById,
        searchDocuments,
        filterDocuments
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

// Custom hook for accessing document context
export const useDocuments = () => useContext(DocumentContext);

// Re-export document types for convenience
export type { Document, DocumentType, DocumentStatus } from "@/types/document";
