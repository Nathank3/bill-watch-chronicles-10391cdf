
import React from "react";
import { useBills } from "@/contexts/BillContext";
import { useDocuments, DocumentType } from "@/contexts/DocumentContext";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { toast } from "@/components/ui/use-toast";

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

      // Sort by days remaining (least to most)
      const sortedItems = [...pendingItems].sort((a, b) => {
        const now = new Date();
        const aDays = Math.max(0, differenceInDays(a.presentationDate, now));
        const bDays = Math.max(0, differenceInDays(b.presentationDate, now));
        return aDays - bDays;
      });

      const doc = new jsPDF();
      const currentDate = new Date();
      const formattedDate = format(currentDate, "EEEE do MMMM yyyy");
      
      // Title
      doc.setFontSize(16);
      doc.text(`Report of pending ${typeLabel.toLowerCase()} as at ${formattedDate}`, 20, 20);

      // Validate and prepare data before creating table
      const tableData = sortedItems.map(item => {
        const now = new Date();
        const daysRemaining = Math.max(0, differenceInDays(item.presentationDate, now));
        
        // Ensure all values are strings and handle null/undefined values
        return [
          String(item.title || "N/A"),
          String(item.committee || "N/A"),
          item.dateCommitted ? format(new Date(item.dateCommitted), "dd/MM/yyyy") : "N/A",
          String(daysRemaining),
          item.presentationDate ? format(new Date(item.presentationDate), "dd/MM/yyyy") : "N/A"
        ];
      });

      // Double-check that tableData is valid
      if (!tableData || tableData.length === 0 || !Array.isArray(tableData)) {
        throw new Error("No valid data to generate table");
      }

      // Validate each row has the correct number of columns
      const validTableData = tableData.filter(row => 
        Array.isArray(row) && row.length === 5 && row.every(cell => typeof cell === 'string')
      );

      if (validTableData.length === 0) {
        throw new Error("No valid table rows found");
      }

      // Create table with error handling
      try {
        (doc as any).autoTable({
          startY: 40,
          head: [['Title', 'Committee', 'Date Committed', 'Days Remaining', 'Due Date']],
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
            0: { cellWidth: 45 }, // Title
            1: { cellWidth: 35 }, // Committee
            2: { cellWidth: 25 }, // Date Committed
            3: { cellWidth: 20 }, // Days Remaining
            4: { cellWidth: 25 }  // Due Date
          },
          margin: { top: 40, right: 10, bottom: 10, left: 10 },
          tableWidth: 'auto'
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
          <h1 className="text-3xl font-bold">Legislative Document Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Overview of pending documents and reports
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
    </div>
  );
};

export default HomePage;
