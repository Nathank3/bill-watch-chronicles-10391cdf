import { differenceInDays } from "date-fns";

/**
 * Migrate localStorage data to fix countdown and status values
 * This should be run once to update existing data
 */
export const migrateLocalStorageData = () => {
  try {
    // Migrate bills
    const storedBills = localStorage.getItem("bills");
    if (storedBills) {
      const bills = JSON.parse(storedBills);
      const updatedBills = bills.map((bill: any) => {
        const presentationDate = new Date(bill.presentationDate);
        const now = new Date();
        const countdown = differenceInDays(presentationDate, now);
        
        // Determine if overdue
        const isOverdue = countdown < 0 || bill.extensionsCount > 0;
        
        return {
          ...bill,
          // Ensure days_allocated is set
          daysAllocated: bill.daysAllocated || bill.pendingDays || 0,
          // Calculate current countdown
          currentCountdown: bill.status === "concluded" ? 0 : countdown,
          // Update status if needed
          status: bill.status === "concluded" ? "concluded" : (isOverdue ? "overdue" : "pending"),
          // Ensure extensionsCount exists
          extensionsCount: bill.extensionsCount || 0
        };
      });
      
      localStorage.setItem("bills", JSON.stringify(updatedBills));
      console.log("Bills data migrated successfully");
    }
    
    // Migrate documents
    const storedDocuments = localStorage.getItem("documents");
    if (storedDocuments) {
      const documents = JSON.parse(storedDocuments);
      const updatedDocuments = documents.map((doc: any) => {
        const presentationDate = new Date(doc.presentationDate);
        const now = new Date();
        const countdown = differenceInDays(presentationDate, now);
        
        // Determine if overdue
        const isOverdue = countdown < 0 || doc.extensionsCount > 0;
        
        return {
          ...doc,
          // Ensure days_allocated is set
          daysAllocated: doc.daysAllocated || doc.pendingDays || 0,
          // Calculate current countdown
          currentCountdown: doc.status === "concluded" ? 0 : countdown,
          // Update status if needed
          status: doc.status === "concluded" ? "concluded" : (isOverdue ? "overdue" : "pending"),
          // Ensure extensionsCount exists
          extensionsCount: doc.extensionsCount || 0
        };
      });
      
      localStorage.setItem("documents", JSON.stringify(updatedDocuments));
      console.log("Documents data migrated successfully");
    }
    
    return true;
  } catch (error) {
    console.error("Error migrating localStorage data:", error);
    return false;
  }
};
