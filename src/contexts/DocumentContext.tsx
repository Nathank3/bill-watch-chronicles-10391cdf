import React, { createContext, useState, useContext, useEffect, useMemo } from "react";
import { toast } from "@/components/ui/use-toast.ts";
import { useBills } from "./BillContext.tsx";
import { supabase } from "@/integrations/supabase/client.ts";
import { Document, DocumentType, DocumentStatus, DocumentContextType } from "@/types/document.ts";
import { calculatePresentationDate, adjustForSittingDay } from "@/utils/documentUtils.ts";
import { format } from "date-fns";
import { useNotifications } from "./NotificationContext.tsx";
import { useAuth } from "./AuthContext.tsx";

// Create the context
const DocumentContext = createContext<DocumentContextType>({
  documents: [],
  pendingDocuments: () => [],
  concludedDocuments: () => [],
  underReviewDocuments: () => [],
  addDocument: async () => { },
  updateDocument: async () => { },
  deleteDocument: async () => { },
  updateDocumentStatus: async () => { },
  approveDocument: async () => { },
  rejectDocument: async () => { },
  rescheduleDocument: async () => { },
  getDocumentById: () => undefined,
  searchDocuments: () => [],
  filterDocuments: () => [],
  getDocumentsByType: () => []
});

// Helper to map DB result to App type
interface DbDocumentResult {
  id: string;
  title: string;
  committee: string;
  date_committed: string;
  created_at: string;
  pending_days: number;
  presentation_date: string;
  status: string;
  type: string;
  updated_at: string;
  days_allocated: number;
  current_countdown: number;
  extensions_count: number;
  [key: string]: unknown;
}

const mapDbToDocument = (data: DbDocumentResult): Document => ({
  id: data.id,
  title: data.title,
  committee: data.committee,
  dateCommitted: new Date(data.date_committed || data.created_at),
  pendingDays: data.pending_days || 0,
  presentationDate: new Date(data.presentation_date),
  status: data.status as DocumentStatus,
  type: data.type as DocumentType,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
  daysAllocated: data.days_allocated || 0,
  currentCountdown: data.current_countdown || 0,
  extensionsCount: data.extensions_count || 0
});

