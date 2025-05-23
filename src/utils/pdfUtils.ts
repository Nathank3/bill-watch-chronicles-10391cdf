
import { format } from "date-fns";

interface DocumentForPDF {
  title: string;
  committee: string;
  dateCommitted: Date;
  pendingDays: number;
  presentationDate: Date;
}

export const generatePendingDocumentsPDF = (documents: DocumentForPDF[], documentType: string) => {
  // Sort documents by presentation date (soonest first)
  const sortedDocuments = [...documents].sort((a, b) => 
    a.presentationDate.getTime() - b.presentationDate.getTime()
  );

  // Calculate days remaining for each document
  const now = new Date();
  const documentsWithDaysLeft = sortedDocuments.map(doc => {
    const daysLeft = Math.ceil((doc.presentationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { ...doc, daysLeft };
  });

  // Create CSV content (which can be opened as Excel)
  const today = format(new Date(), "dd/MM/yyyy");
  const headers = ["Title", "Committee", "Date Committed", "Pending (Days)", "Due Date"];
  
  let csvContent = `Pending ${documentType} as at ${today}\n\n`;
  csvContent += headers.join(",") + "\n";
  
  documentsWithDaysLeft.forEach(doc => {
    const row = [
      `"${doc.title.replace(/"/g, '""')}"`, // Escape quotes in title
      `"${doc.committee}"`,
      format(doc.dateCommitted, "dd/MM/yyyy"),
      doc.pendingDays.toString(),
      format(doc.presentationDate, "dd/MM/yyyy")
    ];
    csvContent += row.join(",") + "\n";
  });

  // Create and download the file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `pending_${documentType.toLowerCase()}_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
