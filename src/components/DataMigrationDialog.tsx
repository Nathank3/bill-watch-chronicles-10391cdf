import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { toast } from "@/components/ui/use-toast.ts";
import { supabase } from "@/integrations/supabase/client.ts";
import { Loader2, UploadCloud } from "lucide-react";


interface LocalBill {
  title: string;
  committee: string;
  dateCommitted?: string;
  createdAt?: string;
  pendingDays?: number;
  status: string;
  presentationDate: string;
  daysAllocated?: number;
  currentCountdown?: number;
  extensionsCount?: number;
}

interface LocalDocument extends LocalBill {
  type: string;
}

export function DataMigrationDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ bills: 0, documents: 0 });

  useEffect(() => {
    if (open) {
      const storedBills = localStorage.getItem("bills");
      const storedDocs = localStorage.getItem("documents");
      setStats({
        bills: storedBills ? JSON.parse(storedBills).length : 0,
        documents: storedDocs ? JSON.parse(storedDocs).length : 0,
      });
    }
  }, [open]);

  const handleMigration = async () => {
    setLoading(true);
    try {
      // Get current user for 'created_by' field
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || "unknown";

      // 1. Migrate Bills
      const storedBills = localStorage.getItem("bills");
      let billsMigratedCount = 0;
      
      if (storedBills) {
        const localBills = (JSON.parse(storedBills) as LocalBill[]).map((b) => ({
             title: b.title,
             committee: b.committee,
             date_committed: b.dateCommitted || b.createdAt || new Date().toISOString(),
             pending_days: b.pendingDays || 0,
             status: b.status,
             presentation_date: b.presentationDate,
             days_allocated: b.daysAllocated || b.pendingDays || 0,
             current_countdown: b.currentCountdown || 0,
             extensions_count: b.extensionsCount || 0,
             created_at: b.createdAt || new Date().toISOString(),
             updated_at: new Date().toISOString(),
             created_by: userId,
             department: "Legal", // Default
             mca: "System" // Default
        }));

        if (localBills.length > 0) {
          // Deduplication: Fetch existing titles
          const { data: existingBills } = await supabase
            .from('bills')
            .select('title');
            
          const existingTitles = new Set(existingBills?.map(b => b.title) || []);
          
          const newBills = localBills.filter((b) => !existingTitles.has(b.title));
          
          if (newBills.length > 0) {
             const { error } = await supabase.from('bills').insert(newBills);
             if (error) throw error;
             billsMigratedCount = newBills.length;
          }
        }
      }

      // 2. Migrate Documents
      const storedDocs = localStorage.getItem("documents");
      let docsMigratedCount = 0;

      if (storedDocs) {
        const localDocs = (JSON.parse(storedDocs) as LocalDocument[]).map((d) => ({
             title: d.title,
             committee: d.committee,
             date_committed: d.dateCommitted || d.createdAt || new Date().toISOString(),
             pending_days: d.pendingDays || 0,
             status: d.status,
             presentation_date: d.presentationDate,
             type: d.type, 
             days_allocated: d.daysAllocated || d.pendingDays || 0,
             current_countdown: d.currentCountdown || 0,
             extensions_count: d.extensionsCount || 0,
             created_at: d.createdAt || new Date().toISOString(),
             updated_at: new Date().toISOString()
        }));

        if (localDocs.length > 0) {
           // Deduplication: Fetch existing titles
           const { data: existingDocs } = await supabase
            .from('documents')
            .select('title');
            
           const existingDocTitles = new Set(existingDocs?.map(d => d.title) || []);
           
           const newDocs = localDocs.filter((d) => !existingDocTitles.has(d.title));

           if (newDocs.length > 0) {
             const { error } = await supabase.from('documents').insert(newDocs);
             if (error) throw error;
             docsMigratedCount = newDocs.length;
           }
        }
      }

      toast({
        title: "Migration Complete",
        description: `Successfully uploaded ${billsMigratedCount} new bills and ${docsMigratedCount} new documents. Skipped duplicates.`,
      });
      setOpen(false);
      
      // Force reload to see new data
      globalThis.location.reload();

    } catch (error) {
      console.error("Migration failed:", error);
      toast({
        title: "Migration Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UploadCloud className="h-4 w-4" />
          Sync Local Data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Migrate to Cloud Database</DialogTitle>
          <DialogDescription>
            This will upload your local data to the central Supabase database.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-2">
          <p className="font-medium">Found in Local Storage:</p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            <li>{stats.bills} Bills</li>
            <li>{stats.documents} Other Documents</li>
          </ul>
          <p className="text-xs text-blue-600 mt-4">
            Smart Sync: Items with matching titles in the database will be skipped to prevent duplicates.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleMigration} disabled={loading || (stats.bills === 0 && stats.documents === 0)}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sync Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
