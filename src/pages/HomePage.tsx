
import React from "react";
import { useBills } from "@/contexts/BillContext";
import { useDocuments, DocumentType } from "@/contexts/DocumentContext";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { generatePendingDocumentsPDF } from "@/utils/pdfUtils";

const HomePage = () => {
  const { pendingBills } = useBills();
  const { pendingDocuments } = useDocuments();

  const documentTypes: { type: DocumentType; label: string }[] = [
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

  const handleDownloadPDF = (type: DocumentType) => {
    if (type === "bill") {
      generatePendingDocumentsPDF(pendingBills, "Bills");
    } else {
      generatePendingDocumentsPDF(pendingDocuments(type), type.charAt(0).toUpperCase() + type.slice(1) + "s");
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Legislative Document Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to the legislative document tracking system
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {documentTypes.map(({ type, label }) => {
            const pendingCount = getPendingCount(type);
            
            return (
              <Card key={type} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">{pendingCount}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                    {pendingCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(type)}
                        className="flex items-center gap-2"
                      >
                        <FileDown className="h-4 w-4" />
                        PDF
                      </Button>
                    )}
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
