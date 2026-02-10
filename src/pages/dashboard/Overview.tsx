
import { useBillStats } from "@/hooks/useBillsQuery.ts";
import { useDocumentStats } from "@/hooks/useDocumentsQuery.ts";
import { useConcludedStats } from "@/hooks/useConcludedStats.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { FileText, ScrollText, FileCheck, AlertCircle } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Overview() {
  const { data: billStats } = useBillStats();
  const { data: statementStats } = useDocumentStats("statement");
  const { data: reportStats } = useDocumentStats("report");
  const { data: petitionStats } = useDocumentStats("petition");
  const { data: motionStats } = useDocumentStats("motion");
  const { data: regulationStats } = useDocumentStats("regulation");
  const { data: policyStats } = useDocumentStats("policy");
  const { data: concludedThisMonth } = useConcludedStats();

  interface Stats {
    pending: number;
    overdue: number;
    frozen: number;
    limbo?: number;
    tbd?: number;
    [key: string]: number | undefined;
  }

  const getActiveCount = (stats: Stats | undefined) => {
    return (stats?.pending || 0) + (stats?.overdue || 0) + (stats?.frozen || 0) + (stats?.limbo || 0) + (stats?.tbd || 0);
  };

  const totalPending = 
    getActiveCount(billStats) + 
    getActiveCount(statementStats) + 
    getActiveCount(reportStats) + 
    getActiveCount(petitionStats) + 
    getActiveCount(motionStats) + 
    getActiveCount(regulationStats) + 
    getActiveCount(policyStats);

  const chartData = [
    { name: "Bills", value: getActiveCount(billStats) },
    { name: "Motions", value: getActiveCount(motionStats) },
    { name: "Statements", value: getActiveCount(statementStats) },
    { name: "Petitions", value: getActiveCount(petitionStats) },
    { name: "Reports", value: getActiveCount(reportStats) },
    { name: "Policies", value: getActiveCount(policyStats) },
    { name: "Regulations", value: getActiveCount(regulationStats) },
  ].filter(item => item.value > 0);

  const getOverdueCount = (stats: Stats | undefined) => stats?.overdue || 0;
  // Account for both limbo and TBD statuses
  const getTBDCount = (stats: Stats | undefined) => (stats?.limbo || 0) + (stats?.tbd || 0);

  const totalOverdue = 
    getOverdueCount(billStats) + 
    getOverdueCount(statementStats) + 
    getOverdueCount(reportStats) + 
    getOverdueCount(petitionStats) + 
    getOverdueCount(motionStats) + 
    getOverdueCount(regulationStats) + 
    getOverdueCount(policyStats);

  const totalTBD = 
    getTBDCount(billStats) + 
    getTBDCount(statementStats) + 
    getTBDCount(reportStats) + 
    getTBDCount(petitionStats) + 
    getTBDCount(motionStats) + 
    getTBDCount(regulationStats) + 
    getTBDCount(policyStats);

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
            <div className="text-2xl font-bold">{getActiveCount(billStats)}</div>
             <p className="text-xs text-muted-foreground">
                {billStats?.overdue || 0} overdue, {(billStats?.limbo || 0) + (billStats?.tbd || 0)} TBD
             </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Statements / Motions</CardTitle>
             <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getActiveCount(statementStats) + getActiveCount(motionStats)}</div>
            <p className="text-xs text-muted-foreground">Statements & Motions pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluded This Month</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {/* Placeholder for monthly stat */}
            <div className="text-2xl font-bold">{concludedThisMonth ?? "--"}</div> 
            <p className="text-xs text-muted-foreground">Items finalized</p>
          </CardContent>
        </Card>
      </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-5">
                <CardHeader>
                    <CardTitle>Business Distribution</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                   <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                <Tooltip 
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                   </div>
                </CardContent>
            </Card>
             <Card className="col-span-2">
                <CardHeader>
                    <CardTitle>Urgent Items</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <span className="flex h-2 w-2 rounded-full bg-red-500 mr-2" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">Overdue Business</p>
                                <p className="text-xs text-muted-foreground">{totalOverdue} items</p>
                            </div>
                        </div>

                         <div className="flex items-center">
                            <span className="flex h-2 w-2 rounded-full bg-yellow-500 mr-2" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">Business TBD</p>
                                <p className="text-xs text-muted-foreground">{totalTBD} items</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
