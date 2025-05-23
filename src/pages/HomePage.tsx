
import React from "react";
import { useBills } from "@/contexts/BillContext";
import { useDocuments, DocumentType } from "@/contexts/DocumentContext";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import "jspdf-autotable";

const HomePage = () => {
  const { pendingBills } = useBills();
  const { documents, pendingDocuments } = useDocuments();

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
      return pendingBills.length;
    }
    return pendingDocuments(type).length;
  };

  const generatePDF = (type: DocumentType) => {
    let pendingItems;
    let typeLabel;

    if (type === "bill") {
      pendingItems = pendingBills;
      typeLabel = "Bills";
    } else {
      pendingItems = pendingDocuments(type);
      typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + "s";
    }

    // Sort by pending days (least to most)
    const sortedItems = [...pendingItems].sort((a, b) => {
      const aDays = Math.max(0, Math.floor((a.presentationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
      const bDays = Math.max(0, Math.floor((b.presentationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
      return aDays - bDays;
    });

    const doc = new jsPDF();
    const currentDate = new Date();
    const formattedDate = format(currentDate, "EEEE do MMMM yyyy");
    
    // Title
    doc.setFontSize(16);
    doc.text(`Report of pending ${typeLabel.toLowerCase()} as at ${formattedDate}`, 20, 20);

    // Table data
    const tableData = sortedItems.map(item => {
      const pendingDays = Math.max(0, Math.floor((item.presentationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
      return [
        item.title,
        item.committee,
        format(item.dateCommitted, "dd/MM/yyyy"),
        pendingDays.toString(),
        format(item.presentationDate, "dd/MM/yyyy")
      ];
    });

    // Create table
    (doc as any).autoTable({
      startY: 40,
      head: [['Title', 'Committee', 'Date Committed', 'Pending (Days)', 'Due Date']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    // Save PDF
    doc.save(`pending-${typeLabel.toLowerCase()}-${format(currentDate, "yyyy-MM-dd")}.pdf`);
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
                      disabled={pendingCount === 0}
                      className="ml-2"
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
