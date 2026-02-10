
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
import { Calendar } from "@/components/ui/calendar.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils.ts";

export default function AnalyticsView() {
  const [committees, setCommittees] = useState<{name: string}[]>([]);

  // Standard Report State
  const [stdType, setStdType] = useState<string>("bills");
  const [stdStatus, setStdStatus] = useState<string>("all");
  const [stdCommittee, setStdCommittee] = useState<string>("all");
  const [stdDate, setStdDate] = useState<DateRange | undefined>();

  // Exception Report State
  const [excType, setExcType] = useState<string>("all_business");
  const [excStatus, setExcStatus] = useState<string>("tbd");
  const [excCommittee, setExcCommittee] = useState<string>("all");

  // Daily Report State
  const [dailyType, setDailyType] = useState<string>("all_business");
  const [dailyStatus, setDailyStatus] = useState<string>("pending");
  const [dailyCommittee, setDailyCommittee] = useState<string>("all");
  const [dailyDate, setDailyDate] = useState<Date | undefined>(new Date());

  // Concluded Report State
  const [concType, setConcType] = useState<string>("all_business");
  const [concCommittee, setConcCommittee] = useState<string>("all");

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
      // Variables for data accumulation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any[] | null = null;
      // error variable used in multiple scopes, keep as let
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let error: any = null;
      
      if (stdType === "all_business") {
        // We need to fetch both tables if it's all business, which is complex with single query variable.
        // Strategy: If "all_business", we might need to fetch bills and docs separately and merge, 
        // OR just decide to fetch Documents table and Bills table parallelly.
        // Current simple implementation: 
        // For simplicity in this tool, let's just support single table queries or merge them if "all_business"
      }

      const fetchBills = supabase.from("bills").select("*").limit(1000);
      const fetchDocs = supabase.from("documents").select("*").limit(1000);

      // Build queries based on filters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const applyFilters = (q: any) => {
        if (stdStatus !== "all") q = q.eq("status", stdStatus);
        if (stdCommittee !== "all") q = q.eq("committee", stdCommittee);
        if (stdDate?.from) q = q.gte("date_committed", stdDate.from.toISOString());
        if (stdDate?.to) {
            const end = new Date(stdDate.to);
            end.setHours(23, 59, 59);
            q = q.lte("date_committed", end.toISOString());
        }
        return q;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let billsData: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let docsData: any[] = [];

      if (stdType === "bills" || stdType === "all_business") {
          let q = fetchBills;
          q = applyFilters(q);
          const { data: b, error: e } = await q;
          if (e) throw e;
          billsData = b || [];
      }

      if (stdType !== "bills") {
          let q = fetchDocs;
          // Apply type filter if not all business
          if (stdType !== "all_business") {
               const typeQuery = stdType === "policies" ? "policy" : stdType.slice(0, -1);
               // @ts-ignore - Supabase type complexity issue
               q = q.eq("type", typeQuery); 
          }
          q = applyFilters(q);
          const { data: d, error: e } = await q;
          if (e) error = e; // Assign to error variable
          docsData = d || [];
      }

      if (error) throw error;

      data = [...billsData, ...docsData].map(item => ({
          ...item,
          // Normalize for mapping later
          typeLabel: (item.type || "").toLowerCase() === "policy" ? "Policies & Guidelines" : (item.type ? (item.type.charAt(0).toUpperCase() + item.type.slice(1)) : "Bill")
      }));

      // Removed redundant check since we throw above
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
      doc.setFontSize(14);
      doc.setFont("times", "bold");
      
      const statusText = stdStatus === "all" ? "All" : stdStatus.charAt(0).toUpperCase() + stdStatus.slice(1);
      const typeText = stdType === "all_business" ? "Business" : stdType.charAt(0).toUpperCase() + stdType.slice(1);
      let dateRangeText = "";
      if (stdDate?.from && stdDate?.to) {
          dateRangeText = `Between ${format(stdDate.from, "dd/MM/yyyy")} and ${format(stdDate.to, "dd/MM/yyyy")}`;
      } else if (stdDate?.from) {
          dateRangeText = `From ${format(stdDate.from, "dd/MM/yyyy")}`;
      } else {
          dateRangeText = `As at ${format(new Date(), "dd/MM/yyyy")}`;
      }

      const titleText = `Makueni County Assembly ${statusText} ${typeText} ${dateRangeText}`.toUpperCase();

      const pageWidth = doc.internal.pageSize.getWidth();
      const marginLeft = 15;
      const maxWidth = pageWidth - (marginLeft * 2);
      
      const splitTitle = doc.splitTextToSize(titleText, maxWidth);
      doc.text(splitTitle, pageWidth / 2, startY, { align: "center" });
      
      const lineY = startY + (splitTitle.length * 7) + 5;
      doc.setLineWidth(0.5);
      doc.line(marginLeft, lineY, marginLeft + maxWidth, lineY);

      startY += 20;
      
      doc.setFontSize(10);
      // doc.text(`Generated on: ${format(new Date(), "PPP")}`, 14, startY); // Redundant with date range in title? kept for record
      startY += 10;
      
      const showTypeCol = stdType === 'all_business';
      const showStatusCol = stdStatus === 'all';

      const tableData = data.map(item => {
          let statusDisplay = item.status;
          if ((item.status === "limbo" || item.status === "tbd") && item.status_reason) {
              statusDisplay = `TBD - ${item.status_reason}`;
          } else if (item.status === "limbo" || item.status === "tbd") {
              statusDisplay = "TBD";
          }

          const row = [item.title];
          if (showTypeCol) row.push(item.typeLabel || "N/A");
          row.push(item.committee);
          if (showStatusCol) row.push(statusDisplay);
          
          row.push(item.date_committed ? format(new Date(item.date_committed as string | number | Date), "dd/MM/yyyy") : "TBD");
          
          return row;
      });

      const headers = ['Title'];
      if (showTypeCol) headers.push('Type');
      headers.push('Committee');
      if (showStatusCol) headers.push('Status');
      headers.push('Date Committed'); // Changed header to be clearer

      // Total page width ~180mm
      const columnStyles: any = {
          0: { cellWidth: showTypeCol ? 70 : (showStatusCol ? 90 : 115), overflow: 'linebreak' } // Title takes remaining space
      };
      
      let colIndex = 1;
      if (showTypeCol) {
          columnStyles[colIndex] = { cellWidth: 20 }; // Type
          colIndex++;
      }
      columnStyles[colIndex] = { cellWidth: 40, overflow: 'linebreak' }; // Committee
      colIndex++;
      
      if (showStatusCol) {
          columnStyles[colIndex] = { cellWidth: 25 }; // Status
          colIndex++;
      }
      columnStyles[colIndex] = { cellWidth: 25 }; // Date

      autoTable(doc, {
          startY,
          head: [headers],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
          margin: { top: 20, right: 15, bottom: 10, left: 15 },
          columnStyles: columnStyles
      });

      const sanitizedStatus = stdStatus === "all" ? "All_Status" : stdStatus.charAt(0).toUpperCase() + stdStatus.slice(1);
      const sanitizedType = stdType === "all_business" ? "Business" : (stdType === "policies" ? "Policies & Guidelines" : (stdType.charAt(0).toUpperCase() + stdType.slice(1)));
      
      let filenameDate = "All_Dates";
      if (stdDate?.from && stdDate?.to) {
          filenameDate = `${format(stdDate.from, "dd-MM-yyyy")}_to_${format(stdDate.to, "dd-MM-yyyy")}`;
      } else if (stdDate?.from) {
          filenameDate = `From_${format(stdDate.from, "dd-MM-yyyy")}`;
      }

      let filenameCommittee = "";
      if (stdCommittee !== "all") {
          filenameCommittee = `_${stdCommittee.replace(/ /g, "_")}`;
      }

      const filename = `${sanitizedStatus}_${sanitizedType}${filenameCommittee}_${filenameDate}.pdf`;
      doc.save(filename);
      toast({ title: "Report Ready", description: "Download started." });

     } catch (e) {
         console.error(e);
         toast({ title: "Error", description: "Failed to generate report.", variant: "destructive" });
     }
  };


  const generateDailyReport = async () => {
      if (!dailyDate) {
          toast({ title: "Date required", description: "Please select a date.", variant: "destructive" });
          return;
      }

      toast({ title: "Generating Daily Report...", description: "Please wait." });
      try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let data: any[] | null = null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let error: any = null;

          const startOfDay = new Date(dailyDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(dailyDate);
          endOfDay.setHours(23, 59, 59, 999);

          const fetchBills = supabase.from("bills").select("*").limit(1000);
          const fetchDocs = supabase.from("documents").select("*").limit(1000);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const applyFilters = (q: any) => {
              if (dailyStatus !== "all") q = q.eq("status", dailyStatus);
              if (dailyCommittee !== "all") q = q.eq("committee", dailyCommittee);
              
              // Filter strict date range for the single day using presentation_date
              q = q.gte("presentation_date", startOfDay.toISOString());
              q = q.lte("presentation_date", endOfDay.toISOString());
              
              return q;
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let billsData: any[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let docsData: any[] = [];

          if (dailyType === "bills" || dailyType === "all_business") {
              let q = fetchBills;
              q = applyFilters(q);
              const { data: b, error: e } = await q;
              if (e) throw e;
              billsData = b || [];
          }

          if (dailyType !== "bills") {
              let q = fetchDocs;
              if (dailyType !== "all_business") {
                  const typeQuery = dailyType === "policies" ? "policy" : dailyType.slice(0, -1);
                  // @ts-ignore - Supabase type complexity issue
                  q = q.eq("type", typeQuery); 
              }
              q = applyFilters(q);
              const { data: d, error: e } = await q;
              if (e) error = e;
              docsData = d || [];
          }

          if (error) throw error;

          data = [...billsData, ...docsData].map(item => ({
              ...item,
              typeLabel: (item.type || "").toLowerCase() === "policy" ? "Policies & Guidelines" : (item.type ? (item.type.charAt(0).toUpperCase() + item.type.slice(1)) : "Bill")
          }));

          if (!data || data.length === 0) {
              toast({ title: "No data found", description: `No business found for ${format(dailyDate, "PPP")}.`, variant: "destructive" });
              return;
          }

          const { default: jsPDF } = await import("jspdf");
          const { default: autoTable } = await import("jspdf-autotable");
          const doc = new jsPDF();
          const headerHeight = await addHeaderImage(doc, "/header_logo.png");
          let startY = headerHeight > 0 ? headerHeight + 5 : 20;

          if (headerHeight > 0) {
              startY = drawDivider(doc, startY, 15, 15);
              startY += 10;
          }

          doc.setFontSize(14);
          doc.setFont("times", "bold");

          const statusText = dailyStatus === "all" ? "All" : dailyStatus.charAt(0).toUpperCase() + dailyStatus.slice(1);
          const typeText = dailyType === "all_business" ? "Business" : dailyType.charAt(0).toUpperCase() + dailyType.slice(1);
          const dateText = format(dailyDate, "dd/MM/yyyy");

          const titleText = `Makueni County Assembly ${statusText} ${typeText} On ${dateText}`.toUpperCase();

          const pageWidth = doc.internal.pageSize.getWidth();
          const marginLeft = 15;
          const maxWidth = pageWidth - (marginLeft * 2);

          const splitTitle = doc.splitTextToSize(titleText, maxWidth);
          doc.text(splitTitle, pageWidth / 2, startY, { align: "center" });

          const lineY = startY + (splitTitle.length * 7) + 5;
          doc.setLineWidth(0.5);
          doc.line(marginLeft, lineY, marginLeft + maxWidth, lineY);

          startY += 20;

          const showTypeCol = dailyType === 'all_business';
          
          const tableData = data.map(item => {
              const row = [item.title];
              if (showTypeCol) row.push(item.typeLabel || "N/A");
              row.push(item.committee);
              
              // Daily report shows specific presentation date (should match filter)
              row.push(item.presentation_date ? format(new Date(item.presentation_date as string | number | Date), "dd/MM/yyyy") : "TBD");
              
              return row;
          });

          const headers = ['Title'];
          if (showTypeCol) headers.push('Type');
          headers.push('Committee');
          headers.push('Date');

          // Total page width ~180mm (A4 210mm - 15mm margins)
          // Fixed widths: Date(30), Committee(45), Type(25)
          // Remaining for Title: 80 (with Type) or 105 (without Type)
          const columnStyles: any = {
              0: { cellWidth: showTypeCol ? 80 : 105, overflow: 'linebreak' } 
          };
          
          let colIndex = 1;
          if (showTypeCol) {
              columnStyles[colIndex] = { cellWidth: 25 }; // Type
              colIndex++;
          }
          columnStyles[colIndex] = { cellWidth: 45, overflow: 'linebreak' }; // Committee
          colIndex++;
          columnStyles[colIndex] = { cellWidth: 30 }; // Date

          autoTable(doc, {
              startY,
              head: [headers],
              body: tableData,
              theme: 'grid',
              styles: { fontSize: 8, cellPadding: 3 },
              headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
              margin: { top: 20, right: 15, bottom: 10, left: 15 },
              columnStyles: columnStyles
          });

          const sanitizedDailyStatus = dailyStatus === "all" ? "All" : dailyStatus.charAt(0).toUpperCase() + dailyStatus.slice(1);
          const sanitizedDailyType = dailyType === "all_business" ? "Business" : (dailyType === "policies" ? "Policies & Guidelines" : (dailyType.charAt(0).toUpperCase() + dailyType.slice(1)));
          const dailyDateStr = format(dailyDate, "EEEE_dd-MM-yyyy");
          
          let dailyFilenameCommittee = "";
          if (dailyCommittee !== "all") {
              dailyFilenameCommittee = `_${dailyCommittee.replace(/ /g, "_")}`;
          }

          const dailyFilename = `${sanitizedDailyStatus}_${sanitizedDailyType}${dailyFilenameCommittee}_of_${dailyDateStr}.pdf`;
          doc.save(dailyFilename);
          toast({ title: "Report Ready", description: "Download started." });

      } catch (error) {
          console.error("Daily report failed", error);
          toast({ title: "Error", description: "Failed to generate report.", variant: "destructive" });
      }
  };

  const generateConcludedReport = async () => {
    toast({ title: "Generating Concluded Report...", description: "Please wait." });
    try {
        // Define interface for combined items
        interface ConcludedItem {
            title: string;
            committee: string;
            concluded_at?: string;
            type?: string; 
            itemType: string;
        }

        let allItems: ConcludedItem[] = [];
        
        // Helper to query one table
        const queryTable = async (table: "bills" | "documents") => {
            let query = supabase.from(table).select("*").eq("status", "concluded");
            
            // Filter Committee
            if (concCommittee !== "all") query = query.eq("committee", concCommittee);
            
            // Strict type filtering if not 'all_business'
            if (concType !== "all_business") {
                if (table === "bills" && concType !== "bills") return [];
                if (table === "documents" && concType === "bills") return [];
                if (table === "documents" && concType !== "bills") {
                    const typeQuery = concType === "policies" ? "policy" : concType.slice(0, -1);
                    // @ts-ignore - Supabase type complexity issue
                    query = query.eq("type", typeQuery);
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            
            // Cast and map to ConcludedItem
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (data || []).map((d: any) => ({
                title: d.title,
                committee: d.committee,
                concluded_at: d.concluded_at,
                type: d.type,
                itemType: table === "bills" ? "Bill" : ((d.type || "").toLowerCase() === "policy" ? "Policies & Guidelines" : d.type) 
            })) as ConcludedItem[];
        };

        const bills = await queryTable("bills");
        const documents = await queryTable("documents");
        allItems = [...bills, ...documents];

        // Sort by concluded date (descending)
        // Sort by concluded date (descending) - Most recent first
        allItems.sort((a, b) => {
            const timeA = a.concluded_at ? new Date(a.concluded_at).getTime() : 0;
            const timeB = b.concluded_at ? new Date(b.concluded_at).getTime() : 0;
            
            // Treat invalid dates as 0 (epoch)
            const validA = !isNaN(timeA) ? timeA : 0;
            const validB = !isNaN(timeB) ? timeB : 0;

            return validB - validA;
        });

        if (allItems.length === 0) {
            toast({ title: "No data found", description: "No concluded items match criteria.", variant: "destructive" });
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
        
        const typeText = concType === "all_business" ? "Business" : (concType === "policies" ? "Policies & Guidelines" : (concType.charAt(0).toUpperCase() + concType.slice(1)));
        const dateText = format(new Date(), "EEEE, do MMMM yyyy");
        const titleText = `MAKUENI COUNTY ASSEMBLY CONCLUDED ${typeText.toUpperCase()} AS AT ${dateText.toUpperCase()}`;
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const marginLeft = 15;
        const maxWidth = pageWidth - (marginLeft * 2);

        const splitTitle = doc.splitTextToSize(titleText, maxWidth);
        doc.text(splitTitle, pageWidth / 2, startY, { align: "center" });
        
        const lineY = startY + (splitTitle.length * 7) + 5;
        doc.setLineWidth(0.5);
        doc.line(marginLeft, lineY, marginLeft + maxWidth, lineY);

        startY += 20;

        // Removed "Filter: all" text as it was being cut off and is redundant if "all"

        const tableData = allItems.map(item => ([
            item.title,
            item.itemType, // "Bill" or "motion/statement/etc"
            item.committee,
            item.concluded_at ? format(new Date(item.concluded_at), "dd/MM/yyyy") : "N/A"
        ]));

        autoTable(doc, {
            startY,
            head: [['Title', 'Type', 'Committee', 'Date Concluded']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
            margin: { top: 20, right: 15, bottom: 10, left: 15 },
            columnStyles: { 
                0: { cellWidth: 80, overflow: 'linebreak' }, // Title (Maximized)
                1: { cellWidth: 25 }, // Type
                2: { cellWidth: 45, overflow: 'linebreak' }, // Committee
                3: { cellWidth: 30 } // Date
            }
        });

        const sanitizedConcType = concType === "all_business" ? "Business" : (concType === "policies" ? "Policies & Guidelines" : (concType.charAt(0).toUpperCase() + concType.slice(1)));
        
        let concFilenameCommittee = "";
        if (concCommittee !== "all") {
            concFilenameCommittee = `_${concCommittee.replace(/ /g, "_")}`;
        }
        
        const concFilename = `Concluded_${sanitizedConcType}${concFilenameCommittee}_As_At_${format(new Date(), "dd-MM-yyyy")}.pdf`;
        doc.save(concFilename);
        toast({ title: "Report Ready", description: "Concluded report created." });

    } catch (error) {
        console.error("Concluded report failed", error);
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
            overdueDays?: number | null;
        }

        let allItems: ExceptionItem[] = [];
        
        // Helper to query one table
        const queryTable = async (table: "bills" | "documents") => {
            let query = supabase.from(table).select("*");
            
            // Filter Committee
            if (excCommittee !== "all") query = query.eq("committee", excCommittee);
            
            // Strict type filtering if not 'all_business'
            if (excType !== "all_business") {
                if (table === "bills" && excType !== "bills") return [];
                if (table === "documents" && excType === "bills") return [];
                if (table === "documents" && excType !== "bills") {
                    const typeQuery = excType === "policies" ? "policy" : excType.slice(0, -1);
                    // @ts-ignore - Supabase type complexity issue
                    query = query.eq("type", typeQuery);
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            
            const now = new Date();

            // Cast and map to ExceptionItem with In-Memory Filtering
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (data || []).map((d: any) => {
                // Determine dynamic status
                let dynamicStatus = "pending";
                const dbStatus = d.status;
                const presDate = d.presentation_date ? new Date(d.presentation_date) : null;
                const extensions = d.extensions_count || 0;

                if (dbStatus === "concluded") dynamicStatus = "concluded";
                else if (dbStatus === "limbo" || dbStatus === "tbd" || (dbStatus === "pending" && !presDate)) {
                    dynamicStatus = "tbd";
                } else if (dbStatus === "overdue" || (presDate && presDate < now) || extensions > 0) {
                    dynamicStatus = "overdue";
                }

                return {
                    title: d.title,
                    committee: d.committee,
                    status: dynamicStatus, // Use calculated status
                    status_reason: d.status_reason,
                    type: d.type,
                    itemType: table === "bills" ? "Bill" : ((d.type || "").toLowerCase() === "policy" ? "Policies & Guidelines" : d.type),
                    overdueDays: (dynamicStatus === "overdue" && presDate) ? Math.floor((now.getTime() - presDate.getTime()) / (1000 * 60 * 60 * 24)) : null
                };
            }).filter((item: ExceptionItem) => {
                // Apply the status filter here on the calculated status
                if (excStatus === "all") return true;
                return item.status === excStatus;
            }) as ExceptionItem[];
        };

        const bills = await queryTable("bills");
        const documents = await queryTable("documents");
        allItems = [...bills, ...documents];

        // Sort by overdue days (descending) so most urgent appear first
        if (excStatus === "overdue") {
            allItems.sort((a, b) => (b.overdueDays || 0) - (a.overdueDays || 0));
        }

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
        doc.text(`Type: ${excType === 'all_business' ? 'All Types' : (excType === 'policies' ? 'Policies & Guidelines' : excType)} | Filter: ${excCommittee}`, 14, startY);
        startY += 10;

        const tableData = allItems.map(item => ([
            item.title,
            item.itemType, // "Bill" or "motion/statement/etc"
            item.committee,
            item.status === 'overdue' ? `${item.overdueDays || 0} days` : (item.status_reason || "No reason recorded")
        ]));
        
        // Define headers based on status type
        const lastColHeader = excStatus === 'overdue' ? 'Overdue By' : 'Reason / Details';

        autoTable(doc, {
            startY,
            head: [['Title', 'Type', 'Committee', lastColHeader]],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
            margin: { top: 20, right: 15, bottom: 10, left: 15 },
            columnStyles: { 
                0: { cellWidth: 80, overflow: 'linebreak' }, // Title (Maximized)
                1: { cellWidth: 25 }, // Type
                2: { cellWidth: 35, overflow: 'linebreak' }, // Committee
                3: { cellWidth: 40, overflow: 'linebreak' } // Reason or Overdue days
            }
        });

        const sanitizedExcStatus = excStatus.charAt(0).toUpperCase() + excStatus.slice(1);
        const sanitizedExcType = excType === "all_business" ? "Business" : (excType === "policies" ? "Policies & Guidelines" : (excType.charAt(0).toUpperCase() + excType.slice(1)));
        
        let excFilenameCommittee = "";
        if (excCommittee !== "all") {
            excFilenameCommittee = `_${excCommittee.replace(/ /g, "_")}`;
        }
        
        const excFilename = `${sanitizedExcStatus}_${sanitizedExcType}${excFilenameCommittee}_Exception_Report.pdf`;
        doc.save(excFilename);
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
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="standard">Standard Reports</TabsTrigger>
            <TabsTrigger value="daily">Daily Business</TabsTrigger>
            <TabsTrigger value="concluded">Concluded Business</TabsTrigger>
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
                                    <SelectItem value="all_business">All Business</SelectItem>
                                    <SelectItem value="bills">Bills</SelectItem>
                                    <SelectItem value="motions">Motions</SelectItem>
                                    <SelectItem value="statements">Statements</SelectItem>
                                    <SelectItem value="reports">Committee Reports</SelectItem>
                                    <SelectItem value="petitions">Petitions</SelectItem>
                                    <SelectItem value="regulations">Regulations</SelectItem>
                                    <SelectItem value="policies">Policies & Guidelines</SelectItem>
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
                                    <SelectItem value="tbd">TBD</SelectItem>
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



        <TabsContent value="daily">
            <Card className="border-l-4 border-l-blue-400">
                <CardHeader>
                    <CardTitle>Daily Business Report</CardTitle>
                    <CardDescription>Generate a strict report for business on a specific day.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Business Type</label>
                            <Select value={dailyType} onValueChange={setDailyType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_business">All Business</SelectItem>
                                    <SelectItem value="bills">Bills</SelectItem>
                                    <SelectItem value="motions">Motions</SelectItem>
                                    <SelectItem value="statements">Statements</SelectItem>
                                    <SelectItem value="reports">Committee Reports</SelectItem>
                                    <SelectItem value="petitions">Petitions</SelectItem>
                                    <SelectItem value="regulations">Regulations</SelectItem>
                                    <SelectItem value="policies">Policies & Guidelines</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Committee</label>
                            <Select value={dailyCommittee} onValueChange={setDailyCommittee}>
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
                            <Select value={dailyStatus} onValueChange={setDailyStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="concluded">Concluded</SelectItem>
                                    <SelectItem value="overdue">Overdue</SelectItem>
                                    <SelectItem value="tbd">TBD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dailyDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dailyDate ? format(dailyDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dailyDate}
                                        onSelect={setDailyDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <Button onClick={generateDailyReport} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
                        <Download className="mr-2 h-4 w-4" /> Generate Daily Report
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="concluded">
            <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                    <CardTitle className="text-green-700">Concluded Business Report</CardTitle>
                    <CardDescription>Generate a comprehensive report of all concluded business as of today.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Business Type</label>
                            <Select value={concType} onValueChange={setConcType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_business">All Business</SelectItem>
                                    <SelectItem value="bills">Bills</SelectItem>
                                    <SelectItem value="motions">Motions</SelectItem>
                                    <SelectItem value="statements">Statements</SelectItem>
                                    <SelectItem value="reports">Committee Reports</SelectItem>
                                    <SelectItem value="petitions">Petitions</SelectItem>
                                    <SelectItem value="regulations">Regulations</SelectItem>
                                    <SelectItem value="policies">Policies & Guidelines</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Committee</label>
                            <Select value={concCommittee} onValueChange={setConcCommittee}>
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

                    <Button onClick={generateConcludedReport} className="w-full md:w-auto bg-green-600 hover:bg-green-700">
                        <Download className="mr-2 h-4 w-4" /> Generate Concluded Report
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
                        Generate reports for business with irregular statuses (e.g. TBD/Limbo).
                        <br/>This report focuses on the <strong>Reason</strong> rather than dates.
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
                                    <SelectItem value="regulations">Regulations</SelectItem>
                                    <SelectItem value="policies">Policies & Guidelines</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Exception Status</label>
                            <Select value={excStatus} onValueChange={setExcStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tbd">TBD (Undated)</SelectItem>
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
