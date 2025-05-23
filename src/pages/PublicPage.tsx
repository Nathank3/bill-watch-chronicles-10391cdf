
import React, { useState } from "react";
import { useBills } from "@/contexts/BillContext";
import { useDocuments, DocumentType } from "@/contexts/DocumentContext";
import { BillCard } from "@/components/BillCard";
import { DocumentCard } from "@/components/DocumentCard";
import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { generatePendingDocumentsPDF } from "@/utils/pdfUtils";

const PublicPage = () => {
  const { pendingBills, concludedBills } = useBills();
  const { pendingDocuments, concludedDocuments } = useDocuments();
  const [searchQuery, setSearchQuery] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("bill");

  // Filter bills based on search query
  const filteredPendingBills = pendingBills.filter(bill =>
    bill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.committee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConcludedBills = concludedBills.filter(bill =>
    bill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.committee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get documents for selected type
  const currentPendingDocuments = documentType === "bill" 
    ? [] 
    : pendingDocuments(documentType).filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.committee.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const currentConcludedDocuments = documentType === "bill"
    ? []
    : concludedDocuments(documentType).filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.committee.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const documentTypes: { value: DocumentType, label: string }[] = [
    { value: "bill", label: "Bills" },
    { value: "statement", label: "Statements" },
    { value: "report", label: "Reports" },
    { value: "regulation", label: "Regulations" },
    { value: "policy", label: "Policies" },
    { value: "petition", label: "Petitions" }
  ];

  const handleDownloadPDF = () => {
    if (documentType === "bill") {
      generatePendingDocumentsPDF(filteredPendingBills, "Bills");
    } else {
      generatePendingDocumentsPDF(currentPendingDocuments, documentType.charAt(0).toUpperCase() + documentType.slice(1) + "s");
    }
  };

  const getPendingCount = () => {
    if (documentType === "bill") {
      return filteredPendingBills.length;
    }
    return currentPendingDocuments.length;
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Legislative Document Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Track pending documents and view concluded legislation
          </p>
        </div>
        
        {/* Document Type Navigation */}
        <div className="mb-6 flex justify-center">
          <Tabs 
            value={documentType} 
            onValueChange={(value) => setDocumentType(value as DocumentType)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-6 w-full">
              {documentTypes.map(type => (
                <TabsTrigger key={type.value} value={type.value}>
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        <div className="mb-6">
          <Input
            placeholder={`Search ${documentType}s by title or committee`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xl mx-auto"
          />
        </div>

        <Tabs defaultValue="pending" className="max-w-5xl mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="concluded">Concluded</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Pending {documentType.charAt(0).toUpperCase() + documentType.slice(1)}s
              </h2>
              {getPendingCount() > 0 && (
                <Button
                  onClick={handleDownloadPDF}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Download PDF Report
                </Button>
              )}
            </div>
            
            {documentType === "bill" ? (
              filteredPendingBills.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredPendingBills.map((bill) => (
                    <BillCard key={bill.id} bill={bill} />
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No pending bills match your search" : "No pending bills at this time"}
                </p>
              )
            ) : (
              currentPendingDocuments.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {currentPendingDocuments.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} />
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  {searchQuery 
                    ? `No pending ${documentType}s match your search` 
                    : `No pending ${documentType}s at this time`
                  }
                </p>
              )
            )}
          </TabsContent>
          
          <TabsContent value="concluded" className="mt-6">
            {documentType === "bill" ? (
              filteredConcludedBills.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredConcludedBills.map((bill) => (
                    <BillCard key={bill.id} bill={bill} />
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No concluded bills match your search" : "No concluded bills at this time"}
                </p>
              )
            ) : (
              currentConcludedDocuments.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {currentConcludedDocuments.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} />
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  {searchQuery 
                    ? `No concluded ${documentType}s match your search` 
                    : `No concluded ${documentType}s at this time`
                  }
                </p>
              )
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PublicPage;
