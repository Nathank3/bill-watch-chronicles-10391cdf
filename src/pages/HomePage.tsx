
import { useBills } from "@/contexts/BillContext.tsx";
import { useDocuments, DocumentType } from "@/contexts/DocumentContext.tsx";
import { Navbar } from "@/components/Navbar.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Download } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "@/components/ui/use-toast.ts";
import { calculateCurrentCountdown, isItemOverdue } from "@/utils/countdownUtils.ts";
import { addHeaderImage, drawDivider } from "@/utils/pdfUtils.ts";
const HomePage = () => {
  const { pendingBills } = useBills();
  const { pendingDocuments } = useDocuments();


  const documentTypes: { type: DocumentType | "business", label: string }[] = [
    { type: "business", label: "Business" },
    { type: "bill", label: "Bills" },
    { type: "statement", label: "Statements" },
    { type: "report", label: "Reports" },
    { type: "regulation", label: "Regulations" },
    { type: "policy", label: "Policies" },
    { type: "petition", label: "Petitions" }
  ];

  const getPendingCount = (type: DocumentType | "business") => {
    if (type === "business") {
      // Sum all pending items
      return (pendingBills?.length || 0) +
        (pendingDocuments("statement")?.length || 0) +
        (pendingDocuments("report")?.length || 0) +
        (pendingDocuments("regulation")?.length || 0) +
        (pendingDocuments("policy")?.length || 0) +
        (pendingDocuments("petition")?.length || 0);
    }
    if (type === "bill") {
      return pendingBills?.length || 0;
    }
    return pendingDocuments(type)?.length || 0;
  };

  const generatePDF = async (type: DocumentType | "business") => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pendingItems: any[];
      let typeLabel: string;
      let includeTypeColumn = false;

      if (type === "business") {
        // Collect all pending items from all types
        const allBills = (pendingBills || []).map(item => ({ ...item, itemType: "Bill" }));
        const allStatements = (pendingDocuments("statement") || []).map(item => ({ ...item, itemType: "Statement" }));
        const allReports = (pendingDocuments("report") || []).map(item => ({ ...item, itemType: "Report" }));
        const allRegulations = (pendingDocuments("regulation") || []).map(item => ({ ...item, itemType: "Regulation" }));
        const allPolicies = (pendingDocuments("policy") || []).map(item => ({ ...item, itemType: "Policy" }));
        const allPetitions = (pendingDocuments("petition") || []).map(item => ({ ...item, itemType: "Petition" }));

        pendingItems = [...allBills, ...allStatements, ...allReports, ...allRegulations, ...allPolicies, ...allPetitions];
        typeLabel = "Business";
        includeTypeColumn = true;
      } else if (type === "bill") {
        pendingItems = pendingBills || [];
        typeLabel = "Bills";
      } else {
        pendingItems = pendingDocuments(type) || [];
        typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + "s";
      }


      if (pendingItems.length === 0) {
        toast({
          title: "No data to export",
          description: `No pending ${typeLabel.toLowerCase()} found to export.`,
          variant: "destructive"
        });
        return;
      }

      // Sort by priority: overdue/rescheduled first, then by days remaining (least to most)
      const sortedItems = [...pendingItems].sort((a, b) => {
        const now = new Date();
        const aDays = differenceInDays(a.presentationDate, now);
        const bDays = differenceInDays(b.presentationDate, now);

        // Check if items are overdue or rescheduled
        const aIsOverdue = a.status === "overdue" || aDays < 0;
        const bIsOverdue = b.status === "overdue" || bDays < 0;

        // Prioritize overdue/rescheduled items
        if (aIsOverdue && !bIsOverdue) return -1;
        if (!aIsOverdue && bIsOverdue) return 1;

        // Within same priority group, sort by days remaining
        return aDays - bDays;
      });

      // Validate and prepare data before creating table
      const tableData = sortedItems.map(item => {
        // Calculate current countdown dynamically
        const countdown = calculateCurrentCountdown(item.presentationDate);
        const displayDays = String(Math.abs(countdown));

        // Status is "Overdue" if item has passed date or been extended
        const itemIsOverdue = isItemOverdue(item.presentationDate, item.extensionsCount);
        const statusText = itemIsOverdue ? "Overdue" : "Pending";

        // Ensure all values are strings and handle null/undefined values
        const row = [
          String(item.title || "N/A"),
          String(item.committee || "N/A"),
          item.dateCommitted ? format(new Date(item.dateCommitted), "EEE, dd/MM/yyyy") : "N/A",
          displayDays,
          statusText,
          item.presentationDate ? format(new Date(item.presentationDate), "EEE, dd/MM/yyyy") : "N/A"
        ];

        // Add type column for business report
        if (includeTypeColumn) {
          row.push(String(item.itemType || "N/A"));
        }

        return row;
      });

      // Double-check that tableData is valid
      if (!tableData || tableData.length === 0 || !Array.isArray(tableData)) {
        throw new Error("No valid data to generate table");
      }

      // Validate each row has the correct number of columns
      const expectedColumns = includeTypeColumn ? 7 : 6;
      const validTableData = tableData.filter(row =>
        Array.isArray(row) && row.length === expectedColumns && row.every(cell => typeof cell === 'string')
      );

      if (validTableData.length === 0) {
        throw new Error("No valid table rows found");
      }

      const doc = new jsPDF();
      const currentDate = new Date();
      const formattedDate = format(currentDate, "EEEE do MMMM yyyy");

      // Add header image
      const headerHeight = await addHeaderImage(doc, "/header_logo.png");

      // Calculate start Y based on header
      let startY = 20;
      if (headerHeight > 0) {
        // Draw divider if we have a header
        startY = headerHeight + 5; // Start divider slightly below image
        startY = drawDivider(doc, startY, 15, 15); // Draw divider and get new Y
        startY += 10; // Add space between divider and title
      } else {
        startY = 20; // Default start if no image
      }

      // Title positioning with text wrapping
      doc.setFontSize(16);
      doc.setFont("times", "bold");
      doc.setTextColor(0, 0, 0);

      // Split text to fit page width
      // Title in ALL CAPS
      const titleText = `MAKUENI COUNTY ASSEMBLY PENDING ${typeLabel.toUpperCase()} AS AT ${formattedDate.toUpperCase()}`;
      const marginLeft = 15;
      const marginRight = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - (marginLeft + marginRight);

      // Align with table start
      const splitTitle = doc.splitTextToSize(titleText, maxWidth);
      
      // Center align the text
      doc.text(splitTitle, pageWidth / 2, startY, { align: "center" });

      // Underline the title (line spanning the table width to align with table/header)
      const titleLines = splitTitle.length;
      const lineY = startY + (titleLines * 6) + 2; // Position below text, adjusted for spacing

      doc.setLineWidth(0.5);
      doc.line(marginLeft, lineY, marginLeft + maxWidth, lineY);

      // Create table with improved spacing and alignment
      try {
        const headers = includeTypeColumn
          ? [['Title', 'Committee', 'Date Committed', 'Days Remaining', 'Status', 'Due Date', 'Type']]
          : [['Title', 'Committee', 'Date Committed', 'Days Remaining', 'Status', 'Due Date']];

        // Define column styles - wrap text columns, fixed width for date/number columns
        const columnStylesConfig = includeTypeColumn
          ? {
            0: { overflow: 'linebreak' as const },  // Title - auto width serves as the main flexible column
            1: { overflow: 'linebreak' as const, cellWidth: 40 },  // Committee - give it decent fixed width or flexible
            2: { cellWidth: 32, minCellWidth: 32 }, // Date Committed - fixed width (keep as is)
            3: { cellWidth: 15, minCellWidth: 15 }, // Days Remaining - reduced from 20
            4: { cellWidth: 15, minCellWidth: 15, overflow: 'visible' as const }, // Status - reduced from 20, no wrap
            5: { cellWidth: 32, minCellWidth: 32 }, // Due Date - fixed width (keep as is)
            6: { cellWidth: 18, minCellWidth: 18, overflow: 'visible' as const }  // Type - reduced from 25, no wrap
          }
          : {
            0: { overflow: 'linebreak' as const },  // Title
            1: { overflow: 'linebreak' as const, cellWidth: 45 },  // Committee
            2: { cellWidth: 32, minCellWidth: 32 }, // Date Committed
            3: { cellWidth: 15, minCellWidth: 15 }, // Days Remaining - reduced
            4: { cellWidth: 15, minCellWidth: 15, overflow: 'visible' as const }, // Status - reduced, no wrap
            5: { cellWidth: 32, minCellWidth: 32 }  // Due Date
          };

        autoTable(doc, {
          startY: lineY + 5, // Start table well below the underline
          head: headers,
          body: validTableData,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 3,
            halign: 'left',
            valign: 'middle',
            overflow: 'linebreak'
          },
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left'
          },
          columnStyles: columnStylesConfig,
          margin: { top: 20, right: 15, bottom: 10, left: 15 },
          tableWidth: 'auto',
          didParseCell: function (data) {
            // Color overdue status in red
            if (data.column.index === 4 && data.cell.text[0] === "Overdue") {
              data.cell.styles.textColor = [255, 0, 0]; // Red color for overdue status
              data.cell.styles.fontStyle = 'bold';
            }
            // Color overdue days in red too
            if (data.column.index === 3 && data.cell.text[0]) {
              const rowIndex = data.row.index;
              const originalItem = sortedItems[rowIndex];

              if (originalItem && isItemOverdue(originalItem.presentationDate, originalItem.extensionsCount)) {
                data.cell.styles.textColor = [255, 0, 0];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        });
      } catch (tableError) {
        throw new Error(`Failed to create PDF table: ${tableError instanceof Error ? tableError.message : 'Unknown table error'}`);
      }

      // Save PDF
      const fileName = `pending-${typeLabel.toLowerCase()}-${format(currentDate, "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF Downloaded",
        description: `${typeLabel} report has been downloaded successfully.`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Download failed",
        description: `There was an error generating the PDF: ${errorMessage}. Please try again.`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />

      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Makueni County Assembly Business</h1>
          <p className="text-muted-foreground mt-2">
            Overview of pending business
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
                      Pending {label.toLowerCase()}
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
            © 2025 All Rights Reserved By County Assembly of Makueni
          </p>
        </div>
      </footer>
    </div >
  );
};

export default HomePage;
