
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBills, Bill } from "@/contexts/BillContext";
import { useDocuments, DocumentType } from "@/contexts/DocumentContext";
import { BillCard } from "@/components/BillCard";
import { DocumentCard } from "@/components/DocumentCard";
import { BillForm } from "@/components/BillForm";
import { DocumentForm } from "@/components/DocumentForm";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogHeader } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isPast } from "date-fns";

const ClerkPage = () => {
  const { isClerk } = useAuth();
  const { pendingBills, updateBillStatus } = useBills();
  const { documents, updateDocumentStatus } = useDocuments();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isBillFormDialogOpen, setIsBillFormDialogOpen] = useState(false);
  const [isDocumentFormDialogOpen, setIsDocumentFormDialogOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>("statement");
  
  // If user is not a clerk, redirect to login
  if (!isClerk) {
    return <Navigate to="/login" />;
  }

  // Filter pending bills based on search query
  const filteredPendingBills = pendingBills.filter(bill =>
    bill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.committee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter documents by type and search query
  const getFilteredDocuments = (type: DocumentType) => {
    return documents
      .filter(doc => doc.type === type)
      .filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.committee.toLowerCase().includes(searchQuery.toLowerCase())
      );
  };

  const getPendingDocuments = (type: DocumentType) => {
    return getFilteredDocuments(type).filter(doc => doc.status === "pending");
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setIsBillFormDialogOpen(true);
  };

  const handleBillFormSuccess = () => {
    setEditingBill(null);
    setIsBillFormDialogOpen(false);
  };

  const handleDocumentFormSuccess = () => {
    setIsDocumentFormDialogOpen(false);
  };

  const handleBillStatusChange = (id: string, status: "pending" | "concluded") => {
    updateBillStatus(id, status);
  };

  const handleDocumentStatusChange = (id: string, status: "pending" | "concluded") => {
    updateDocumentStatus(id, status);
  };

  const documentTypes: { value: DocumentType; label: string }[] = [
    { value: "statement", label: "Statement" },
    { value: "report", label: "Report" },
    { value: "regulation", label: "Regulation" },
    { value: "policy", label: "Policy" },
    { value: "petition", label: "Petition" }
  ];

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Clerk Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Add and manage legislative bills and documents
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-4">
          <div className="md:col-span-1">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              
              {/* Add New Bill */}
              <Dialog open={isBillFormDialogOpen} onOpenChange={setIsBillFormDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full mb-4">Add New Bill</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingBill ? "Edit Bill" : "Add New Bill"}
                    </DialogTitle>
                  </DialogHeader>
                  <BillForm 
                    initialBill={editingBill || undefined} 
                    onSuccess={handleBillFormSuccess} 
                  />
                </DialogContent>
              </Dialog>
              
              {/* Add New Document */}
              <div className="space-y-2">
                <Select
                  value={selectedDocumentType}
                  onValueChange={(value: DocumentType) => setSelectedDocumentType(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Dialog open={isDocumentFormDialogOpen} onOpenChange={setIsDocumentFormDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Add New {documentTypes.find(t => t.value === selectedDocumentType)?.label}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                      <DialogTitle>
                        Add New {documentTypes.find(t => t.value === selectedDocumentType)?.label}
                      </DialogTitle>
                    </DialogHeader>
                    <DocumentForm 
                      documentType={selectedDocumentType}
                      onSuccess={handleDocumentFormSuccess} 
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          </div>
          
          <div className="md:col-span-3">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Manage Documents</h2>
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              
              <Tabs defaultValue="bills">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="bills">Bills</TabsTrigger>
                  <TabsTrigger value="statements">Statements</TabsTrigger>
                  <TabsTrigger value="reports">Reports</TabsTrigger>
                  <TabsTrigger value="regulations">Regulations</TabsTrigger>
                  <TabsTrigger value="policies">Policies</TabsTrigger>
                  <TabsTrigger value="petitions">Petitions</TabsTrigger>
                </TabsList>
                
                {/* Bills Tab */}
                <TabsContent value="bills" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">
                      Bills ({filteredPendingBills.length} pending)
                    </h3>
                    {filteredPendingBills.length > 0 ? (
                      <div className="space-y-4">
                        {filteredPendingBills.map((bill) => (
                          <div key={bill.id} className="flex items-center gap-4">
                            <div className="flex-1">
                              <BillCard 
                                bill={bill} 
                                showActions={true}
                                onStatusChange={handleBillStatusChange}
                              />
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => handleEditBill(bill)}
                            >
                              Edit
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No bills match your search" : "No pending bills at this time"}
                      </p>
                    )}
                  </div>
                </TabsContent>
                
                {/* Document Tabs */}
                {documentTypes.map((docType) => (
                  <TabsContent key={docType.value} value={`${docType.value}s`} className="mt-4">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">
                        {docType.label}s ({getPendingDocuments(docType.value).length} pending)
                      </h3>
                      {getFilteredDocuments(docType.value).length > 0 ? (
                        <div className="space-y-4">
                          {getFilteredDocuments(docType.value).map((doc) => (
                            <div key={doc.id} className="flex items-center gap-4">
                              <div className="flex-1">
                                <DocumentCard 
                                  document={doc} 
                                  showActions={true}
                                  onStatusChange={handleDocumentStatusChange}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-8 text-muted-foreground">
                          {searchQuery ? `No ${docType.label.toLowerCase()}s match your search` : `No ${docType.label.toLowerCase()}s at this time`}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClerkPage;
