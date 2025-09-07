
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
import makueniHeader from "@/assets/makueni-header.png";

const HomePage = () => {
  const { pendingBills } = useBills();
  const { documents, pendingDocuments } = useDocuments();

  console.log("HomePage: pendingBills count:", pendingBills?.length || 0);
  console.log("HomePage: documents count:", documents?.length || 0);

  const documentTypes: { type: DocumentType, label: string }[] = [
    { type: "bill", label: "Bills" },
    { type: "statement", label: "Statements" },
    { type: "report", label: "Reports" },
    { type: "regulation", label: "Regulations" },
    { type: "policy", label: "Policies" },
    { type: "petition", label: "Petitions" }
  ];

  const getPendingCount = (type: DocumentType) => {
    if (type === "bill") {
      return pendingBills?.length || 0;
    }
    return pendingDocuments(type)?.length || 0;
  };

  const generatePDF = (type: DocumentType) => {
    try {
      let pendingItems;
      let typeLabel;

      if (type === "bill") {
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
        return [
          String(item.title || "N/A"),
          String(item.committee || "N/A"),
          item.dateCommitted ? format(new Date(item.dateCommitted), "dd/MM/yyyy") : "N/A",
          displayDays,
          statusText,
          item.presentationDate ? format(new Date(item.presentationDate), "dd/MM/yyyy") : "N/A"
        ];
      });

      // Double-check that tableData is valid
      if (!tableData || tableData.length === 0 || !Array.isArray(tableData)) {
        throw new Error("No valid data to generate table");
      }

      // Validate each row has the correct number of columns
      const validTableData = tableData.filter(row => 
        Array.isArray(row) && row.length === 6 && row.every(cell => typeof cell === 'string')
      );

      if (validTableData.length === 0) {
        throw new Error("No valid table rows found");
      }

      const doc = new jsPDF();
      const currentDate = new Date();
      const formattedDate = format(currentDate, "EEEE do MMMM yyyy");
      
      // Simple approach: try to add header image with fallback
      let startY = 35; // Default start position
      
      try {
        // Calculate image dimensions to maintain aspect ratio and fit within page
        const pageWidth = 190; // Available width (210mm - 20mm margins)
        const maxImageHeight = 25; // Maximum height we want for the header
        
        // Create a temporary image to get natural dimensions
        const img = new Image();
        img.src = makueniHeader;
        
        // Calculate scaled dimensions maintaining aspect ratio
        let imageWidth = pageWidth;
        let imageHeight = maxImageHeight;
        
        // If we can get the natural dimensions, calculate proper scaling
        if (img.naturalWidth && img.naturalHeight) {
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          
          // Scale to fit within our constraints
          if (pageWidth / aspectRatio <= maxImageHeight) {
            imageHeight = pageWidth / aspectRatio;
          } else {
            imageWidth = maxImageHeight * aspectRatio;
          }
        }
        
        // Center the image horizontally
        const imageX = (210 - imageWidth) / 2;
        
        // Add header image with calculated dimensions
        doc.addImage(makueniHeader, 'PNG', imageX, 10, imageWidth, imageHeight);
        
        // Add blue divider line below the image
        const dividerY = 10 + imageHeight + 5;
        doc.setDrawColor(59, 130, 246); // Blue color
        doc.setLineWidth(2);
        doc.line(10, dividerY, 200, dividerY);
        
        // Update start position for title
        startY = dividerY + 15;
      } catch (imgError) {
        console.log("Could not load header image, continuing without it");
        startY = 35;
      }

      // Title positioning
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`Makueni County Assembly Pending ${typeLabel} as at ${formattedDate}`, 10, startY);

      // Create table with improved spacing and alignment
      try {
        autoTable(doc, {
          startY: startY + 15,
          head: [['Title', 'Committee', 'Date Committed', 'Days Remaining', 'Status', 'Due Date']],
          body: validTableData,
          theme: 'grid',
          styles: { 
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak',
            cellWidth: 'wrap'
          },
          headStyles: { 
            fillColor: [66, 139, 202],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 40, cellPadding: 3 }, // Title - increased padding for better wrapping
            1: { cellWidth: 30, cellPadding: 3 }, // Committee
            2: { cellWidth: 25, cellPadding: 3 }, // Date Committed
            3: { cellWidth: 18, cellPadding: 3 }, // Days Remaining
            4: { cellWidth: 18, cellPadding: 3 }, // Status
            5: { cellWidth: 25, cellPadding: 3 }  // Due Date
          },
          margin: { top: 35, right: 10, bottom: 10, left: 10 },
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
