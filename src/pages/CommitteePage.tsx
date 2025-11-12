import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBills } from "@/contexts/BillContext";
import { useDocuments, DocumentType } from "@/contexts/DocumentContext";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateCurrentCountdown, isItemOverdue } from "@/utils/countdownUtils";

const CommitteePage = () => {
  const { committeeId } = useParams();
  const navigate = useNavigate();
  const { pendingBills } = useBills();
  const { documents, pendingDocuments } = useDocuments();
  const [committeeName, setCommitteeName] = useState<string>("");

  useEffect(() => {
    if (committeeId) {
      fetchCommitteeName(committeeId);
    }
  }, [committeeId]);

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
      const billsCount = (pendingBills || []).filter(b => b.committee === committeeName).length;
      const statementsCount = (pendingDocuments("statement") || []).filter(d => d.committee === committeeName).length;
      const reportsCount = (pendingDocuments("report") || []).filter(d => d.committee === committeeName).length;
      const regulationsCount = (pendingDocuments("regulation") || []).filter(d => d.committee === committeeName).length;
      const policiesCount = (pendingDocuments("policy") || []).filter(d => d.committee === committeeName).length;
      const petitionsCount = (pendingDocuments("petition") || []).filter(d => d.committee === committeeName).length;
      
      return billsCount + statementsCount + reportsCount + regulationsCount + policiesCount + petitionsCount;
    }
    if (type === "bill") {
      return (pendingBills || []).filter(b => b.committee === committeeName).length;
    }
    return (pendingDocuments(type) || []).filter(d => d.committee === committeeName).length;
  };

  const generatePDF = (type: DocumentType | "business") => {
    try {
      let pendingItems: any[];
      let typeLabel: string;
      let includeTypeColumn = false;

      if (type === "business") {
        const allBills = (pendingBills || [])
          .filter(b => b.committee === committeeName)
          .map(item => ({ ...item, itemType: "Bill" }));
        const allStatements = (pendingDocuments("statement") || [])
          .filter(d => d.committee === committeeName)
          .map(item => ({ ...item, itemType: "Statement" }));
        const allReports = (pendingDocuments("report") || [])
          .filter(d => d.committee === committeeName)
          .map(item => ({ ...item, itemType: "Report" }));
        const allRegulations = (pendingDocuments("regulation") || [])
          .filter(d => d.committee === committeeName)
          .map(item => ({ ...item, itemType: "Regulation" }));
        const allPolicies = (pendingDocuments("policy") || [])
          .filter(d => d.committee === committeeName)
          .map(item => ({ ...item, itemType: "Policy" }));
        const allPetitions = (pendingDocuments("petition") || [])
          .filter(d => d.committee === committeeName)
          .map(item => ({ ...item, itemType: "Petition" }));
        
        pendingItems = [...allBills, ...allStatements, ...allReports, ...allRegulations, ...allPolicies, ...allPetitions];
        typeLabel = "Business";
        includeTypeColumn = true;
      } else if (type === "bill") {
        pendingItems = (pendingBills || []).filter(b => b.committee === committeeName);
        typeLabel = "Bills";
      } else {
        pendingItems = (pendingDocuments(type) || []).filter(d => d.committee === committeeName);
        typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + "s";
      }

      if (pendingItems.length === 0) {
        toast({
          title: "No data to export",
          description: `No pending ${typeLabel.toLowerCase()} found for this committee.`,
          variant: "destructive"
        });
        return;
      }

      const sortedItems = [...pendingItems].sort((a, b) => {
        const now = new Date();
        const aDays = differenceInDays(a.presentationDate, now);
        const bDays = differenceInDays(b.presentationDate, now);
        
        const aIsOverdue = a.status === "overdue" || aDays < 0;
        const bIsOverdue = b.status === "overdue" || bDays < 0;
        
        if (aIsOverdue && !bIsOverdue) return -1;
        if (!aIsOverdue && bIsOverdue) return 1;
        
        return aDays - bDays;
      });

      const tableData = sortedItems.map(item => {
        const countdown = calculateCurrentCountdown(item.presentationDate);
        const displayDays = String(Math.abs(countdown));
        const itemIsOverdue = isItemOverdue(item.presentationDate, item.extensionsCount);
        const statusText = itemIsOverdue ? "Overdue" : "Pending";
        
        const row = [
          String(item.title || "N/A"),
          String(item.committee || "N/A"),
          item.dateCommitted ? format(new Date(item.dateCommitted), "dd/MM/yyyy") : "N/A",
          displayDays,
          statusText,
          item.presentationDate ? format(new Date(item.presentationDate), "dd/MM/yyyy") : "N/A"
        ];
        
        if (includeTypeColumn) {
          row.push(String(item.itemType || "N/A"));
        }
        
        return row;
      });

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
      
      const startY = 20;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      
      const titleText = `Makueni County Assembly ${committeeName} Pending ${typeLabel} as at ${formattedDate}`;
      const maxWidth = doc.internal.pageSize.getWidth() - 20;
      const splitTitle = doc.splitTextToSize(titleText, maxWidth);
      doc.text(splitTitle, 10, startY);

      try {
        const headers = includeTypeColumn 
          ? [['Title', 'Committee', 'Date Committed', 'Days Remaining', 'Status', 'Due Date', 'Type']]
          : [['Title', 'Committee', 'Date Committed', 'Days Remaining', 'Status', 'Due Date']];
        
        const titleHeight = splitTitle.length * 7;
        
        // Define column styles - wrap text columns, fixed width for date/number columns
        const columnStylesConfig = includeTypeColumn 
          ? {
              0: { overflow: 'linebreak' as const, cellWidth: 60 },  // Title - allow wrapping with max width
              1: { overflow: 'linebreak' as const, cellWidth: 30 },  // Committee - allow wrapping
              2: { cellWidth: 25, minCellWidth: 25, overflow: 'visible' as const }, // Date Committed - no wrap
              3: { cellWidth: 20, minCellWidth: 20, overflow: 'visible' as const }, // Days Remaining - no wrap
              4: { cellWidth: 20, minCellWidth: 20, overflow: 'visible' as const }, // Status - no wrap
              5: { cellWidth: 25, minCellWidth: 25, overflow: 'visible' as const }, // Due Date - no wrap
              6: { cellWidth: 20, minCellWidth: 20, overflow: 'visible' as const }  // Type - no wrap
            }
          : {
              0: { overflow: 'linebreak' as const, cellWidth: 70 },  // Title - allow wrapping with max width
              1: { overflow: 'linebreak' as const, cellWidth: 35 },  // Committee - allow wrapping
              2: { cellWidth: 25, minCellWidth: 25, overflow: 'visible' as const }, // Date Committed - no wrap
              3: { cellWidth: 25, minCellWidth: 25, overflow: 'visible' as const }, // Days Remaining - no wrap
              4: { cellWidth: 20, minCellWidth: 20, overflow: 'visible' as const }, // Status - no wrap
              5: { cellWidth: 25, minCellWidth: 25, overflow: 'visible' as const }  // Due Date - no wrap
            };
        
        autoTable(doc, {
          startY: startY + titleHeight + 2,
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
          columnStyles: columnStylesConfig,
          margin: { top: 20, right: 10, bottom: 10, left: 10 },
          tableWidth: 'wrap',
          didParseCell: function(data) {
            if (data.column.index === 4 && data.cell.text[0] === "Overdue") {
              data.cell.styles.textColor = [255, 0, 0];
              data.cell.styles.fontStyle = 'bold';
            }
            
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
                      Pending {label.toLowerCase()}
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
