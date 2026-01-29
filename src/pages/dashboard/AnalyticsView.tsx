
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { DatePickerWithRange } from "@/components/ui/date-range-picker.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { DateRange } from "react-day-picker";
import { Download, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client.ts";
import { toast } from "@/components/ui/use-toast.ts";
import { format } from "date-fns";
import { addHeaderImage, drawDivider } from "@/utils/pdfUtils.ts";

export default function AnalyticsView() {
  const [committees, setCommittees] = useState<{name: string}[]>([]);

  // Standard Report State
  const [stdType, setStdType] = useState<string>("bills");
  const [stdStatus, setStdStatus] = useState<string>("all");
  const [stdCommittee, setStdCommittee] = useState<string>("all");
  const [stdDate, setStdDate] = useState<DateRange | undefined>();

  // Exception Report State
  const [excType, setExcType] = useState<string>("all_business");
  const [excStatus, setExcStatus] = useState<string>("limbo");
  const [excCommittee, setExcCommittee] = useState<string>("all");

  useEffect(() => {
    const fetchCommittees = async () => {
      const { data } = await supabase.from("committees").select("name").order("name");
      if (data) setCommittees(data);
    };
    fetchCommittees();
  }, []);

  const generateStandardReport = async () => {
    toast({ title: "Generating Standard Report...", description: "Please wait." });
    try {
      let data: any[] | null = null;
      let error = null;

      let query = stdType === "bills" 
        ? supabase.from("bills").select("*").limit(1000)
        : supabase.from("documents").select("*").limit(1000);

      if (stdType !== "bills" && stdType !== "all_business") {
           query = query.eq("type", stdType.slice(0, -1)); 
      }
      
      if (stdStatus !== "all") query = query.eq("status", stdStatus);
      if (stdCommittee !== "all") query = query.eq("committee", stdCommittee);
      if (stdDate?.from) query = query.gte("created_at", stdDate.from.toISOString());
      if (stdDate?.to) {
          const end = new Date(stdDate.to);
          end.setHours(23, 59, 59);
          query = query.lte("created_at", end.toISOString());
      }

      const result = await query;
      data = result.data;
      error = result.error;

      if (error) throw error;
      if (!data || data.length === 0) {
          toast({ title: "No data found", description: "Try adjusting your filters.", variant: "destructive" });
          return;
      }

      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();
      const headerHeight = await addHeaderImage(doc, "/header_logo.png");
      let startY = headerHeight > 0 ? headerHeight + 5 : 20;

      // Draw divider line below header
      if (headerHeight > 0) {
          startY = drawDivider(doc, startY, 15, 15);
          startY += 10;
      }

      doc.setFontSize(14);
      doc.setFont("times", "bold");
      const titleText = `REPORT: ${stdType.toUpperCase()}`;
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginLeft = 15;
      const maxWidth = pageWidth - (marginLeft * 2);
      
      doc.text(titleText, pageWidth / 2, startY, { align: "center" });
      
      const lineY = startY + 8;
      doc.setLineWidth(0.5);
      doc.line(marginLeft, lineY, marginLeft + maxWidth, lineY);

      startY += 18;
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${format(new Date(), "PPP")}`, 14, startY);
      startY += 10;
      
      const tableData = data.map(item => {
          let statusDisplay = item.status;
          if (item.status === "limbo" && item.status_reason) {
              statusDisplay = `Limbo - ${item.status_reason}`;
          }
          return [
              item.title,
              item.committee,
              statusDisplay,
              format(new Date(item.created_at), "dd/MM/yyyy")
          ];
      });

      autoTable(doc, {
          startY,
          head: [['Title', 'Committee', 'Status', 'Date']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
          margin: { top: 20, right: 15, bottom: 10, left: 15 },
          columnStyles: {
            0: { cellWidth: 75, overflow: 'linebreak' }, // Title (Increased)
            1: { cellWidth: 30, overflow: 'linebreak' }, // Committee (Decreased)
            2: { cellWidth: 40 },
            3: { cellWidth: 35 }
          }
      });

      doc.save(`${stdType}_report.pdf`);
      toast({ title: "Report Ready", description: "Download started." });

     } catch (e) {
         console.error(e);
         toast({ title: "Error", description: "Failed to generate report.", variant: "destructive" });
     }
  };

  const generateExceptionReport = async () => {
    toast({ title: "Generating Exception Report...", description: "Please wait." });
    try {
        // Define interface for combined items
        interface ExceptionItem {
            title: string;
            committee: string;
            status: string;
            status_reason?: string;
            type?: string; 
            itemType: string; // "Bill" or document type
        }

        let allItems: ExceptionItem[] = [];
        
        // Helper to query one table
        const queryTable = async (table: "bills" | "documents") => {
            let query = supabase.from(table).select("*");
            
            // Filter Logic
            if (excStatus !== "all") query = query.eq("status", excStatus);
            if (excCommittee !== "all") query = query.eq("committee", excCommittee);
            
            // Strict type filtering if not 'all_business'
            if (excType !== "all_business") {
                if (table === "bills" && excType !== "bills") return [];
                if (table === "documents" && excType === "bills") return [];
                if (table === "documents" && excType !== "bills") {
                    query = query.eq("type", excType.slice(0, -1));
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            
            // Cast and map to ExceptionItem
            return (data || []).map((d: any) => ({
                title: d.title,
                committee: d.committee,
                status: d.status,
                status_reason: d.status_reason,
                type: d.type,
                itemType: table === "bills" ? "Bill" : d.type 
            })) as ExceptionItem[];
        };

        const bills = await queryTable("bills");
        const docs = await queryTable("documents");
        allItems = [...bills, ...docs];

        if (allItems.length === 0) {
            toast({ title: "No data found", description: "No items match criteria.", variant: "destructive" });
            return;
        }

        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        const doc = new jsPDF();
        const headerHeight = await addHeaderImage(doc, "/header_logo.png");
        let startY = headerHeight > 0 ? headerHeight + 5 : 20;

        // Draw divider line below header
        if (headerHeight > 0) {
            startY = drawDivider(doc, startY, 15, 15);
            startY += 10;
        }

        doc.setFontSize(14);
        doc.setFont("times", "bold");
        const titleText = `EXCEPTION REPORT: ${excStatus.toUpperCase()} BUSINESS`;
        const pageWidth = doc.internal.pageSize.getWidth();
        const marginLeft = 15;
        const maxWidth = pageWidth - (marginLeft * 2);

        doc.text(titleText, pageWidth / 2, startY, { align: "center" });
        
        const lineY = startY + 8;
        doc.setLineWidth(0.5);
        doc.line(marginLeft, lineY, marginLeft + maxWidth, lineY);

        startY += 18;

        doc.setFontSize(10);
        doc.text(`Type: ${excType === 'all_business' ? 'All Types' : excType} | Filter: ${excCommittee}`, 14, startY);
        startY += 10;

        const tableData = allItems.map(item => ([
            item.title,
            item.itemType, // "Bill" or "motion/statement/etc"
            item.committee,
            item.status_reason || "No reason recorded"
        ]));

        autoTable(doc, {
            startY,
            head: [['Title', 'Type', 'Committee', 'Reason / Details']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
            margin: { top: 20, right: 15, bottom: 10, left: 15 },
            columnStyles: { 
                0: { cellWidth: 72, overflow: 'linebreak' }, // Title (Increased)
                1: { cellWidth: 30 },
                2: { cellWidth: 28, overflow: 'linebreak' }, // Committee (Decreased)
                3: { cellWidth: 50, overflow: 'linebreak' }
            }
        });

        doc.save(`Exception_Report_${excStatus}.pdf`);
        toast({ title: "Report Ready", description: "Exception report created." });

    } catch (error) {
        console.error("Exception report failed", error);
        toast({ title: "Error", description: "Failed to generate report.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
      
      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standard">Standard Reports</TabsTrigger>
            <TabsTrigger value="exception">Exception Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="standard">
            <Card>
                <CardHeader>
                    <CardTitle>Standard Report Generator</CardTitle>
                    <CardDescription>Generate timed reports based on Date Range.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Business Type</label>
                            <Select value={stdType} onValueChange={setStdType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bills">Bills</SelectItem>
                                    <SelectItem value="motions">Motions</SelectItem>
                                    <SelectItem value="statements">Statements</SelectItem>
                                    <SelectItem value="reports">Committee Reports</SelectItem>
                                    <SelectItem value="petitions">Petitions</SelectItem>
                                    <SelectItem value="regulations">Regulations</SelectItem>
                                    <SelectItem value="policies">Policies</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Committee</label>
                            <Select value={stdCommittee} onValueChange={setStdCommittee}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    <SelectItem value="all">All Committees</SelectItem>
                                    {committees.map(c => (
                                        <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select value={stdStatus} onValueChange={setStdStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="concluded">Concluded</SelectItem>
                                    <SelectItem value="overdue">Overdue</SelectItem>
                                    {/* Removed Limbo from standard to encourage using Exception tab? Optional. */}
                                    <SelectItem value="frozen">Frozen</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date Range</label>
                            <DatePickerWithRange date={stdDate} setDate={setStdDate} className="w-full" />
                        </div>
                    </div>

                    <Button onClick={generateStandardReport} className="w-full md:w-auto">
                        <Download className="mr-2 h-4 w-4" /> Generate Standard PDF
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="exception">
            <Card className="border-l-4 border-l-orange-400">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500"/>
                        Exception Report Generator
                    </CardTitle>
                    <CardDescription>
                        Generate reports for business with irregular statuses (Limbo, Frozen).
                        <br/>These reports focus on the <strong>Reason</strong> rather than dates.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Business Type</label>
                            <Select value={excType} onValueChange={setExcType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_business">All Business Types</SelectItem>
                                    <SelectItem value="bills">Bills</SelectItem>
                                    <SelectItem value="motions">Motions</SelectItem>
                                    <SelectItem value="statements">Statements</SelectItem>
                                    <SelectItem value="reports">Committee Reports</SelectItem>
                                    <SelectItem value="petitions">Petitions</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Exception Status</label>
                            <Select value={excStatus} onValueChange={setExcStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="limbo">Limbo (Undated)</SelectItem>
                                    <SelectItem value="frozen">Frozen (Suspended)</SelectItem>
                                    <SelectItem value="overdue">Overdue</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Committee</label>
                            <Select value={excCommittee} onValueChange={setExcCommittee}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    <SelectItem value="all">All Committees</SelectItem>
                                    {committees.map(c => (
                                        <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                     </div>

                     <Button onClick={generateExceptionReport} variant="outline" className="w-full md:w-auto border-orange-200 hover:bg-orange-50 text-orange-700">
                        <Download className="mr-2 h-4 w-4" /> Generate Exception PDF
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
