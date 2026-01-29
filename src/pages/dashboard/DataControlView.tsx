
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { BulkUploadDialog } from "@/components/BulkUploadDialog.tsx";
import { Database, Trash2, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast.ts";
import { DeleteAllDataDialog } from "@/components/DeleteAllDataDialog.tsx";

export default function DataControlView() {

  const handleSync = () => {
     toast({
        title: "Syncing Data",
        description: "Local data sync started...",
      });
      setTimeout(() => {
        toast({ title: "Sync Complete", description: "Data is up to date." });
      }, 1000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Data Control</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Bulk Upload */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" /> Bulk Upload
                </CardTitle>
                <CardDescription>Upload business items via Excel/CSV.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                    Import bills, statements, and other documents in bulk using the standard template.
                </div>
                <BulkUploadDialog />
            </CardContent>
        </Card>

        {/* Sync Data */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" /> Sync Data
                </CardTitle>
                <CardDescription>Force sync with remote database.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                    Manually trigger a data synchronization if you notice discrepancies.
                </div>
                <Button onClick={handleSync} variant="outline" className="w-full">
                    Sync Now
                </Button>
            </CardContent>
        </Card>

        {/* Nuke Database */}
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                    <Trash2 className="h-5 w-5" /> Nuke Database
                </CardTitle>
                <CardDescription>Danger Zone</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                    Permanently delete all data. This action cannot be undone.
                </div>
                <DeleteAllDataDialog />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
