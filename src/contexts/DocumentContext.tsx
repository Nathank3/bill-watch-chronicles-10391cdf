import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast.ts";
import { useBills } from "./BillContext.tsx";
import { supabase } from "@/integrations/supabase/client.ts";
import { Document, DocumentType, DocumentStatus, DocumentContextType } from "@/types/document.ts";
import { calculatePresentationDate, adjustForSittingDay } from "@/utils/documentUtils.ts";
import { format } from "date-fns";
import { useNotifications } from "./NotificationContext.tsx";
import { useAuth } from "./AuthContext.tsx";
import { logAuditAction } from "@/utils/auditLogger.ts";

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


// Legacy DbDocumentResult and mapDbToDocument removed in favor of React Query


// Document provider component
export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dbDocuments, setDbDocuments] = useState<Document[]>([]); // Documents from DB (non-bills)
  
  // Safe context consumption with fallbacks
  const billContext = useBills();
  const notificationContext = useNotifications();
  const authContext = useAuth();
  
  // Destructure with default fallbacks to prevent crashes
  const { bills } = billContext || { bills: [] };
  const { addNotification, clearBusinessNotifications } = notificationContext || { 
    addNotification: () => console.warn("Notification context missing"), 
    clearBusinessNotifications: () => {} 
  };
  const { isAdmin } = authContext || { isAdmin: false };
  
  const queryClient = useQueryClient();

  // Log critical missing contexts for debugging
  useEffect(() => {
    if (!billContext) console.error("DocumentProvider: BillContext is missing!");
    if (!notificationContext) console.error("DocumentProvider: NotificationContext is missing!");
    if (!authContext) console.error("DocumentProvider: AuthContext is missing!");
  }, [billContext, notificationContext, authContext]);

  // Fetch non-bill documents from Supabase
  // _fetchDocuments and auto-fetch logic removed (using React Query hooks instead)


  // Merge bills and dbDocuments into unified 'documents' state
  const documents = useMemo(() => {
    const billDocuments: Document[] = bills.map(bill => ({
      id: `bill-${bill.id}`,
      title: bill.title,
      committee: bill.committee,
      dateCommitted: bill.dateCommitted,
      pendingDays: bill.pendingDays,
      presentationDate: bill.presentationDate,
      status: bill.status as DocumentStatus, // bill status matches document status
      type: "bill" as DocumentType,
      createdAt: bill.createdAt,
      updatedAt: bill.updatedAt,
      daysAllocated: bill.daysAllocated,
      currentCountdown: bill.currentCountdown,
      extensionsCount: bill.extensionsCount,
      concludedAt: bill.concludedAt
    }));

    return [...dbDocuments, ...billDocuments];
  }, [bills, dbDocuments]);


  // Hook up freeze checker for DB documents (Using local state to check, but triggering DB updates)
  /*
  // Frozen status checker removed. Overdue logic handled in UI/Components.
  */

  // Helper functions to filter docs by type - Memoized for performance
  const getDocumentsByType = useCallback((type: DocumentType) => documents.filter(doc => doc.type === type), [documents]);

  // Filtered documents by type and status - Memoized for performance
  const pendingDocuments = useCallback((type: DocumentType) => documents
    .filter(doc => doc.type === type && (doc.status === "pending" || doc.status === "overdue" || doc.status === "tbd"))
    .sort((a, b) => a.presentationDate ? a.presentationDate.getTime() - b.presentationDate.getTime() : 0),
    [documents]
  );

  const concludedDocuments = useCallback((type: DocumentType) => documents
    .filter(doc => doc.type === type && doc.status === "concluded")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [documents]
  );

  // Under review merged into pending
  const underReviewDocuments = useCallback((): Document[] => [], []);

  // Add new document
  const addDocument = async (docData: Omit<Document, "id" | "createdAt" | "updatedAt" | "status" | "presentationDate" | "daysAllocated" | "currentCountdown" | "extensionsCount"> & { presentationDate?: Date | null, initialStatus?: DocumentStatus, concludedAt?: Date | null }) => {
    // If type is bill, we shouldn't be here ideally, but for safety:
    if (docData.type === "bill") {
      console.error("Cannot add bills via DocumentContext");
      return;
    }



    // Use explicit presentationDate if provided, otherwise calculate it
    let presentationDate: Date | null = docData.presentationDate || null;
    
    if (!presentationDate && docData.dateCommitted) {
      presentationDate = calculatePresentationDate(docData.dateCommitted, docData.pendingDays);
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a document.",
        variant: "destructive"
      });
      throw new Error("User not authenticated");
    }

    // Determine status
    let initialStatus: DocumentStatus = "pending";
    if (!presentationDate) {
        initialStatus = "tbd";
    }
    if (docData.initialStatus === 'concluded' || docData.initialStatus === 'overdue' || docData.initialStatus === 'tbd') {
        initialStatus = docData.initialStatus;
    }

    const newDocument = {
      title: docData.title,
      committee: docData.committee,
      date_committed: docData.dateCommitted ? docData.dateCommitted.toISOString() : null,
      pending_days: docData.pendingDays,
      status: initialStatus,
      presentation_date: presentationDate ? presentationDate.toISOString() : null,
      type: docData.type,
      days_allocated: docData.pendingDays,
      current_countdown: docData.pendingDays,
      extensions_count: 0,
      created_by: user.id,
      concluded_at: docData.concludedAt ? docData.concludedAt.toISOString() : null
    };

    try {
      const { data, error } = await supabase.from('documents').insert(newDocument).select();
      if (error) throw error;

      const createdDoc = data?.[0];

      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documents-stats"] });

      addNotification({
        type: "business_created",
        title: "Document Created",
        message: `New ${docData.type} "${docData.title}" has been created.`,
        businessId: createdDoc?.id || "pending",
        businessType: "document",
        businessTitle: docData.title
      });

      const capitalizedType = docData.type.charAt(0).toUpperCase() + docData.type.slice(1);
      toast({
        title: isAdmin ? `${capitalizedType} published` : `${capitalizedType} submitted for review`,
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
      const dbUpdates: Record<string, string | number | undefined | null> = {
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
      if (updates.statusReason !== undefined) dbUpdates.status_reason = updates.statusReason;
      if (updates.concludedAt !== undefined) dbUpdates.concluded_at = updates.concludedAt ? updates.concludedAt.toISOString() : null;

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

      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documents-stats"] });

      toast({
        title: "Document updated",
        description: `Document has been successfully updated`,
      });

      // Audit Log
      logAuditAction({
        action: "UPDATE_DOCUMENT",
        entity_type: "document",
        entity_id: id,
        details: updates
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

      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documents-stats"] });

      toast({
        title: "Document deleted",
        description: "Document has been successfully deleted",
      });

      // Audit Log
      logAuditAction({
        action: "DELETE_DOCUMENT",
        entity_type: "document",
        entity_id: id
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
      const updates: Record<string, string | null> = { status, updated_at: new Date().toISOString() };
      
      // If marking as concluded, set the concluded_at date
      if (status === "concluded") {
         updates.concluded_at = new Date().toISOString();
      } else {
         updates.concluded_at = null; 
      }

      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn(`Update document status yielded NO matched rows for ${id}. This might be due to RLS policies.`);
      }

      // Clear notifications if handled
      if (status === "concluded" || status === "pending") {
        clearBusinessNotifications(id);
      }

      // Update local state immediately
      setDbDocuments(prev => prev.map(doc => 
        doc.id === id ? { ...doc, status, updatedAt: new Date() } : doc
      ));

      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documents-stats"] });

      const statusMessages = {
        pending: "Document has been marked as pending",
        concluded: "Document has been marked as concluded",
        overdue: "Document has been marked as overdue",
        tbd: "Document has been marked as TBD",
      };

      toast({
        title: "Status updated",
        description: statusMessages[status] || "Status updated",
      });

      /* Audit log logic inside catch/finally or here is fine */
      logAuditAction({
        action: "UPDATE_DOCUMENT_STATUS",
        entity_type: "document",
        entity_id: id,
        details: { status }
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

      // Clear frozen notifications
      clearBusinessNotifications(id);

      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documents-stats"] });

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

  // Get document by ID - Memoized
  const getDocumentById = useCallback((id: string) => {
    return documents.find(doc => doc.id === id);
  }, [documents]);

  // Search documents - Memoized
  const searchDocuments = useCallback((query: string, type?: DocumentType) => {
    const lowercaseQuery = query.toLowerCase();
    return documents.filter(
      doc =>
        (!type || doc.type === type) &&
        (doc.title.toLowerCase().includes(lowercaseQuery) ||
          doc.committee.toLowerCase().includes(lowercaseQuery))
    );
  }, [documents]);

  // Filter documents - Memoized
  const filterDocuments = useCallback((filters: {
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
      if (filters.year && doc.presentationDate?.getFullYear() !== filters.year) {
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
  }, [documents]);

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
export type { DocumentStatus, DocumentType } from "@/types/document.ts";

