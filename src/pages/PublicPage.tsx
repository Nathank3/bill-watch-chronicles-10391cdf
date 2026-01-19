
import { useState } from "react";
import { BillCard } from "@/components/BillCard.tsx";
import { DocumentCard } from "@/components/DocumentCard.tsx";
import { Navbar } from "@/components/Navbar.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useBillList } from "@/hooks/useBillsQuery.ts";
import { useDocumentList } from "@/hooks/useDocumentsQuery.ts";
import { DocumentType } from "@/types/document.ts";
import { PaginationControls } from "@/components/ui/pagination-controls.tsx";

const PublicPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("bill");
  const [activeTab, setActiveTab] = useState("pending");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Determine status filter based on active tab
  const statusFilter = activeTab === "pending" ? "pending" : "concluded";

  // Fetch Bills
  // We fetch if documentType is bill. Otherwise we pause? 
  // TanStack Query has `enabled` option.
  const { data: billsData } = useBillList({
    status: statusFilter,
    search: searchQuery,
    page,
    pageSize
  }, {
    enabled: documentType === "bill"
  });

  // Fetch Documents
  const { data: docsData } = useDocumentList({
    type: documentType !== "bill" ? documentType : undefined,
    status: statusFilter,
    search: searchQuery,
    page,
    pageSize
  }, {
    enabled: documentType !== "bill"
  });

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setPage(1);
  };

  const handleTypeChange = (val: string) => {
    setDocumentType(val as DocumentType);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const documentTypes: { value: DocumentType, label: string }[] = [
    { value: "bill", label: "Bills" },
    { value: "statement", label: "Statements" },
    { value: "report", label: "Reports" },
    { value: "regulation", label: "Regulations" },
    { value: "policy", label: "Policies" },
    { value: "petition", label: "Petitions" }
  ];

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Makueni Assembly Business Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Track pending business and view concluded business
          </p>
        </div>
        
        {/* Document Type Navigation */}
        <div className="mb-6 flex justify-center">
          <Tabs 
            value={documentType} 
            onValueChange={handleTypeChange}
            className="w-full"
          >
            <TabsList className="w-full justify-start overflow-x-auto h-auto flex-nowrap pb-1 no-scrollbar">
              {documentTypes.map(type => (
                <TabsTrigger key={type.value} value={type.value} className="min-w-fit px-4">
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
            onChange={(e) => handleSearchChange(e.target.value)}
            className="max-w-xl mx-auto"
          />
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="max-w-5xl mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="concluded">Concluded</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-6">
            {documentType === "bill" ? (
              billsData && billsData.data.length > 0 ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {billsData.data.map((bill) => (
                      <BillCard key={bill.id} bill={bill} />
                    ))}
                  </div>
                  <PaginationControls 
                    currentPage={page}
                    totalCount={billsData.count}
                    pageSize={pageSize}
                    onPageChange={setPage}
                  />
                </>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No pending bills match your search" : "No pending bills at this time"}
                </p>
              )
            ) : (
              docsData && docsData.data.length > 0 ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {docsData.data.map((doc) => (
                      <DocumentCard key={doc.id} document={doc} />
                    ))}
                  </div>
                  <PaginationControls 
                    currentPage={page}
                    totalCount={docsData.count}
                    pageSize={pageSize}
                    onPageChange={setPage}
                  />
                </>
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
              billsData && billsData.data.length > 0 ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {billsData.data.map((bill) => (
                      <BillCard key={bill.id} bill={bill} />
                    ))}
                  </div>
                  <PaginationControls 
                    currentPage={page}
                    totalCount={billsData.count}
                    pageSize={pageSize}
                    onPageChange={setPage}
                  />
                </>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No concluded bills match your search" : "No concluded bills at this time"}
                </p>
              )
            ) : (
              docsData && docsData.data.length > 0 ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {docsData.data.map((doc) => (
                      <DocumentCard key={doc.id} document={doc} />
                    ))}
                  </div>
                  <PaginationControls 
                    currentPage={page}
                    totalCount={docsData.count}
                    pageSize={pageSize}
                    onPageChange={setPage}
                  />
                </>
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

export default PublicPage;
