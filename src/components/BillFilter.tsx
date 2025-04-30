
import { useState, useEffect } from "react";
import { useBills, BillStatus } from "@/contexts/BillContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BillFilterProps {
  onFilterChange: (bills: any[]) => void;
}

export const BillFilter = ({ onFilterChange }: BillFilterProps) => {
  const { bills, filterBills, searchBills } = useBills();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    year: "",
    department: "",
    mca: "",
    status: ""
  });

  // Get unique values for filter dropdowns
  const years = [...new Set(bills.map(bill => bill.presentationDate.getFullYear()))].sort((a, b) => b - a);
  const departments = [...new Set(bills.map(bill => bill.department))].sort();
  const mcas = [...new Set(bills.map(bill => bill.mca))].sort();
  const statuses: BillStatus[] = ["pending", "passed", "rejected", "rescheduled"];

  // Apply filters and search when values change
  useEffect(() => {
    let filteredResults = bills;

    // Apply filters
    if (filters.year || filters.department || filters.mca || filters.status) {
      filteredResults = filterBills({
        year: filters.year ? parseInt(filters.year) : undefined,
        department: filters.department || undefined,
        mca: filters.mca || undefined,
        status: filters.status as BillStatus || undefined
      });
    }

    // Apply search if there's a query
    if (searchQuery.trim()) {
      filteredResults = searchBills(searchQuery);
    }

    onFilterChange(filteredResults);
  }, [filters, searchQuery, bills, filterBills, searchBills, onFilterChange]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFilters({
      year: "",
      department: "",
      mca: "",
      status: ""
    });
    setSearchQuery("");
  };

  return (
    <Card className="p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Filter Bills</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Search by title, MCA, or department"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="year">Year</Label>
          <Select
            value={filters.year}
            onValueChange={(value) => handleFilterChange("year", value)}
          >
            <SelectTrigger id="year">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Years</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="department">Department</Label>
          <Select
            value={filters.department}
            onValueChange={(value) => handleFilterChange("department", value)}
          >
            <SelectTrigger id="department">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Departments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="mca">MCA</Label>
          <Select
            value={filters.mca}
            onValueChange={(value) => handleFilterChange("mca", value)}
          >
            <SelectTrigger id="mca">
              <SelectValue placeholder="All MCAs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All MCAs</SelectItem>
              {mcas.map((mca) => (
                <SelectItem key={mca} value={mca}>
                  {mca}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange("status", value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid gap-2 md:col-span-2">
          <Button variant="outline" onClick={handleReset}>
            Reset Filters
          </Button>
        </div>
      </div>
    </Card>
  );
};
