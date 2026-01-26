
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { DatePickerWithRange } from "@/components/ui/date-range-picker.tsx";
import { DateRange } from "react-day-picker";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client.ts";
import { toast } from "@/components/ui/use-toast.ts";
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { addHeaderImage } from "@/utils/pdfUtils.ts";

export default function AnalyticsView() {
  const [reportType, setReportType] = useState<string>("bills");
  const [status, setStatus] = useState<string>("all");
  const [committee, setCommittee] = useState<string>("all");
  const [committees, setCommittees] = useState<{name: string}[]>([]);
  const [date, setDate] = useState<DateRange | undefined>();

   useEffect(() => {
        const fetchCommittees = async () => {
          const { data } = await supabase.from("committees").select("name").order("name");
          if (data) setCommittees(data);
        };
        fetchCommittees();
  }, []);

  const generateReport = async () => {
    toast({ title: "Generating Report...", description: "Please wait." });
    try {
      // Define a loose type for the fetched data that covers both Bills and Documents common fields
      interface ReportItem {
        title: string;
        committee: string;
        status: string;
        created_at: string;

        type?: string;
        status_reason?: string;
        [key: string]: unknown;
      }

      let data: ReportItem[] | null = null;
      let error = null;

      if (reportType === "bills") {
            let query = supabase.from("bills").select("*").limit(1000);
            if (status !== "all") query = query.eq("status", status);
            if (committee !== "all") query = query.eq("committee", committee);
            if (date?.from) query = query.gte("created_at", date.from.toISOString());
            if (date?.to) {
                const end = new Date(date.to);
                end.setHours(23, 59, 59);
                query = query.lte("created_at", end.toISOString());
            }
            const result = await query;
            data = result.data;
            error = result.error;
        } else {
             let query = supabase.from("documents").select("*").limit(1000);
             // Filter by document type
            if (reportType !== "all_business") {
                 query = query.eq("type", reportType.slice(0, -1)); 
            }
            if (status !== "all") query = query.eq("status", status);
            if (committee !== "all") query = query.eq("committee", committee);
            if (date?.from) query = query.gte("created_at", date.from.toISOString());
            if (date?.to) {
                 const end = new Date(date.to);
                 end.setHours(23, 59, 59);
                 query = query.lte("created_at", end.toISOString());
            }
            const result = await query;
            data = result.data;
            error = result.error;
        }

        if (error) throw error;
        if (!data || data.length === 0) {
            toast({ title: "No data found", description: "Try adjusting your filters.", variant: "destructive" });
            return;
        }

        // PDF Generation (Simplified version of HomePage logic)
        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        const doc = new jsPDF();
        const headerHeight = await addHeaderImage(doc, "/header_logo.png");
        let startY = headerHeight > 0 ? headerHeight + 15 : 20;

        doc.setFontSize(14);
        doc.text(`Report: ${reportType.toUpperCase()}`, 14, startY);
        startY += 10;
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
        });

        doc.save(`${reportType}_report.pdf`);
        toast({ title: "Report Ready", description: "Download started." });

     } catch (e) {
         console.error(e);
         toast({ title: "Error", description: "Failed to generate report.", variant: "destructive" });
     }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
      
      <Card>
        <CardHeader>
            <CardTitle>Custom Report Generator</CardTitle>
            <CardDescription>Select criteria to generate a PDF report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Business Type</label>
                    <Select value={reportType} onValueChange={setReportType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
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
                    <Select value={committee} onValueChange={setCommittee}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
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
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="concluded">Concluded</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                            <SelectItem value="frozen">Frozen</SelectItem>
                            <SelectItem value="limbo">Limbo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <DatePickerWithRange date={date} setDate={setDate} className="w-full" />
                </div>
            </div>

            <Button onClick={generateReport} className="w-full md:w-auto">
                <Download className="mr-2 h-4 w-4" /> Generate PDF Report
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
