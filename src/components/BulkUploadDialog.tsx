
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { toast } from "@/components/ui/use-toast.ts";
import { FileUp, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { generateTemplate } from "@/utils/templateGenerator.ts";
import { validateBulkData, ValidationResult, BulkRow } from "@/utils/bulkUploadUtils.ts";
import { useBills } from "@/contexts/BillContext.tsx";
import { useDocuments, DocumentType } from "@/contexts/DocumentContext.tsx";
import { supabase } from "@/integrations/supabase/client.ts";

export const BulkUploadDialog = () => {
  const [open, setOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [committees, setCommittees] = useState<string[]>([]);
  const [templateType, setTemplateType] = useState<'days' | 'date'>('days');
  
  const { bills, addBill } = useBills();
  const { documents, addDocument } = useDocuments();

  useEffect(() => {
    fetchCommittees();
  }, []);

  const fetchCommittees = async () => {
    const { data } = await supabase.from("committees").select("name").order("name");
    if (data) setCommittees(data.map(c => c.name));
  };

  const handleDownloadTemplate = () => {
    generateTemplate(committees, templateType);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as BulkRow[];

        if (data.length === 0) {
          toast({ title: "Empty File", description: "No data found in the spreadsheet.", variant: "destructive" });
          setIsParsing(false);
          return;
        }

        const results = validateBulkData(data, bills, documents, committees);
        setValidationResults(results);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast({ title: "Error", description: "Failed to parse the spreadsheet.", variant: "destructive" });
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmUpload = async () => {
    const validRows = validationResults.filter(r => r.valid);
    if (validRows.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const row of validRows) {
      try {
        if (row.data.type === 'bill') {
          await addBill({
            title: row.data.title,
            committee: row.data.committee,
            dateCommitted: row.data.dateCommitted,
            pendingDays: row.data.pendingDays
          });
        } else {
          await addDocument({
            title: row.data.title,
            committee: row.data.committee,
            dateCommitted: row.data.dateCommitted,
            pendingDays: row.data.pendingDays,
            type: row.data.type as DocumentType
          });
        }
        successCount++;
      } catch (error) {
        console.error("Failed to upload row:", row, error);
        failCount++;
      }
    }

    setIsUploading(false);
    toast({
      title: "Upload Complete",
      description: `Successfully added ${successCount} items.${failCount > 0 ? ` Failed to add ${failCount} items.` : ""}`,
    });
    
    if (failCount === 0) {
      setValidationResults([]);
      // Force reload to see new data immediately
      setTimeout(() => {
        globalThis.location.reload();
      }, 500);
    }
  };

  const validCount = validationResults.filter(r => r.valid).length;
  const errorCount = validationResults.length - validCount;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FileUp className="h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Business Upload</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex justify-between items-start sm:items-center">
              <div>
                <h3 className="font-medium">Step 1: Get the Template</h3>
                <p className="text-sm text-muted-foreground">Download the spreadsheet guide for the correct format.</p>
              </div>
              <Button onClick={handleDownloadTemplate} variant="secondary" className="gap-2 shrink-0">
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>
            
            <div className="flex gap-6 mt-2 pt-4 border-t">
               <div className="text-sm font-medium pt-1">Template Format:</div>
               <div className="flex flex-col sm:flex-row gap-4">
                 <label className="flex items-center space-x-2 cursor-pointer">
                   <input 
                      type="radio" 
                      name="templateType" 
                      checked={templateType === 'days'} 
                      onChange={() => setTemplateType('days')}
                      className="accent-primary h-4 w-4"
                   />
                   <span className="text-sm">Standard (Days Given)</span>
                 </label>
                 <label className="flex items-center space-x-2 cursor-pointer">
                   <input 
                      type="radio" 
                      name="templateType" 
                      checked={templateType === 'date'} 
                      onChange={() => setTemplateType('date')}
                      className="accent-primary h-4 w-4"
                   />
                   <span className="text-sm">Date Based (Due Date)</span>
                 </label>
               </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Step 2: Upload Filename</h3>
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                disabled={isParsing || isUploading}
                className="cursor-pointer"
              />
              {isParsing && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            </div>
          </div>

          {validationResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  {validCount} Valid
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    <AlertCircle className="h-4 w-4" />
                    {errorCount} Errors
                  </div>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
                {validationResults.map((result, i) => (
                  <div key={i} className={`p-3 text-sm flex justify-between items-start ${result.valid ? 'bg-green-50/30' : 'bg-red-50/30'}`}>
                    <div>
                      <span className="font-semibold mr-2">Row {result.rowNumber}:</span>
                      {result.valid ? (
                        <span className="text-muted-foreground">{result.data.title} ({result.data.type})</span>
                      ) : (
                        <ul className="list-disc list-inside text-red-600 mt-1">
                          {result.errors.map((err, ei) => <li key={ei}>{err}</li>)}
                        </ul>
                      )}
                    </div>
                    {result.valid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleConfirmUpload} 
                className="w-full gap-2" 
                disabled={validCount === 0 || isUploading}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirm and Upload {validCount} Items
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Help helper for input
const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
);
