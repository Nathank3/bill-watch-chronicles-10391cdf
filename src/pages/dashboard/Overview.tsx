
import { useBillStats } from "@/hooks/useBillsQuery.ts";
import { useDocumentStats } from "@/hooks/useDocumentsQuery.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { FileText, ScrollText, FileCheck, AlertCircle } from "lucide-react";

export default function Overview() {
  const { data: billStats } = useBillStats();
  // We can aggregated document stats or just show a few key ones
  const { data: statementStats } = useDocumentStats("statement");
  const { data: reportStats } = useDocumentStats("report");
  const { data: petitionStats } = useDocumentStats("petition");

  const totalPending = (billStats?.pending || 0) + (statementStats?.pending || 0) + (reportStats?.pending || 0) + (petitionStats?.pending || 0);


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
      
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending Business</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPending}</div>
            <p className="text-xs text-muted-foreground">Across all categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bills in Progress</CardTitle>
            <ScrollText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billStats?.pending || 0}</div>
             <p className="text-xs text-muted-foreground">{billStats?.overdue || 0} overdue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Statements</CardTitle>
             <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statementStats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">Pending response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluded This Month</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {/* Placeholder for monthly stat if not available directly from hook without range */}
            <div className="text-2xl font-bold">--</div> 
            <p className="text-xs text-muted-foreground">Items finalized</p>
          </CardContent>
        </Card>
      </div>

        {/* Recent Activity / Visuals could go here */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Business Distribution</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    {/* Placeholder for a chart or list */}
                   <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        Chart: Bills vs Statements vs Petitions
                   </div>
                </CardContent>
            </Card>
             <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Urgent Items</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* We could map over overdue items here if we fetched them */}
                        <div className="flex items-center">
                            <span className="flex h-2 w-2 rounded-full bg-red-500 mr-2" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">Overdue Bills</p>
                                <p className="text-xs text-muted-foreground">{billStats?.overdue || 0} items</p>
                            </div>
                        </div>
                         <div className="flex items-center">
                            <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">Frozen Bills</p>
                                <p className="text-xs text-muted-foreground">{billStats?.frozen || 0} items</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
