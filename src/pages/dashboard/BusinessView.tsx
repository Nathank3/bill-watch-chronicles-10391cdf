
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { DatePickerWithRange } from "@/components/ui/date-range-picker.tsx";
import { DateRange } from "react-day-picker";
import { PaginationControls } from "@/components/ui/pagination-controls.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { useBillList, useBillStats } from "@/hooks/useBillsQuery.ts";
import { useDocumentList, useDocumentStats } from "@/hooks/useDocumentsQuery.ts";
import { BillCard } from "@/components/BillCard.tsx";
import { DocumentCard } from "@/components/DocumentCard.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Plus } from "lucide-react";
import { BillStatus } from "@/contexts/BillContext.tsx";
import { DocumentType, DocumentStatus } from "@/types/document.ts";
import { supabase } from "@/integrations/supabase/client.ts";

export default function BusinessView() {
  const { type = "bills" } = useParams();
  const navigate = useNavigate();
  // Normalize type: remove 's' from end if present (e.g. bills -> bill) except 'business'
  const singularType = type.endsWith("s") ? type.slice(0, -1) : type;
  const isBill = singularType === "bill";

  const [date, setDate] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [committee, setCommittee] = useState<string>("all");
  const [committees, setCommittees] = useState<{name: string}[]>([]); 

  useEffect(() => {
    // Reset page when filters change
    setPage(1);
  }, [type, search, status, committee, date]);

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

  const pageSize = 10;
  
  // Queries
  const { data: billData, isLoading: billsLoading } = useBillList({
    status: status as BillStatus | "all", 
    search, 
    page, 
    pageSize,
    startDate: date?.from,
    endDate: date?.to
  }, { enabled: isBill });

  const { data: docData, isLoading: docsLoading } = useDocumentList({
    type: singularType as DocumentType,
    status: status as DocumentStatus | "all",
    search,
    page,
    pageSize,
    startDate: date?.from,
    endDate: date?.to
  }, { enabled: !isBill });

  const { data: billStats } = useBillStats();
  const { data: docStats } = useDocumentStats(singularType as DocumentType);

  const stats = isBill ? billStats : docStats;
  const listData = isBill ? billData?.data : docData?.data;
  const totalCount = isBill ? billData?.count : docData?.count;
  const isLoading = isBill ? billsLoading : docsLoading;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const title = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{title} Management</h1>
        <Button onClick={() => navigate(`/dashboard/add/${type}`)}>
          <Plus className="mr-2 h-4 w-4" /> Add {singularType}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats?.pending || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats?.concluded || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <Input 
                placeholder="Search..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
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
                {/* Add under_review if needed */}
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

      {/* List */}
      <div className="space-y-4">
        {isLoading ? (
            <div>Loading...</div>
        ) : listData && listData.length > 0 ? (
            <div className="grid gap-4">
                {listData.map((item) => (
                    isBill ? (
                        <BillCard key={item.id} bill={item as any} />
                    ) : (
                        <DocumentCard key={item.id} document={item as any} />
                    )
                ))}
            </div>
        ) : (
            <div className="text-center py-10 text-muted-foreground">No {title.toLowerCase()} found.</div>
        )}

        <PaginationControls 
            currentPage={page}
            totalPages={Math.ceil((totalCount || 0) / pageSize)}
            onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
