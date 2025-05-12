
import { Document, DocumentType } from "@/types/document";
import { calculatePresentationDate } from "./documentUtils";

// Generate mock data
export const generateMockDocuments = (): Document[] => {
  const committees = ["Agriculture", "Education", "Finance", "Health", "Transportation"];
  const types: DocumentType[] = ["statement", "report", "regulation", "policy", "petition"];
  
  const now = new Date();
  const documents: Document[] = [];
  
  // Generate 5 items per type (besides bills which are handled separately)
  types.forEach(type => {
    for (let i = 0; i < 5; i++) {
      const id = `${type}-${i + 1}`;
      const committee = committees[i % committees.length];
      const createdAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const pendingDays = Math.floor(Math.random() * 20) + 5;
      const dateCommitted = new Date(createdAt);
      
      let presentationDate: Date;
      let status: "pending" | "concluded";
      
      // Distribute items across different statuses
      if (i < 3) { // Most are pending
        presentationDate = calculatePresentationDate(dateCommitted, pendingDays);
        status = "pending";
      } else { // Some are concluded
        presentationDate = new Date(dateCommitted.getTime() - (Math.random() * 10 + 1) * 24 * 60 * 60 * 1000);
        status = "concluded";
      }
      
      documents.push({
        id,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} ${id} - ${committee} Reform`,
        committee,
        dateCommitted,
        pendingDays,
        presentationDate,
        status,
        type,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000)
      });
    }
  });
  
  return documents;
};
