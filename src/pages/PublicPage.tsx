
import { useState, useEffect } from "react";
import { BillCard } from "@/components/BillCard.tsx";
import { DocumentCard } from "@/components/DocumentCard.tsx";
import { Navbar } from "@/components/Navbar.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { DatePickerWithRange } from "@/components/ui/date-range-picker.tsx";
import { DateRange } from "react-day-picker";
import { useBillList } from "@/hooks/useBillsQuery.ts";
import { useDocumentList } from "@/hooks/useDocumentsQuery.ts";
import { DocumentType, DocumentStatus } from "@/types/document.ts";
import { BillStatus } from "@/contexts/BillContext.tsx";
import { PaginationControls } from "@/components/ui/pagination-controls.tsx";
import { supabase } from "@/integrations/supabase/client.ts";

const PublicPage = () => {
  const [documentType, setDocumentType] = useState<DocumentType>("bill");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Advanced Filters State
  const [status, setStatus] = useState<string>("all");
  const [committee, setCommittee] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();
  const [committees, setCommittees] = useState<{name: string}[]>([]);

  // Fetch committees on mount
  useEffect(() => {
    const fetchCommittees = async () => {
      const { data } = await supabase
        .from("committees")
        .select("name")
        .order("name");
      if (data) setCommittees(data);
    };
    fetchCommittees();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [documentType, searchQuery, status, committee, date]);

  // Fetch Bills
  const { data: billsData, isLoading: billsLoading } = useBillList({
    status: status as BillStatus | "all",
    search: searchQuery,
    committee,
    page,
    pageSize,
    startDate: date?.from,
    endDate: date?.to
  }, {
    enabled: documentType === "bill"
  });

  // Fetch Documents
  const { data: docsData, isLoading: docsLoading } = useDocumentList({
    type: documentType !== "bill" ? documentType : undefined,
    status: status as DocumentStatus | "all",
    committee,
    search: searchQuery,
    page,
    pageSize,
    startDate: date?.from,
    endDate: date?.to
  }, {
    enabled: documentType !== "bill"
  });

  const handleTypeChange = (val: string) => {
    setDocumentType(val as DocumentType);
    setPage(1);
  };

  const documentTypes: { value: DocumentType, label: string }[] = [
    { value: "bill", label: "Bills" },
    { value: "motion", label: "Motions" },
    { value: "statement", label: "Statements" },
    { value: "report", label: "Committee Reports" },
    { value: "regulation", label: "Regulations" },
    { value: "policy", label: "Policies" },
    { value: "petition", label: "Petitions" }
  ];

  const isLoading = documentType === "bill" ? billsLoading : docsLoading;
  const listData = documentType === "bill" ? billsData?.data : docsData?.data;
  const totalCount = documentType === "bill" ? billsData?.count : docsData?.count;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    globalThis.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Makueni Assembly Business Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Track pending business and view concluded business
          </p>
        </div>
        
        {/* Document Type Navigation */}
        <div className="mb-6 flex justify-center">
          <Tabs 
            value={documentType} 
            onValueChange={handleTypeChange}
            className="w-full"
          >
            <TabsList className="w-full justify-start overflow-x-auto h-auto flex-nowrap pb-1 no-scrollbar bg-background border">
              {documentTypes.map(type => (
                <TabsTrigger key={type.value} value={type.value} className="min-w-fit px-4 py-2">
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Filters Card */}
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Input
                        placeholder={`Search ${documentType}s...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                            <SelectValue placeholder="Status" />
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

                    <Select value={committee} onValueChange={setCommittee}>
                        <SelectTrigger>
                            <SelectValue placeholder="Committee" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            <SelectItem value="all">All Committees</SelectItem>
                            {committees.map(c => (
                                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <DatePickerWithRange date={date} setDate={setDate} />
                </div>
            </CardContent>
        </Card>
        
        {/* List Content */}
        <div className="space-y-4">
            {isLoading ? (
                <div className="text-center py-10">Loading...</div>
            ) : listData && listData.length > 0 ? (
                <>
                    <div className="grid gap-4 md:grid-cols-2">
                        {listData.map((item) => (
                            documentType === "bill" ? (
                                <BillCard key={item.id} bill={item as any} />
                            ) : (
                                <DocumentCard key={item.id} document={item as any} />
                            )
                        ))}
                    </div>
                    <PaginationControls 
                        currentPage={page}
                        totalCount={totalCount || 0}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                    />
                </>
            ) : (
                <p className="text-center py-10 text-muted-foreground">
                    No {documentType}s found matching your criteria.
                </p>
            )}
        </div>
      </main>
      
      <footer className="bg-gray-100 py-4 mt-8">
        <div className="container text-center">
          <p className="text-sm text-gray-600">
            © 2026 All Rights Reserved By County Assembly of Makueni
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicPage;
