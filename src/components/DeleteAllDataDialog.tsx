import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "@/components/ui/use-toast.ts";
import { supabase } from "@/integrations/supabase/client.ts";
import { Trash2, AlertTriangle } from "lucide-react";

export function DeleteAllDataDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const CONFIRMATION_KEY = "DELETE";

  const handleDeleteAll = async () => {
    if (confirmText !== CONFIRMATION_KEY) return;
    
    setLoading(true);
    try {
      // Delete all documents
      const { error: docError } = await supabase
        .from('documents')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete not equal to nil UUID (effectively all)
        
      if (docError) throw docError;

      // Delete all bills
      const { error: billError } = await supabase
        .from('bills')
        .delete()
         .neq('id', '00000000-0000-0000-0000-000000000000');
         
      if (billError) throw billError;

      toast({
        title: "All Data Deleted",
        description: "The database has been completely wiped.",
        variant: "destructive" 
      });
      
      setOpen(false);
      // Reload to clear local state
      globalThis.location.reload();
      
    } catch (error) {
      console.error("Delete failed:", error);
      toast({
        title: "Delete Failed",
        description: "Could not wipe data. You may have insufficient permissions.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="gap-2 w-full">
          <Trash2 className="h-4 w-4" />
          Reset Database
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-red-500 border-2">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete ALL Data?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="font-bold text-red-600">
              WARNING: This action cannot be undone.
            </p>
            <p>
              This will permanently delete ALL Bills, Statements, Reports, and other documents from the database. 
              The application will be reset to an empty state.
            </p>
            <div className="p-3 bg-red-50 border border-red-100 rounded-md">
              <p className="text-sm text-red-800 mb-2">
                Type <strong>{CONFIRMATION_KEY}</strong> below to confirm:
              </p>
              <Input 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="border-red-200 focus-visible:ring-red-500"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              handleDeleteAll();
            }}
            disabled={loading || confirmText !== CONFIRMATION_KEY}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Deleting..." : "Permanently Delete All"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
