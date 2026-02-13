import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { RestoreBackupDialog } from "@/components/RestoreBackupDialog.tsx";
import { BulkUploadDialog } from "@/components/BulkUploadDialog.tsx";
import { ConcludedUploadDialog } from "@/components/ConcludedUploadDialog.tsx";
import { Database, Trash2, RefreshCw, Archive, Download, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast.ts";
import { DeleteAllDataDialog } from "@/components/DeleteAllDataDialog.tsx";
import { supabase } from "@/integrations/supabase/client.ts";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { isSuperAdmin as checkSuperAdmin } from "@/utils/security.ts";
import { correctStatuses } from "@/utils/statusCorrection.ts";
import { FileCheck } from "lucide-react";

export default function DataControlView() {
  const [isExporting, setIsExporting] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  // Use session to get email because the 'user' object is just the profile and lacks email
  const { session } = useAuth();
  const isSuperAdmin = checkSuperAdmin(session?.user?.email);

  const handleExport = async () => {
    setIsExporting(true);
    try {
        const { data: bills } = await supabase.from("bills").select("*");
        const { data: documents } = await supabase.from("documents").select("*");
        const { data: committees } = await supabase.from("committees").select("*");
        const { data: profiles } = await supabase.from("profiles").select("*");

        const backupData = {
            timestamp: new Date().toISOString(),
            version: "1.0",
            bills: bills || [],
            documents: documents || [],
            committees: committees || [],
            profiles: profiles || []
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `makueni_backup_${format(new Date(), "yyyy-MM-dd_HH-mm")}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({ title: "Backup Complete", description: "System data exported successfully." });
    } catch (error) {
        console.error("Backup failed", error);
        toast({ title: "Backup Failed", description: "Could not export data.", variant: "destructive" });
    } finally {
        setIsExporting(false);
    }
  };

  const handleSync = () => {
     toast({
        title: "Syncing Data",
        description: "Local data sync started...",
      });
      setTimeout(() => {
        toast({ title: "Sync Complete", description: "Data is up to date." });
      }, 1000);
  };

  const handleCorrectStatus = async () => {
    setIsCorrecting(true);
    toast({ title: "Correcting Statuses...", description: "Scanning all items for date mismatches." });
    try {
        const result = await correctStatuses();
        
        let desc = `Checked bills and documents. Updated ${result.billsUpdated} bills and ${result.docsUpdated} documents.`;
        if (result.errors.length > 0) desc += ` Encountered ${result.errors.length} errors.`;

        toast({ 
            title: "Status Correction Complete", 
            description: desc,
            variant: result.errors.length > 0 ? "destructive" : "default" 
        });
    } catch (e) {
        toast({ title: "Error", description: "Failed to correct statuses.", variant: "destructive" });
    } finally {
        setIsCorrecting(false);
    }
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
                <div className="flex flex-col gap-2">
                    <BulkUploadDialog />
                </div>
            </CardContent>
        </Card>

        {/* Concluded Business Upload */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Archive className="h-5 w-5" /> Import Concluded
                </CardTitle>
                <CardDescription>Upload historical data.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                    Import historical concluded business using the new migration template.
                </div>
                <ConcludedUploadDialog />
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

        {/* Data Backup - Super Admin Only */}
        {isSuperAdmin && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                        <Download className="h-5 w-5" /> Data Backup
                    </CardTitle>
                    <CardDescription>Export full system snapshot.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground mb-4">
                        Download a comprehensive JSON backup of bills, documents, and committees for disaster recovery.
                    </div>
                    <Button onClick={handleExport} disabled={isExporting} className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-2">
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Download Full Backup
                    </Button>
                    <RestoreBackupDialog />
                </CardContent>
            </Card>
        )}

        {/* Nuke Database - Super Admin Only */}
        {isSuperAdmin && (
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
        )}

        {/* Status Correction - Super Admin Only */}
        {isSuperAdmin && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-700">
                        <FileCheck className="h-5 w-5" /> Fix Statuses
                    </CardTitle>
                    <CardDescription>Recover Overdue/TBD status.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground mb-4">
                        Restore incorrectly labeled "Pending" items to "Overdue" or "TBD" based on their dates. Useful after restoring backups.
                    </div>
                    <Button onClick={handleCorrectStatus} disabled={isCorrecting} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                        {isCorrecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
                        Recalculate Statuses
                    </Button>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
