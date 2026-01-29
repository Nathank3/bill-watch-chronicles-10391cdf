import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { toast } from "@/components/ui/use-toast.ts";
import { FileUp, Download, CheckCircle2, AlertCircle, Loader2, ClipboardPaste } from "lucide-react";
import { generateTemplate } from "@/utils/templateGenerator.ts";
import { validateBulkData, ValidationResult, BulkRow } from "@/utils/bulkUploadUtils.ts";
import { useBills } from "@/contexts/BillContext.tsx";
import { useDocuments, DocumentType } from "@/contexts/DocumentContext.tsx";
import { supabase } from "@/integrations/supabase/client.ts";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";

export const BulkUploadDialog = () => {
  const [open, setOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [committees, setCommittees] = useState<string[]>([]);
  
  const [uploadMethod, setUploadMethod] = useState<'file' | 'paste'>('file');
  const [pasteContent, setPasteContent] = useState('');
  
  const { bills, addBill } = useBills();
  const { documents, addDocument } = useDocuments();

  // Define the result type for tracking upload status per row
  interface UploadResult {
    rowNumber: number;
    title: string;
    status: 'success' | 'error';
    message?: string;
  }

  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [showResultsPhase, setShowResultsPhase] = useState(false);

  useEffect(() => {
    fetchCommittees();
  }, []);

  const fetchCommittees = async () => {
    const { data } = await supabase.from("committees").select("name").order("name");
    if (data) setCommittees(data.map(c => c.name));
  };

  const handleDownloadTemplate = (type: 'days' | 'date') => {
    generateTemplate(committees, type);
  };
// ...


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const xlsxModule = await import("xlsx");
        // Handle both default export (ESM/bundler) and named export styles
        const XLSX = xlsxModule.default || xlsxModule;
        
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "array" }); // Changed to 'array' for ArrayBuffer
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as BulkRow[];

        processData(data);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast({ 
            title: "Error", 
            description: error instanceof Error ? `Failed to parse: ${error.message}` : "Failed to parse the spreadsheet.", 
            variant: "destructive" 
        });
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePasteProcess = () => {
      if (!pasteContent.trim()) {
          toast({ title: "Empty", description: "Please paste your data first.", variant: "destructive" });
          return;
      }

      setIsParsing(true);
      try {
          // Parse TSV (Tab Separated Values) from clipboard copy
          const rows = pasteContent.trim().split('\n');
          if (rows.length < 2) {
              throw new Error("Data must have a header row and at least one data row.");
          }

          const headers = rows[0].split('\t').map(h => h.trim());
          const data: BulkRow[] = [];

          for (let i = 1; i < rows.length; i++) {
              const values = rows[i].split('\t');
              const rowObj: Record<string, string> = {};
              headers.forEach((header, index) => {
                  rowObj[header] = values[index]?.trim();
              });
              data.push(rowObj as unknown as BulkRow);
          }
          
          processData(data);

      } catch (error) {
          console.error("Error parsing text:", error);
          toast({ 
            title: "Error", 
            description: "Failed to parse pasted data. Ensure you copied a table with headers.", 
            variant: "destructive" 
        });
        setIsParsing(false);
      }
  };

  const processData = (data: BulkRow[]) => {
      if (data.length === 0) {
          toast({ title: "Empty Data", description: "No data found.", variant: "destructive" });
          setIsParsing(false);
          return;
      }

      if (data.length > 500) {
        toast({ 
            title: "Too large", 
            description: `Max 500 rows. Found ${data.length}.`, 
            variant: "destructive" 
        });
        setIsParsing(false);
        return;
    }

    const results = validateBulkData(data, bills, documents, committees);
    setValidationResults(results);
    setIsParsing(false);
  };

  const handleConfirmUpload = async () => {
    const validRows = validationResults.filter(r => r.valid);
    if (validRows.length === 0) return;

    setIsUploading(true);
    setUploadResults([]); // Reset previous results if any
    
    const currentResults: UploadResult[] = [];

    for (const row of validRows) {
      try {
        if (row.data.type === 'bill') {
          await addBill({
            title: row.data.title,
            committee: row.data.committee,
            dateCommitted: row.data.dateCommitted,
            pendingDays: row.data.pendingDays,
            presentationDate: row.data.presentationDate,
            initialStatus: row.data.status // Pass 'limbo' or 'pending'
          });
        } else {
          await addDocument({
            title: row.data.title,
            committee: row.data.committee,
            dateCommitted: row.data.dateCommitted,
            pendingDays: row.data.pendingDays,
            presentationDate: row.data.presentationDate,
            initialStatus: row.data.status,
            type: row.data.type as DocumentType
          });
        }
        currentResults.push({
            rowNumber: row.rowNumber,
            title: row.data.title,
            status: 'success'
        });
      } catch (error) {
        console.error("Failed to upload row:", row, error);
        let errorMessage = "Unknown error";
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
             errorMessage = (error as { message: string }).message;
        }

        currentResults.push({
            rowNumber: row.rowNumber,
            title: row.data.title,
            status: 'error',
            message: errorMessage
        });
      }
    }

    setUploadResults(currentResults);
    setIsUploading(false);
    setShowResultsPhase(true); // Switch to results view
  };

  const handleClose = () => {
      setOpen(false);
      setTimeout(() => {
          setValidationResults([]);
          setUploadResults([]);
          setShowResultsPhase(false);
          setIsParsing(false);
          setPasteContent('');
          // Reload if there were successful uploads to refresh data
          const hasSuccess = uploadResults.some(r => r.status === 'success');
          if (hasSuccess) {
             globalThis.location.reload();
          }
      }, 300);
  };

  // Derived counts
  const validCount = validationResults.filter(r => r.valid).length;
  const errorCount = validationResults.length - validCount;
  const uploadSuccessCount = uploadResults.filter(r => r.status === 'success').length;
  const uploadFailCount = uploadResults.filter(r => r.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={(val) => {
        if (!isUploading) setOpen(val); // Prevent closing during upload
    }}>
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

        {showResultsPhase ? (
            // --- STEP 3: RESULTS REPORT VIEW ---
            <div className="space-y-6 py-4">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            {uploadSuccessCount} Uploaded
                        </div>
                        {uploadFailCount > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                <AlertCircle className="h-4 w-4" />
                                {uploadFailCount} Failed
                            </div>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto border rounded-md divide-y">
                        {uploadResults.map((result, i) => (
                            <div key={i} className={`p-3 text-sm flex justify-between items-start ${result.status === 'success' ? 'bg-green-50/20' : 'bg-red-50/20'}`}>
                                <div className="flex-1 mr-4">
                                     <div className="font-medium flex items-center gap-2">
                                        Row {result.rowNumber}: <span className="font-normal text-muted-foreground truncate max-w-[300px]">{result.title}</span>
                                     </div>
                                     {result.status === 'error' && (
                                         <p className="text-red-600 mt-1 text-xs font-mono bg-red-50 p-1 rounded">
                                             Error: {result.message}
                                         </p>
                                     )}
                                </div>
                                {result.status === 'success' ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleClose} className="w-full sm:w-auto min-w-[120px]">
                            {uploadSuccessCount > 0 ? "Done & Reload" : "Close"}
                        </Button>
                    </div>
                </div>
            </div>
        ) : (
            // --- STEPS 1 & 2: VALIDATION VIEW ---
            <div className="space-y-6 py-4">
              {/* Toggle Method */}
              <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                  <button 
                    type="button"
                    onClick={() => setUploadMethod('file')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${uploadMethod === 'file' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                      Upload File
                  </button>
                  <button 
                    type="button"
                    onClick={() => setUploadMethod('paste')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${uploadMethod === 'paste' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                      Paste Data
                  </button>
              </div>

              {uploadMethod === 'file' ? (
                   <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                       <div className="flex justify-between items-center">
                            <h3 className="font-medium">File Upload</h3>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="gap-2 h-8">
                                        <Download className="h-3 w-3" /> Template
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleDownloadTemplate('days')}>
                                        With Pending Days
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownloadTemplate('date')}>
                                        With Due Date
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                       </div>
                       <Input
                         type="file"
                         accept=".xlsx, .xls, .csv"
                         onChange={handleFileUpload}
                         disabled={isParsing || isUploading}
                         className="cursor-pointer"
                       />
                       <p className="text-xs text-muted-foreground">Supports Excel (.xlsx) and CSV.</p>
                   </div>
              ) : (
                  <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                       <div className="flex justify-between items-center">
                            <h3 className="font-medium">Paste Data</h3>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="gap-2 h-8">
                                        <Download className="h-3 w-3" /> Template
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleDownloadTemplate('days')}>
                                        With Pending Days
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownloadTemplate('date')}>
                                        With Due Date
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                       </div>
                       <textarea 
                           className="w-full h-32 p-3 text-xs font-mono border rounded-md focus:ring-2 ring-primary/20 outline-none resize-none"
                           placeholder={`Paste headers and rows here...\nExample:\nBusiness Name\tCommittee\tType of Business\t...\nMy Motion\tHealth\tMotion\t...`}
                           value={pasteContent}
                           onChange={(e) => setPasteContent(e.target.value)}
                       />
                       <Button onClick={handlePasteProcess} size="sm" className="w-full gap-2" disabled={isParsing || !pasteContent}>
                           <ClipboardPaste className="h-4 w-4" /> Parse Paste
                       </Button>
                  </div>
              )}
    
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
                    {validationResults.map((result, i) => {
                      const hasWarnings = result.warnings && result.warnings.length > 0;
                      const bgClass = !result.valid ? 'bg-red-50/30' : hasWarnings ? 'bg-amber-50/30' : 'bg-green-50/30';
    
                      return (
                        <div key={i} className={`p-3 text-sm flex justify-between items-start ${bgClass}`}>
                          <div>
                            <span className="font-semibold mr-2">{result.rowNumber}:</span>
                            {!result.valid ? (
                               <ul className="list-disc list-inside text-red-600 mt-1">
                                 {result.errors.map((err, ei) => <li key={ei}>{err}</li>)}
                               </ul>
                            ) : result.data ? (
                              <>
                                 <div className="flex items-center gap-2">
                                     <span className="font-medium truncate max-w-[200px]">{result.data.title}</span>
                                     <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary">
                                         {result.data.type}
                                     </span>
                                     {result.data.status === 'limbo' && (
                                         <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-200 text-slate-700">
                                             LIMBO
                                         </span>
                                     )}
                                 </div>
                                 {hasWarnings && (
                                   <ul className="list-disc list-inside text-amber-600 mt-1 text-xs">
                                     {result.warnings!.map((warn, wi) => <li key={wi}>{warn}</li>)}
                                   </ul>
                                 )}
                              </>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
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
        )}
      </DialogContent>
    </Dialog>
  );
};

const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
);
