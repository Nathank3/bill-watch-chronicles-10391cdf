
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { supabase } from "@/integrations/supabase/client.ts";

interface BillFilterProps {
  onSearchChange: (term: string) => void;
  onStatusChange: (status: string) => void;
  onCommitteeChange: (committee: string) => void;
}

export const BillFilter = ({ onSearchChange, onStatusChange, onCommitteeChange }: BillFilterProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [committeeFilter, setCommitteeFilter] = useState("all");
  const [committees, setCommittees] = useState<{name: string}[]>([]);

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

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    onSearchChange(val);
  };

  const handleStatusUpdate = (val: string) => {
    setStatusFilter(val);
    onStatusChange(val);
  };

  const handleCommitteeUpdate = (val: string) => {
    setCommitteeFilter(val);
    onCommitteeChange(val);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filter Bills</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            placeholder="Search bills by title or committee..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select value={statusFilter} onValueChange={handleStatusUpdate}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="concluded">Concluded</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="frozen">Frozen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select value={committeeFilter} onValueChange={handleCommitteeUpdate}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by committee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Committees</SelectItem>
                {committees.map(c => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
