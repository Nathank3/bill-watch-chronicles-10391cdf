
import { useState, useEffect } from "react";
import { useDocuments, DocumentType } from "@/contexts/DocumentContext";
import { DocumentCard } from "./DocumentCard";
import { DocumentFormDialog } from "./DocumentFormDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DocumentManagementProps {
  documentType: DocumentType;
  title: string;
}

export const DocumentManagement = ({ documentType, title }: DocumentManagementProps) => {
  const { documents, pendingDocuments, concludedDocuments, updateDocumentStatus } = useDocuments();
  const [filteredDocuments, setFilteredDocuments] = useState(documents.filter(doc => doc.type === documentType));

  useEffect(() => {
    setFilteredDocuments(documents.filter(doc => doc.type === documentType));
  }, [documents, documentType]);

  const handleStatusChange = (id: string, status: "pending" | "concluded") => {
    updateDocumentStatus(id, status);
  };

  const pendingDocs = pendingDocuments(documentType);
  const concludedDocs = concludedDocuments(documentType);
  const totalDocs = filteredDocuments.length;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDocs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Concluded {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{concludedDocs.length}</div>
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
                <p className="text-muted-foreground mb-4">No {title.toLowerCase()} have been created yet</p>
                <DocumentFormDialog 
                  documentType={documentType} 
                  title={title.slice(0, -1)}
                >
                  <button className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                    Create Your First {title.slice(0, -1)}
                  </button>
                </DocumentFormDialog>
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
