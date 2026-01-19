
import { useState, useEffect } from "react";
import { useDocuments, DocumentType, DocumentStatus } from "@/contexts/DocumentContext.tsx";
import { DocumentCard } from "./DocumentCard.tsx";
import { DocumentFormDialog } from "./DocumentFormDialog.tsx";
import { DocumentFilter } from "./DocumentFilter.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useDocumentList, useDocumentStats } from "@/hooks/useDocumentsQuery.ts";
import { PaginationControls } from "@/components/ui/pagination-controls.tsx";

interface DocumentManagementProps {
  documentType: DocumentType;
  title: string;
}

export const DocumentManagement = ({ documentType, title }: DocumentManagementProps) => {
  const { updateDocumentStatus } = useDocuments();

  // Local state for filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [committeeFilter, setCommitteeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch Documents
  const { data: docsData } = useDocumentList({
    type: documentType,
    status: statusFilter,
    search: searchTerm,
    page,
    pageSize
  });

  // Fetch Stats
  const { data: stats } = useDocumentStats(documentType);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, committeeFilter]);

  const handleStatusChange = (id: string, status: "pending" | "concluded") => {
    updateDocumentStatus(id, status);
  };

  const handleStatusFilterChange = (status: string) => {
      setStatusFilter(status as DocumentStatus | "all");
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Concluded {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.concluded || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Document Button */}
      <div className="flex justify-end">
        <DocumentFormDialog
          documentType={documentType}
          title={title.slice(0, -1)}
        />
      </div>

      {/* Filter Component */}
      <DocumentFilter
        title={title}
        onSearchChange={setSearchTerm}
        onStatusChange={handleStatusFilterChange}
        onCommitteeChange={setCommitteeFilter}
      />

      {/* Documents Tabs */}
      <Tabs defaultValue="all" className="mt-6" onValueChange={(val) => setStatusFilter(val === "pending" ? "pending" : "all")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All {title}</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {docsData && docsData.data.length > 0 ? (
            <>
                <div className="grid gap-4 md:grid-cols-2">
                {docsData.data.map((doc) => (
                    <DocumentCard
                    key={doc.id}
                    document={doc}
                    showActions
                    onStatusChange={handleStatusChange}
                    />
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
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">No {title.toLowerCase()} found matching your criteria</p>
                {/* 
                   Logic to show 'Create Your First' button if empty was dependent on baseDocuments.
                   Now dependent on total count being 0.
                */}
                {(stats?.total === 0) && (
                  <DocumentFormDialog
                    documentType={documentType}
                    title={title.slice(0, -1)}
                  >
                    <button type="button" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                      Create Your First {title.slice(0, -1)}
                    </button>
                  </DocumentFormDialog>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {docsData && docsData.data.length > 0 ? (
            <>
                <div className="grid gap-4 md:grid-cols-2">
                {docsData.data.map((doc) => (
                    <DocumentCard
                    key={doc.id}
                    document={doc}
                    showActions
                    onStatusChange={handleStatusChange}
                    />
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
            <p className="text-center py-8 text-muted-foreground">No pending {title.toLowerCase()} found</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