// Document provider component
export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dbDocuments, setDbDocuments] = useState<Document[]>([]); // Documents from DB (non-bills)
  const { bills } = useBills();
  const { addNotification } = useNotifications();
  const { isAdmin } = useAuth();

  // Fetch non-bill documents from Supabase
  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setDbDocuments(data.map(mapDbToDocument));
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error fetching documents",
        description: "Could not load documents from the database.",
        variant: "destructive"
      });
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-docs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents'
        },
        () => {
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Merge bills and dbDocuments into unified 'documents' state
  const documents = useMemo(() => {
    const billDocuments: Document[] = bills.map(bill => ({
      id: `bill-${bill.id}`,
      title: bill.title,
      committee: bill.committee,
      dateCommitted: bill.dateCommitted,
      pendingDays: bill.pendingDays,
      presentationDate: bill.presentationDate,
      status: bill.status === "under_review" ? "under_review" : bill.status, // bill status matches document status
      type: "bill",
      createdAt: bill.createdAt,
      updatedAt: bill.updatedAt,
      daysAllocated: bill.daysAllocated,
      currentCountdown: bill.currentCountdown,
      extensionsCount: bill.extensionsCount
    }));

    return [...dbDocuments, ...billDocuments];
  }, [bills, dbDocuments]);


  // Hook up freeze checker for DB documents (Using local state to check, but triggering DB updates)
  useEffect(() => {
    const checkFreezeStatus = () => {
      dbDocuments.forEach(doc => {
        if ((doc.status === "pending" || doc.status === "overdue") && doc.currentCountdown <= 0) {
          updateDocumentStatus(doc.id, "frozen", true).then(() => {
             addNotification({
              type: "action_required",
              title: "Document Frozen",
              message: `"${doc.title}" has been frozen due to expired deadline.`,
              businessId: doc.id,
              businessType: "document",
              businessTitle: doc.title
            });
          });
        }
      });
    };
    
    // Check periodically
    const interval = setInterval(checkFreezeStatus, 60000);
    return () => clearInterval(interval);
  }, [dbDocuments, addNotification]);

  // Helper functions to filter docs by type
  const getDocumentsByType = (type: DocumentType) => documents.filter(doc => doc.type === type);

  // Filtered documents by type and status
  const pendingDocuments = (type: DocumentType) => documents
    .filter(doc => doc.type === type && (doc.status === "pending" || doc.status === "overdue" || doc.status === "frozen"))
    .sort((a, b) => a.presentationDate.getTime() - b.presentationDate.getTime());

  const concludedDocuments = (type: DocumentType) => documents
    .filter(doc => doc.type === type && doc.status === "concluded")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const underReviewDocuments = (type: DocumentType) => documents
    .filter(doc => doc.type === type && doc.status === "under_review")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Add new document
  const addDocument = async (docData: Omit<Document, "id" | "createdAt" | "updatedAt" | "status" | "presentationDate" | "daysAllocated" | "currentCountdown" | "extensionsCount">) => {
    // If type is bill, we shouldn't be here ideally, but for safety:
    if (docData.type === "bill") {
      console.error("Cannot add bills via DocumentContext");
      return;
    }


    const presentationDate = calculatePresentationDate(docData.dateCommitted, docData.pendingDays);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a document.",
        variant: "destructive"
      });
      throw new Error("User not authenticated");
    }

    const newDocument = {
      title: docData.title,
      committee: docData.committee,
      date_committed: docData.dateCommitted.toISOString(),
      pending_days: docData.pendingDays,
      status: isAdmin ? "pending" : "under_review",
      presentation_date: presentationDate.toISOString(),
      type: docData.type,
      days_allocated: docData.pendingDays,
      current_countdown: docData.pendingDays,
      extensions_count: 0,
      created_by: user.id
    };

    try {
      const { data, error } = await supabase.from('documents').insert(newDocument).select();
      if (error) throw error;

      const createdDoc = data?.[0];

      addNotification({
        type: "business_created",
        title: "Document Created",
        message: `New ${docData.type} "${docData.title}" has been created.`,
        businessId: createdDoc?.id || "pending",
        businessType: "document",
        businessTitle: docData.title
      });

      toast({
        title: isAdmin ? "Document published" : "Document submitted for review",
        description: isAdmin
          ? `"${docData.title}" has been successfully added`
          : `"${docData.title}" is now under review by an admin.`,
      });

    } catch (error) {
      console.error("Error adding document:", error);
      toast({
        title: "Error adding document",
        description: error.message || "Could not save to database.",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Update document
  const updateDocument = async (id: string, updates: Partial<Document>) => {
    // If it's a bill (id starts with 'bill-'), ignore or redirect?
    // The UI should prevent this, but let's be safe.
    if (id.startsWith('bill-')) {
       // Ideally trigger bill update in BillContext? 
       // For now, we assume simple edits won't target bills via document context 
       // or if they do, we log a warning.
       console.warn("Attempted to update bill via DocumentContext - ignored");
       return;
    }

    try {
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

       // Specialized logic: recalc presentation date
      const currentDoc = dbDocuments.find(d => d.id === id);
      if (currentDoc && (updates.dateCommitted || updates.pendingDays) && currentDoc.status === "pending") {
        const newDate = calculatePresentationDate(
          updates.dateCommitted || currentDoc.dateCommitted,
          updates.pendingDays || currentDoc.pendingDays
        );
        dbUpdates.presentation_date = newDate.toISOString();
      }

      const { error } = await supabase
        .from('documents')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Document updated",
        description: `Document has been successfully updated`,
      });
    } catch (error) {
      console.error("Error updating document:", error);
      toast({
        title: "Error updating document",
        description: "Could not update the database.",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Delete document function
  const deleteDocument = async (id: string) => {
    if (id.startsWith('bill-')) return;

    try {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;

      // Update local state immediately
      setDbDocuments(prev => prev.filter(doc => doc.id !== id));

      toast({
        title: "Document deleted",
        description: "Document has been successfully deleted",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({ title: "Error", description: "Could not delete document.", variant: "destructive" });
      throw error;
    }
  };

  const approveDocument = async (id: string) => {
    await updateDocumentStatus(id, "pending");
    toast({ title: "Document Approved", description: "Document has been published successfully." });
  };

  const rejectDocument = async (id: string) => {
    await deleteDocument(id);
    toast({ title: "Document Rejected", description: "Document has been rejected and removed." });
  };

  // Update document status
  const updateDocumentStatus = async (id: string, status: DocumentStatus, silent: boolean = false) => {
    if (id.startsWith('bill-')) return; 

    try {
      const { error } = await supabase
        .from('documents')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Update local state immediately
      setDbDocuments(prev => prev.map(doc => 
        doc.id === id ? { ...doc, status, updatedAt: new Date() } : doc
      ));

      const statusMessages = {
        pending: "Document has been marked as pending",
        concluded: "Document has been marked as concluded",
        overdue: "Document has been marked as overdue",
        frozen: "Document has been marked as frozen",
      };

      toast({
        title: "Status updated",
        description: statusMessages[status] || "Status updated",
      });
    } catch (error) {
       console.error("Error updating status:", error);
       // Suppress toast if it was an automated freeze, or show generic
       if (!silent) {
         toast({ title: "Error", description: "Could not update status", variant: "destructive" });
       }
    }
  };

  // Reschedule document
  const rescheduleDocument = async (id: string, newDate: Date) => {
    if (id.startsWith('bill-')) return;

    try {
      const doc = dbDocuments.find(d => d.id === id);
      if (!doc) return;

      const adjustedDate = adjustForSittingDay(newDate);
      const now = new Date();
      const daysDiff = Math.ceil((adjustedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const { error } = await supabase
        .from('documents')
        .update({
          presentation_date: adjustedDate.toISOString(),
          pending_days: daysDiff > 0 ? daysDiff : 0,
          current_countdown: daysDiff,
          extensions_count: doc.extensionsCount + 1,
          status: "overdue",
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Document rescheduled",
        description: `Document has been rescheduled to ${format(newDate, "PPP")}`,
      });
    } catch (error) {
      console.error("Error rescheduling document:", error);
      toast({ title: "Error", description: "Could not reschedule.", variant: "destructive" });
      throw error;
    }
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
        underReviewDocuments,
        addDocument,
        updateDocument,
        deleteDocument,
        updateDocumentStatus,
        approveDocument,
        rejectDocument,
        rescheduleDocument,
        getDocumentById,
        searchDocuments,
        filterDocuments,
        getDocumentsByType
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

// Custom hook for accessing document context
export const useDocuments = () => useContext(DocumentContext);

// Re-export document types for convenience
export type { Document, DocumentType, DocumentStatus } from "@/types/document.ts";
