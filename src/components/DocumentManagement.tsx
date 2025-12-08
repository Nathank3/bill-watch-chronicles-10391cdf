
import { useState, useEffect } from "react";
import { useDocuments, DocumentType, Document } from "@/contexts/DocumentContext";
import { DocumentCard } from "./DocumentCard";
import { DocumentFormDialog } from "./DocumentFormDialog";
import { DocumentFilter } from "./DocumentFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DocumentManagementProps {
  documentType: DocumentType;
  title: string;
}

export const DocumentManagement = ({ documentType, title }: DocumentManagementProps) => {
  const { documents, updateDocumentStatus } = useDocuments();

  // Base documents of the specific type
  const [baseDocuments, setBaseDocuments] = useState<Document[]>([]);

  // Documents after being filtered by the DocumentFilter component
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);

  // Update base documents when global documents change or type changes
  useEffect(() => {
    const typeDocs = documents.filter(doc => doc.type === documentType);
    setBaseDocuments(typeDocs);
    // Initialize filtered documents with type documents initially
    // The Filter component will run its effect and update this shortly after,
    // but this prevents a flash of empty content
    setFilteredDocuments(typeDocs);
  }, [documents, documentType]);

  const handleStatusChange = (id: string, status: "pending" | "concluded") => {
    updateDocumentStatus(id, status);
  };

  const handleFilterChange = (filtered: Document[]) => {
    setFilteredDocuments(filtered);
  };

  // Derive counts from the *base* documents (unfiltered stats)
  const totalBaseDocs = baseDocuments.length;
  const pendingBaseDocs = baseDocuments.filter(d => d.status === "pending" || d.status === "overdue").length;
  const concludedBaseDocs = baseDocuments.filter(d => d.status === "concluded").length;

  // Filtered lists for the view
  const pendingDocs = filteredDocuments.filter(
    doc => doc.status === "pending" || doc.status === "overdue"
  );

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBaseDocs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingBaseDocs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Concluded {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{concludedBaseDocs}</div>
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
        documents={baseDocuments}
        onFilterChange={handleFilterChange}
        title={title}
      />

      {/* Documents Tabs */}
      <Tabs defaultValue="all" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All {title}</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {filteredDocuments && filteredDocuments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  showActions={true}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">No {title.toLowerCase()} found matching your criteria</p>
                {baseDocuments.length === 0 && (
                  <DocumentFormDialog
                    documentType={documentType}
                    title={title.slice(0, -1)}
                  >
                    <button className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                      Create Your First {title.slice(0, -1)}
                    </button>
                  </DocumentFormDialog>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {pendingDocs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  showActions={true}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No pending {title.toLowerCase()} found</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
