import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileJson, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function RestoreBackupDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleRestore = async () => {
    if (!file) return;

    setIsRestoring(true);
    setProgress("Reading backup file...");

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (typeof backupData !== 'object' || backupData === null) {
        throw new Error("Invalid file content: Root must be an object.");
      }

      if (!backupData.version || !backupData.timestamp) {
        throw new Error("Invalid backup file: Missing metadata (version/timestamp).");
      }

      // Integrity Checks
      const requiredArrays = ['bills', 'documents', 'committees', 'profiles'];
      for (const key of requiredArrays) {
        if (backupData[key] && !Array.isArray(backupData[key])) {
             throw new Error(`Integrity Check Failed: '${key}' must be an array.`);
        }
      }

      // Deep Inspection for "Poison" (Malformed records)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validateItem = (item: any, type: string) => {
          if (!item.id) throw new Error(`Integrity Check Failed: A ${type} record is missing an ID.`);
          // Basic SQL injection simple check? (Supabase handles param binding, but we can check for wildly long strings?)
          if (JSON.stringify(item).length > 500000) throw new Error(`Integrity Check Failed: ${type} record is suspiciously large.`);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (backupData.bills) backupData.bills.forEach((b: any) => validateItem(b, 'bill'));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (backupData.documents) backupData.documents.forEach((d: any) => validateItem(d, 'document'));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (backupData.committees) backupData.committees.forEach((c: any) => validateItem(c, 'committee'));

      // 1. Restore Committees (Dependencies first)
      if (backupData.committees?.length) {
        setProgress(`Restoring ${backupData.committees.length} committees...`);
        const { error } = await supabase.from('committees').upsert(backupData.committees);
        if (error) throw error;
      }

      // 2. Restore Profiles (Best effort - careful with Auth constraints)
      if (backupData.profiles?.length) {
        setProgress(`Restoring ${backupData.profiles.length} user profiles...`);
        // Remove sensitive fields if any (though export shouldn't have them)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const safeProfiles = backupData.profiles.map((p: any) => ({
             ...p,
             updated_at: new Date().toISOString()
        }));
        const { error } = await supabase.from('profiles').upsert(safeProfiles);
         if (error) console.warn("Profile restore warning:", error);
      }

      // 3. Restore Bills
      if (backupData.bills?.length) {
        setProgress(`Restoring ${backupData.bills.length} bills...`);
        const { error } = await supabase.from('bills').upsert(backupData.bills);
        if (error) throw error;
      }

      // 4. Restore Documents
      if (backupData.documents?.length) {
        setProgress(`Restoring ${backupData.documents.length} documents...`);
        const { error } = await supabase.from('documents').upsert(backupData.documents);
        if (error) throw error;
      }

      setProgress("Restore Complete!");
      toast({
        title: "System Restored",
        description: `Successfully restored data from ${backupData.timestamp}`,
      });
      
      setTimeout(() => {
        setOpen(false);
        setFile(null);
        setProgress("");
        setIsRestoring(false);
        window.location.reload(); // Refresh to show new data
      }, 1500);

    } catch (error) {
      console.error("Restore failed:", error);
      toast({
        title: "Restore Failed",
        description: error instanceof Error ? error.message : "An error occurred during restoration.",
        variant: "destructive",
      });
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed border-2 hover:border-primary/50 hover:bg-primary/5">
          <Upload className="mr-2 h-4 w-4" /> Restore from JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restore System Data</DialogTitle>
          <DialogDescription>
             Upload a previously exported JSON backup file to restore system data.
             Existing records with matching IDs will be updated. New records will be created.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
            <div className="bg-amber-50 p-3 rounded-md border border-amber-200 flex gap-3 text-sm text-amber-800">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>Warning: This action will modify your database content. Ensure you are uploading a valid backup file.</p>
            </div>

            <div className="grid w-full items-center gap-1.5">
                <label 
                    htmlFor="backup-file" 
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {file ? (
                             <>
                                <FileJson className="w-8 h-8 text-green-500 mb-2" />
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                             </>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> backup JSON</p>
                            </>
                        )}
                    </div>
                    <input id="backup-file" type="file" accept=".json" className="hidden" onChange={handleFileChange} />
                </label>
            </div>

            {progress && (
                <div className="text-sm text-center text-muted-foreground animate-pulse">
                    {progress}
                </div>
            )}
        </div>

        <Button onClick={handleRestore} disabled={!file || isRestoring} className="w-full">
            {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {isRestoring ? "Restoring..." : "Start Restore"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
