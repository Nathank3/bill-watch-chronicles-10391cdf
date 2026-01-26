import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { supabase } from "@/integrations/supabase/client.ts";
import { format } from "date-fns";
import { Loader2, ShieldAlert } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Badge } from "@/components/ui/badge.tsx";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  user_email: string;
  created_at: string;
}

export default function SystemAuditView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        // deno-lint-ignore no-explicit-any
        .from("system_audit" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100); // Limit to last 100 actions for performance

      if (error) throw error;
      // deno-lint-ignore no-explicit-any
      if (data) setLogs(data as any[]);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("create") || action.includes("add")) return "bg-green-500/10 text-green-700 hover:bg-green-500/20";
    if (action.includes("delete") || action.includes("reject")) return "bg-red-500/10 text-red-700 hover:bg-red-500/20";
    if (action.includes("update") || action.includes("edit")) return "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20";
    return "bg-gray-500/10 text-gray-700 hover:bg-gray-500/20";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">System Audit Log</h1>
           <p className="text-muted-foreground mt-1">
             Immutable record of all system actions.
           </p>
        </div>
        <ShieldAlert className="h-8 w-8 text-primary opacity-20" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Showing the last 100 system actions. This log cannot be modified.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No audit logs found.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap font-medium text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user_email || "System"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`font-normal ${getActionColor(log.action.toLowerCase())}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {log.entity_type}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {log.details ? JSON.stringify(log.details) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
