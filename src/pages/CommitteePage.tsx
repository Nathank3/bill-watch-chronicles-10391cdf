import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Download, ArrowLeft } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import autoTable, { UserOptions } from "jspdf-autotable";
import jsPDF from "jspdf";
import { toast } from "@/components/ui/use-toast.ts";
import { supabase } from "@/integrations/supabase/client.ts";
import { calculateCurrentCountdown, determineItemStatus } from "@/utils/countdownUtils.ts";
import { addHeaderImage, drawDivider } from "@/utils/pdfUtils.ts";
import { DocumentType } from "@/types/document.ts";

interface CommitteeItem {
  id: string;
  title: string;
  committee: string;
  status: string;
  type?: string;
  dateCommitted?: string | null;
  presentationDate?: string | null;
  date_committed?: string | null;
  presentation_date?: string | null;
  pending_days?: number;
  extensions_count?: number;
  pendingDays?: number;
  extensionsCount?: number;
  itemType?: string;
}

const CommitteePage = () => {
  const { committeeId } = useParams();
  const navigate = useNavigate();
  const [committeeName, setCommitteeName] = useState<string>("");
  const [stats, setStats] = useState<Record<string, number>>({});
  // const [loadingStats, setLoadingStats] = useState(false); // Removed unused loaded state

  useEffect(() => {
    if (committeeId) {
      fetchCommitteeName(committeeId);
    }
  }, [committeeId]);

  useEffect(() => {
    if (committeeName) {
      fetchCommitteeStats(committeeName);
    }
  }, [committeeName]);

  const fetchCommitteeName = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('committees')
        .select('name')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setCommitteeName(data.name);
    } catch (error) {
      console.error('Error fetching committee:', error);
      toast({
        title: "Error",
        description: "Failed to load committee information",
        variant: "destructive"
      });
    }
  };

  const fetchCommitteeStats = async (name: string) => {
    // setLoadingStats(true); // Unused
    const types: (DocumentType | "bill")[] = ["bill", "statement", "report", "regulation", "policy", "petition", "motion"];
    const newStats: Record<string, number> = {};
    const activeStatuses = ["pending", "overdue", "frozen", "limbo", "tbd"];

    try {
        for (const type of types) {
            const table = type === "bill" ? "bills" : "documents";
            let query = supabase
                .from(table)
                .select("id", { count: "exact" })
                .eq("committee", name)
                .in("status", activeStatuses);
            
            if (type !== "bill") {
                // @ts-ignore - fixing "excessively deep" type error
                query = query.eq("type", type);
            }

            const { count, error } = await query;
            if (error) {
                console.error(`Error fetching stats for ${type}:`, error);
            }
            newStats[type] = count || 0;
        }
        setStats(newStats);
    } catch (e) {
        console.error("Error loading stats", e);
    } finally {
        // setLoadingStats(false); // Unused
    }
  };

  const documentTypes: { type: DocumentType | "business", label: string }[] = [
    { type: "business", label: "Business" },
    { type: "bill", label: "Bills" },
    { type: "statement", label: "Statements" },
    { type: "motion", label: "Motions" },
    { type: "report", label: "Reports" },
    { type: "regulation", label: "Regulations" },
    { type: "policy", label: "Policies & Guidelines" },
    { type: "petition", label: "Petitions" }
  ];

  const getPendingCount = (type: DocumentType | "business") => {
    if (type === "business") {
        return Object.values(stats).reduce((a, b) => a + b, 0);
    }
    return stats[type] || 0;
  };

  const fetchItemsForPDF = async (type: DocumentType | "business") => {
      const activeStatuses = ["pending", "overdue", "frozen", "limbo", "tbd"];
      const fetchLimit = 1000;
      let items: CommitteeItem[] = [];

      if (type === "business") {
          // Fetch bills
          const { data: bills } = await supabase
            .from("bills")
            .select("*")
            .eq("committee", committeeName)
            .in("status", activeStatuses)
            .limit(fetchLimit);
            
          const mappedBills = (bills || []).map(b => ({
              ...b,
              itemType: "Bill",
              dateCommitted: b.date_committed,
              presentationDate: b.presentation_date,
              pendingDays: b.pending_days,
              extensionsCount: b.extensions_count
          }));

          // Fetch docs
          const { data: docs } = await supabase
            .from("documents")
            .select("*")
            .eq("committee", committeeName)
            .in("status", activeStatuses)
            .limit(fetchLimit);
            
          const mappedDocs = (docs || []).map(d => ({ 
              ...d, 
              itemType: (d.type || "").toLowerCase() === 'policy' ? 'Policies & Guidelines' : (d.type ? (d.type.charAt(0).toUpperCase() + d.type.slice(1)) : ""),
              dateCommitted: d.date_committed,
              presentationDate: d.presentation_date,
              pendingDays: d.pending_days,
              extensionsCount: d.extensions_count
          }));

          items = [...mappedBills, ...mappedDocs];
      } else if (type === "bill") {
          const { data } = await supabase
            .from("bills")
            .select("*")
            .eq("committee", committeeName)
            .in("status", activeStatuses)
            .limit(fetchLimit);
          items = (data || []).map(b => ({
              ...b,
              dateCommitted: b.date_committed,
              presentationDate: b.presentation_date,
              pendingDays: b.pending_days,
              extensionsCount: b.extensions_count
          }));
      } else {
          const { data } = await supabase
            .from("documents")
            .select("*")
            .eq("committee", committeeName)
            .eq("type", type)
            .in("status", activeStatuses)
            .limit(fetchLimit);
          items = (data || []).map(d => ({
              ...d,
              dateCommitted: d.date_committed,
              presentationDate: d.presentation_date,
              pendingDays: d.pending_days,
              extensionsCount: d.extensions_count
          }));
      }
      return items;
  };

  const generatePDF = async (type: DocumentType | "business") => {
    try {
      toast({ title: "Generating PDF...", description: "Fetching committee data..." });
      
      const pendingItemsRaw = await fetchItemsForPDF(type);
      
      const typeLabel = type === "business" ? "Business" : (type === "bill" ? "Bills" : (type === "policy" ? "Policies & Guidelines" : type.charAt(0).toUpperCase() + type.slice(1) + "s"));
      const includeTypeColumn = type === "business";

      if (!pendingItemsRaw || pendingItemsRaw.length === 0) {
        toast({
          title: "No data to export",
          description: `No pending ${typeLabel.toLowerCase()} found for this committee.`,
          variant: "destructive"
        });
        return;
      }

      const sortedItems = [...pendingItemsRaw].sort((a, b) => {
        // TBD Check - Push to bottom
        const isATbd = a.status === 'tbd' || a.status === 'limbo' as string || !a.presentationDate;
        const isBTbd = b.status === 'tbd' || b.status === 'limbo' as string || !b.presentationDate;

        if (isATbd && !isBTbd) return 1;
        if (!isATbd && isBTbd) return -1;
        if (isATbd && isBTbd) return 0;

        const now = new Date();
        const aDate = a.presentationDate ? new Date(a.presentationDate) : new Date();
        const bDate = b.presentationDate ? new Date(b.presentationDate) : new Date();
        
        const aDays = differenceInDays(aDate, now);
        const bDays = differenceInDays(bDate, now);

        // Sort by urgency (overdue first, then pending)
        // Ascending sort: -10 (overdue) < 10 (pending)
        return aDays - bDays;
      });

      const tableData = sortedItems.map(item => {
        const pDate = item.presentationDate ? new Date(item.presentationDate) : null;
        const dDate = item.dateCommitted ? new Date(item.dateCommitted) : null;

        const countdown = calculateCurrentCountdown(pDate);
        const displayDays = String(Math.abs(countdown));
        const currentStatus = determineItemStatus(item.status, pDate, item.extensionsCount);
        
        let statusText = "Pending";
        if (currentStatus === "frozen" as string) statusText = "Frozen"; // Legacy check
        else if (currentStatus === "overdue") statusText = "Overdue";
        else if (currentStatus === "limbo" as string) statusText = "TBD";
        else if (currentStatus === "tbd") statusText = "TBD";
        else if (currentStatus === "concluded") statusText = "Concluded";
        
        // Structure: Title -> [Type] -> Date -> Days -> Status -> Due Date
        const row = [
          String(item.title || "N/A"),
          // Committee column removed
        ];

        if (includeTypeColumn) {
           row.push(String(item.itemType || "N/A"));
        }

        row.push(
          dDate ? format(dDate, "dd/MM/yyyy") : "TBD",
          displayDays,
          statusText,
          pDate ? format(pDate, "dd/MM/yyyy") : "N/A"
        );
        
        return row;
      });

      const expectedColumns = includeTypeColumn ? 6 : 5;
      const validTableData = tableData.filter(row => 
        Array.isArray(row) && row.length === expectedColumns && row.every(cell => typeof cell === 'string')
      );

      if (validTableData.length === 0) {
        throw new Error("No valid table rows found");
      }

      const doc = new jsPDF();
      const headerHeight = await addHeaderImage(doc, "/header_logo.png");
      const currentDate = new Date();
      const formattedDate = format(currentDate, "EEEE do MMMM yyyy");
      
      let startY = headerHeight > 0 ? headerHeight + 5 : 20;
      
      // Draw divider line below header
      if (headerHeight > 0) {
          startY = drawDivider(doc, startY, 15, 15); // 15mm margins
          startY += 10; // Extra spacing after divider
      }

      doc.setFontSize(14);
      doc.setFont("times", "bold");
      doc.setTextColor(0, 0, 0);
      
      const titleText = `MAKUENI COUNTY ASSEMBLY ${committeeName.toUpperCase()} PENDING ${typeLabel.toUpperCase()} AS AT ${formattedDate.toUpperCase()}`;
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginLeft = 15;
      const maxWidth = pageWidth - (marginLeft * 2);
      const splitTitle = doc.splitTextToSize(titleText, maxWidth);
      
      // Center align the text
      doc.text(splitTitle, pageWidth / 2, startY, { align: "center" });

      const titleLines = splitTitle.length;
      const lineY = startY + (titleLines * 6) + 2;

      // Draw line below title (Implicitly green due to drawDivider state)
      doc.setLineWidth(0.5);
      doc.line(marginLeft, lineY, marginLeft + maxWidth, lineY);

      try {
        const headers = includeTypeColumn 
          ? [['Title', 'Type', 'Date Committed', 'Days Remaining', 'Status', 'Due Date']]
          : [['Title', 'Date Committed', 'Days Remaining', 'Status', 'Due Date']];
        
        // Define column styles - wrap text columns, fixed width for date/number columns
        // Standard A4 width ~210mm. Margins 15mm each -> 180mm available.
        // Removed Committee Width (25-30) -> Added to Title
        const columnStylesConfig = includeTypeColumn 
          ? {
              0: { overflow: 'linebreak' as const, cellWidth: 70 },  // Title (Big increase)
              1: { cellWidth: 25, minCellWidth: 25, overflow: 'visible' as const },  // Type
              2: { cellWidth: 25, minCellWidth: 25, overflow: 'visible' as const }, // Date Committed
              3: { cellWidth: 15, minCellWidth: 15, overflow: 'visible' as const }, // Days Remaining
              4: { cellWidth: 18, minCellWidth: 18, overflow: 'visible' as const }, // Status
              5: { cellWidth: 25, minCellWidth: 25, overflow: 'visible' as const }  // Due Date
            }
          : {
              0: { overflow: 'linebreak' as const, cellWidth: 95 },  // Title (Huge increase)
              1: { cellWidth: 25, minCellWidth: 25, overflow: 'visible' as const }, // Date Committed
              2: { cellWidth: 15, minCellWidth: 15, overflow: 'visible' as const }, // Days Remaining
              3: { cellWidth: 18, minCellWidth: 18, overflow: 'visible' as const }, // Status
              4: { cellWidth: 25, minCellWidth: 25, overflow: 'visible' as const }  // Due Date
            };
        
        autoTable(doc, {
          startY: lineY + 5,
          head: headers,
          body: validTableData,
          theme: 'grid',
          styles: { 
            fontSize: 8,
            cellPadding: 3,
            halign: 'left',
            valign: 'middle'
          },
          headStyles: { 
            fillColor: [66, 139, 202],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left'
          },
          columnStyles: columnStylesConfig as UserOptions["columnStyles"], // Type cast to avoid ts index issues
          margin: { top: 20, right: 15, bottom: 10, left: 15 },
          tableWidth: 'auto',
          didParseCell: function(data) {
            const rowIndex = data.row.index;
            const originalItem = sortedItems[rowIndex];
            if (!originalItem) return;

            const currentStatus = determineItemStatus(originalItem.status, originalItem.presentationDate ? new Date(originalItem.presentationDate) : null, originalItem.extensionsCount);

            const statusIndex = includeTypeColumn ? 4 : 3;
            const daysIndex = includeTypeColumn ? 3 : 2;

            // Color status in red if overdue or frozen (legacy)
            if (data.column.index === statusIndex && (currentStatus === "overdue" || currentStatus === "frozen" as string)) {
              data.cell.styles.textColor = [255, 0, 0];
              data.cell.styles.fontStyle = 'bold';
            }
            
            // Urgency: Color name (title) in red if frozen
            if (data.column.index === 0 && currentStatus === "frozen" as string) {
              data.cell.styles.textColor = [255, 0, 0];
              data.cell.styles.fontStyle = 'bold';
            }

            // Color days column in red if overdue/frozen
            if (data.column.index === daysIndex && (currentStatus === "overdue" || currentStatus === "frozen" as string)) {
              data.cell.styles.textColor = [255, 0, 0];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });
      } catch (tableError) {
        console.error("Error creating table:", tableError);
        throw new Error(`Failed to create PDF table: ${tableError instanceof Error ? tableError.message : 'Unknown table error'}`);
      }

      const fileName = `${committeeName.toLowerCase().replace(/\s+/g, '-')}-pending-${typeLabel.toLowerCase()}-${format(currentDate, "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF Downloaded",
        description: `${typeLabel} report has been downloaded successfully.`,
      });

    } catch (error) {
      console.error("Error generating PDF:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Download failed",
        description: `There was an error generating the PDF: ${errorMessage}. Please try again.`,
        variant: "destructive"
      });
    }
  };

  if (!committeeName) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Navbar />
        <main className="container py-8">
          <div className="text-center">
            <p>Loading committee information...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold">{committeeName}</h1>
            <p className="text-muted-foreground mt-2">
              Overview of pending business
            </p>
          </div>
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
                      Pending {label === "Policies & Guidelines" ? "Policies & Guidelines" : label.toLowerCase()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
      
      <footer className="bg-gray-100 py-4 mt-8">
        <div className="container text-center">
          <p className="text-sm text-gray-600">
            © 2025 All Rights Reserved By County Assembly of Makueni
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CommitteePage;
