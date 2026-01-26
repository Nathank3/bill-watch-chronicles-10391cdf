
import { useBillStats } from "@/hooks/useBillsQuery.ts";
import { useDocumentStats } from "@/hooks/useDocumentsQuery.ts";
import { Navbar } from "@/components/Navbar.tsx";
import { BillStatus } from "@/contexts/BillContext.tsx";
import { DocumentStatus } from "@/types/document.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Download } from "lucide-react";
import { format, differenceInDays } from "date-fns";
// import jsPDF from "jspdf";
// import autoTable, { UserOptions } from "jspdf-autotable";
import { toast } from "@/components/ui/use-toast.ts";
import { calculateCurrentCountdown, determineItemStatus } from "@/utils/countdownUtils.ts";
import { addHeaderImage, drawDivider } from "@/utils/pdfUtils.ts";
import { DocumentType } from "@/types/document.ts";
import { supabase } from "@/integrations/supabase/client.ts";

// Define a type for items used in PDF generation to ensure they have common checking properties
interface PdfItem {
    id: string;
    title: string;
    committee: string;
    status: string;
    dateCommitted: Date;
    presentationDate: Date;
    pendingDays: number;
    extensionsCount: number;
    itemType?: string; // Optional discriminator
}

const HomePage = () => {
  // Fetch Stats
  const { data: billStats } = useBillStats();
  // We need stats for all document types
  const { data: statementStats } = useDocumentStats("statement");
  const { data: reportStats } = useDocumentStats("report");
  const { data: regulationStats } = useDocumentStats("regulation");
  const { data: policyStats } = useDocumentStats("policy");
  const { data: petitionStats } = useDocumentStats("petition");
  const { data: motionStats } = useDocumentStats("motion");

  const documentTypes: { type: DocumentType | "business", label: string }[] = [
    { type: "business", label: "Business" },
    { type: "bill", label: "Bills" },
    { type: "motion", label: "Motions" },
    { type: "statement", label: "Statements" },
    { type: "report", label: "Committee Reports" },
    { type: "regulation", label: "Regulations" },
    { type: "policy", label: "Policies" },
    { type: "petition", label: "Petitions" }
  ];

  const getPendingCount = (type: DocumentType | "business") => {
    if (type === "business") {
      return (billStats?.pending || 0) +
        (statementStats?.pending || 0) +
        (reportStats?.pending || 0) +
        (regulationStats?.pending || 0) +
        (policyStats?.pending || 0) +
        (petitionStats?.pending || 0) +
        (motionStats?.pending || 0);
    }
    if (type === "bill") return billStats?.pending || 0;
    if (type === "statement") return statementStats?.pending || 0;
    if (type === "report") return reportStats?.pending || 0;
    if (type === "regulation") return regulationStats?.pending || 0;
    if (type === "policy") return policyStats?.pending || 0;
    if (type === "petition") return petitionStats?.pending || 0;
    if (type === "motion") return motionStats?.pending || 0;
    return 0;
  };

  const fetchAllPendingFiles = async (type: DocumentType | "business"): Promise<PdfItem[]> => {
    const fetchLimit = 1000; // Cap for PDF export

    if (type === "business") {
        const { data: bills } = await supabase.from("bills").select("*").in("status", ["pending", "overdue", "frozen"]).limit(fetchLimit);
        const { data: docs } = await supabase.from("documents").select("*").in("status", ["pending", "overdue", "frozen"]).limit(fetchLimit);
        
        const mappedBills: PdfItem[] = (bills || []).map(b => ({
            id: b.id,
            title: b.title,
            committee: b.committee,
            status: b.status,
            dateCommitted: new Date(b.date_committed), 
            presentationDate: new Date(b.presentation_date), 
            pendingDays: b.pending_days || 0, 
            extensionsCount: b.extensions_count || 0,
            itemType: "Bill"
        }));
        
        const mappedDocs: PdfItem[] = (docs || []).map(d => ({ 
            id: d.id,
            title: d.title,
            committee: d.committee,
            status: d.status,
            dateCommitted: new Date(d.date_committed || d.created_at), // Fallback if needed
            presentationDate: new Date(d.presentation_date), 
            pendingDays: d.pending_days || 0, 
            extensionsCount: d.extensions_count || 0,
            itemType: d.type.charAt(0).toUpperCase() + d.type.slice(1)
        }));
        
        return [...mappedBills, ...mappedDocs];
    } else if (type === "bill") {
        const { data } = await supabase.from("bills").select("*").in("status", ["pending", "overdue", "frozen"]).limit(fetchLimit);
        return (data || []).map(b => ({ 
            id: b.id,
            title: b.title,
            committee: b.committee,
            status: b.status,
            dateCommitted: new Date(b.date_committed), 
            presentationDate: new Date(b.presentation_date), 
            pendingDays: b.pending_days || 0, 
            extensionsCount: b.extensions_count || 0
        }));
    } else {
        const { data } = await supabase.from("documents").select("*").eq("type", type).in("status", ["pending", "overdue", "frozen"]).limit(fetchLimit);
        return (data || []).map(d => ({ 
            id: d.id,
            title: d.title,
            committee: d.committee,
            status: d.status,
            dateCommitted: new Date(d.date_committed || d.created_at), 
            presentationDate: new Date(d.presentation_date), 
            pendingDays: d.pending_days || 0, 
            extensionsCount: d.extensions_count || 0
        }));
    }
  };

  const generatePDF = async (type: DocumentType | "business") => {
    try {
      toast({ title: "Generating PDF...", description: "Fetching data..." });
      
      const pendingItemsRaw = await fetchAllPendingFiles(type);
      
      const typeLabel = type === "business" ? "Business" : (type === "bill" ? "Bills" : type.charAt(0).toUpperCase() + type.slice(1) + "s");
      const includeTypeColumn = type === "business";

      if (!pendingItemsRaw || pendingItemsRaw.length === 0) {
        toast({
          title: "No data to export",
          description: `No pending ${typeLabel.toLowerCase()} found to export.`,
          variant: "destructive"
        });
        return;
      }

      // Sort
      const sortedItems = [...pendingItemsRaw].sort((a, b) => {
        const now = new Date();
        const aDays = differenceInDays(a.presentationDate, now);
        const bDays = differenceInDays(b.presentationDate, now);

        const aIsOverdue = a.status === "overdue" || aDays < 0;
        const bIsOverdue = b.status === "overdue" || bDays < 0;

        if (aIsOverdue && !bIsOverdue) return -1;
        if (!aIsOverdue && bIsOverdue) return 1;

        return aDays - bDays;
      });

      // Prepare Table Data
      const tableData = sortedItems.map(item => {
        const countdown = calculateCurrentCountdown(item.presentationDate);
        const displayDays = String(Math.abs(countdown));
        const currentStatus = determineItemStatus(item.status as BillStatus | DocumentStatus, item.presentationDate, item.extensionsCount);
        const statusText = currentStatus === "frozen" ? "Frozen" : (currentStatus === "overdue" ? "Overdue" : "Pending");

        const row = [
          String(item.title || "N/A"),
          String(item.committee || "N/A"),
          item.dateCommitted ? format(item.dateCommitted, "EEE, dd/MM/yyyy") : "N/A",
          displayDays,
          statusText,
          item.presentationDate ? format(item.presentationDate, "EEE, dd/MM/yyyy") : "N/A"
        ];

        if (includeTypeColumn) {
          row.push(String(item.itemType || "N/A"));
        }

        return row;
      });

      // PDF Generation Logic (Keep existing logic mainly)
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();
      const currentDate = new Date();
      const formattedDate = format(currentDate, "EEEE do MMMM yyyy");

      const headerHeight = await addHeaderImage(doc, "/header_logo.png");

      let startY = 20;
      if (headerHeight > 0) {
        startY = headerHeight + 5;
        startY = drawDivider(doc, startY, 15, 15);
        startY += 10;
      } else {
        startY = 20;
      }

      doc.setFontSize(16);
      doc.setFont("times", "bold");
      doc.setTextColor(0, 0, 0);

      const titleText = `MAKUENI COUNTY ASSEMBLY PENDING ${typeLabel.toUpperCase()} AS AT ${formattedDate.toUpperCase()}`;
      const marginLeft = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - (marginLeft * 2);

      const splitTitle = doc.splitTextToSize(titleText, maxWidth);
      doc.text(splitTitle, pageWidth / 2, startY, { align: "center" });

      const titleLines = splitTitle.length;
      const lineY = startY + (titleLines * 6) + 2;

      doc.setLineWidth(0.5);
      doc.line(marginLeft, lineY, marginLeft + maxWidth, lineY);

      const headers = includeTypeColumn
          ? [['Title', 'Committee', 'Date Committed', 'Days Remaining', 'Status', 'Due Date', 'Type']]
          : [['Title', 'Committee', 'Date Committed', 'Days Remaining', 'Status', 'Due Date']];
      
      const columnStylesConfig = includeTypeColumn
          ? {
             0: { overflow: 'linebreak' }, 
             1: { overflow: 'linebreak', cellWidth: 40 }, 
             2: { cellWidth: 32, minCellWidth: 32 }, 
             3: { cellWidth: 15, minCellWidth: 15 }, 
             4: { cellWidth: 15, minCellWidth: 15, overflow: 'visible' },
             5: { cellWidth: 32, minCellWidth: 32 },
             6: { cellWidth: 18, minCellWidth: 18, overflow: 'visible' }
          }
          : {
             0: { overflow: 'linebreak' },
             1: { overflow: 'linebreak', cellWidth: 45 },
             2: { cellWidth: 32, minCellWidth: 32 },
             3: { cellWidth: 15, minCellWidth: 15 },
             4: { cellWidth: 15, minCellWidth: 15, overflow: 'visible' },
             5: { cellWidth: 32, minCellWidth: 32 }
          };

      const options: UserOptions = {
          startY: lineY + 5,
          head: headers,
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 3, halign: 'left', valign: 'middle', overflow: 'linebreak' },
          headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
          columnStyles: columnStylesConfig as UserOptions["columnStyles"],
          margin: { top: 20, right: 15, bottom: 10, left: 15 },
          tableWidth: 'auto',
          didParseCell: function (data) {
             const rowIndex = data.row.index;
             const originalItem = sortedItems[rowIndex];
             if (!originalItem) return;

             const currentStatus = determineItemStatus(originalItem.status as BillStatus | DocumentStatus, originalItem.presentationDate, originalItem.extensionsCount);

             if (data.column.index === 4 && (currentStatus === "overdue" || currentStatus === "frozen")) {
               data.cell.styles.textColor = [255, 0, 0];
               data.cell.styles.fontStyle = 'bold';
             }
             if (data.column.index === 0 && currentStatus === "frozen") {
               data.cell.styles.textColor = [255, 0, 0];
               data.cell.styles.fontStyle = 'bold';
             }
             if (data.column.index === 3 && (currentStatus === "overdue" || currentStatus === "frozen")) {
               data.cell.styles.textColor = [255, 0, 0];
               data.cell.styles.fontStyle = 'bold';
             }
          }
      };

      autoTable(doc, options);

      const fileName = `pending-${typeLabel.toLowerCase()}-${format(currentDate, "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF Downloaded",
        description: `${typeLabel} report has been downloaded successfully.`,
      });

    } catch (error) {
       console.error(error);
       toast({ title: "Download failed", description: "Could not generate PDF.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />

      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Makueni County Assembly Business Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Overview of All Pending Business
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {documentTypes.map(({ type, label }) => {
            const pendingCount = getPendingCount(type);

            return (
              <Card key={type} className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {label}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generatePDF(type)}
                      className="ml-2"
                      disabled={pendingCount === 0}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {pendingCount}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {type === 'business' ? "All Pending Business" : `Pending ${label.toLowerCase()}`}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main >

      <footer className="bg-gray-100 py-4 mt-8">
        <div className="container text-center">
          <p className="text-sm text-gray-600">
            © 2026 All Rights Reserved By County Assembly of Makueni
          </p>
        </div>
      </footer>
    </div >
  );
};

export default HomePage;
