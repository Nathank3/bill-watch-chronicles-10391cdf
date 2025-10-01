
import React from "react";
import { useBills } from "@/contexts/BillContext";
import { useDocuments, DocumentType } from "@/contexts/DocumentContext";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "@/components/ui/use-toast";
const HomePage = () => {
  const { pendingBills } = useBills();
  const { documents, pendingDocuments } = useDocuments();

  console.log("HomePage: pendingBills count:", pendingBills?.length || 0);
  console.log("HomePage: documents count:", documents?.length || 0);

  const documentTypes: { type: DocumentType | "business", label: string }[] = [
    { type: "business", label: "Business" },
    { type: "bill", label: "Bills" },
    { type: "statement", label: "Statements" },
    { type: "report", label: "Reports" },
    { type: "regulation", label: "Regulations" },
    { type: "policy", label: "Policies" },
    { type: "petition", label: "Petitions" }
  ];

  const getPendingCount = (type: DocumentType | "business") => {
    if (type === "business") {
      // Sum all pending items
      return (pendingBills?.length || 0) + 
             (pendingDocuments("statement")?.length || 0) +
             (pendingDocuments("report")?.length || 0) +
             (pendingDocuments("regulation")?.length || 0) +
             (pendingDocuments("policy")?.length || 0) +
             (pendingDocuments("petition")?.length || 0);
    }
    if (type === "bill") {
      return pendingBills?.length || 0;
    }
    return pendingDocuments(type)?.length || 0;
  };

  const generatePDF = (type: DocumentType | "business") => {
    try {
      let pendingItems: any[];
      let typeLabel: string;
      let includeTypeColumn = false;

      if (type === "business") {
        // Collect all pending items from all types
        const allBills = (pendingBills || []).map(item => ({ ...item, itemType: "Bill" }));
        const allStatements = (pendingDocuments("statement") || []).map(item => ({ ...item, itemType: "Statement" }));
        const allReports = (pendingDocuments("report") || []).map(item => ({ ...item, itemType: "Report" }));
        const allRegulations = (pendingDocuments("regulation") || []).map(item => ({ ...item, itemType: "Regulation" }));
        const allPolicies = (pendingDocuments("policy") || []).map(item => ({ ...item, itemType: "Policy" }));
        const allPetitions = (pendingDocuments("petition") || []).map(item => ({ ...item, itemType: "Petition" }));
        
        pendingItems = [...allBills, ...allStatements, ...allReports, ...allRegulations, ...allPolicies, ...allPetitions];
        typeLabel = "Business";
        includeTypeColumn = true;
      } else if (type === "bill") {
        pendingItems = pendingBills || [];
        typeLabel = "Bills";
      } else {
        pendingItems = pendingDocuments(type) || [];
        typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + "s";
      }

      console.log(`Generating PDF for ${typeLabel}, items:`, pendingItems.length);

      if (pendingItems.length === 0) {
        toast({
          title: "No data to export",
          description: `No pending ${typeLabel.toLowerCase()} found to export.`,
          variant: "destructive"
        });
        return;
      }

      // Sort by priority: overdue/rescheduled first, then by days remaining (least to most)
      const sortedItems = [...pendingItems].sort((a, b) => {
        const now = new Date();
        const aDays = differenceInDays(a.presentationDate, now);
        const bDays = differenceInDays(b.presentationDate, now);
        
        // Check if items are overdue or rescheduled
        const aIsOverdue = a.status === "overdue" || aDays < 0;
        const bIsOverdue = b.status === "overdue" || bDays < 0;
        
        // Prioritize overdue/rescheduled items
        if (aIsOverdue && !bIsOverdue) return -1;
        if (!aIsOverdue && bIsOverdue) return 1;
        
        // Within same priority group, sort by days remaining
        return aDays - bDays;
      });

      // Validate and prepare data before creating table
      const tableData = sortedItems.map(item => {
        const now = new Date();
        const actualDaysRemaining = differenceInDays(item.presentationDate, now);
        
        // For rescheduled bills (status overdue but future presentation date), show pending days
        // For truly overdue bills, show overdue days
        let displayDays;
        let statusText;
        
        if (item.status === "overdue" && actualDaysRemaining >= 0) {
          // This is a rescheduled bill - show the pending days
          displayDays = String(item.pendingDays || actualDaysRemaining);
          statusText = "Overdue";
        } else if (actualDaysRemaining < 0) {
          // This is truly overdue
          displayDays = String(Math.abs(actualDaysRemaining));
          statusText = "Overdue";
        } else {
          // Regular pending bill
          displayDays = String(Math.max(0, actualDaysRemaining));
          statusText = "Pending";
        }
        
        // Ensure all values are strings and handle null/undefined values
        const row = [
          String(item.title || "N/A"),
          String(item.committee || "N/A"),
          item.dateCommitted ? format(new Date(item.dateCommitted), "dd/MM/yyyy") : "N/A",
          displayDays,
          statusText,
          item.presentationDate ? format(new Date(item.presentationDate), "dd/MM/yyyy") : "N/A"
        ];
        
        // Add type column for business report
        if (includeTypeColumn) {
          row.push(String(item.itemType || "N/A"));
        }
        
        return row;
      });

      // Double-check that tableData is valid
      if (!tableData || tableData.length === 0 || !Array.isArray(tableData)) {
        throw new Error("No valid data to generate table");
      }

      // Validate each row has the correct number of columns
      const expectedColumns = includeTypeColumn ? 7 : 6;
      const validTableData = tableData.filter(row => 
        Array.isArray(row) && row.length === expectedColumns && row.every(cell => typeof cell === 'string')
      );

      if (validTableData.length === 0) {
        throw new Error("No valid table rows found");
      }

      const doc = new jsPDF();
      const currentDate = new Date();
      const formattedDate = format(currentDate, "EEEE do MMMM yyyy");
      
      // Start position for title (no header image)
      const startY = 20;

      // Title positioning
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`Makueni County Assembly Pending ${typeLabel} as at ${formattedDate}`, 10, startY);

      // Create table with improved spacing and alignment
      try {
        const headers = includeTypeColumn 
          ? [['Title', 'Committee', 'Date Committed', 'Days Remaining', 'Status', 'Due Date', 'Type']]
          : [['Title', 'Committee', 'Date Committed', 'Days Remaining', 'Status', 'Due Date']];
        
        autoTable(doc, {
          startY: startY + 15,
          head: headers,
          body: validTableData,
          theme: 'grid',
          styles: { 
            fontSize: 8,
            cellPadding: 3,
            overflow: 'linebreak',
            cellWidth: 'wrap',
            halign: 'left'
          },
          headStyles: { 
            fillColor: [66, 139, 202],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left'
          },
          margin: { top: 20, right: 10, bottom: 10, left: 10 },
          tableWidth: 'auto',
          didParseCell: function(data) {
            // Color overdue status in red
            if (data.column.index === 4 && data.cell.text[0] === "Overdue") {
              data.cell.styles.textColor = [255, 0, 0]; // Red color for overdue status
              data.cell.styles.fontStyle = 'bold';
            }
            // Color overdue days in red too
            if (data.column.index === 3 && data.cell.text[0]) {
              const rowIndex = data.row.index;
              const originalItem = sortedItems[rowIndex];
              
              if (originalItem && originalItem.status === "overdue") {
                data.cell.styles.textColor = [255, 0, 0];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        });
      } catch (tableError) {
        console.error("Error creating table:", tableError);
        throw new Error(`Failed to create PDF table: ${tableError instanceof Error ? tableError.message : 'Unknown table error'}`);
      }

      // Save PDF
      const fileName = `pending-${typeLabel.toLowerCase()}-${format(currentDate, "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF Downloaded",
        description: `${typeLabel} report has been downloaded successfully.`,
      });

    } catch (error) {
      console.error("Error generating PDF:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Download failed",
        description: `There was an error generating the PDF: ${errorMessage}. Please try again.`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Makueni County Assembly Business</h1>
          <p className="text-muted-foreground mt-2">
            Overview of pending business
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {documentTypes.map(({ type, label }) => {
            const pendingCount = getPendingCount(type);
            
            return (
              <Card key={type} className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {label}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generatePDF(type)}
                      className="ml-2"
                      disabled={pendingCount === 0}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {pendingCount}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Pending {label.toLowerCase()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
      
      <footer className="bg-gray-100 py-4 mt-8">
        <div className="container text-center">
          <p className="text-sm text-gray-600">
            © 2025 All Rights Reserved By County Assembly of Makueni
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
