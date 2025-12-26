
import { useState, useEffect } from "react";
import { useBills, Bill } from "@/contexts/BillContext.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";

interface BillFilterProps {
  onFilterChange: (filteredBills: Bill[]) => void;
}

export const BillFilter = ({ onFilterChange }: BillFilterProps) => {
  const { bills } = useBills();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [committeeFilter, setCommitteeFilter] = useState("all");

  useEffect(() => {
    
    if (!bills) {
      onFilterChange([]);
      return;
    }

    let filtered = bills.filter(b => b.status !== "under_review");

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(bill => 
        bill.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.committee?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(bill => bill.status === statusFilter);
    }

    // Filter by committee
    if (committeeFilter !== "all") {
      filtered = filtered.filter(bill => bill.committee === committeeFilter);
    }


    onFilterChange(filtered);
  }, [bills, searchTerm, statusFilter, committeeFilter, onFilterChange]);

  // Get unique committees for filter
  const committees = bills ? [...new Set(bills.map(bill => bill.committee).filter(Boolean))] : [];

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
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            <Select value={committeeFilter} onValueChange={setCommitteeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by committee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Committees</SelectItem>
                {committees.map(committee => (
                  <SelectItem key={committee} value={committee}>{committee}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
