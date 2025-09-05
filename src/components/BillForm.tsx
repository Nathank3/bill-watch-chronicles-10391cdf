
import { useState, useEffect } from "react";
import { useBills, Bill } from "@/contexts/BillContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface BillFormProps {
  initialBill?: Bill;
  onSuccess?: () => void;
}

interface Committee {
  id: string;
  name: string;
}

export const BillForm = ({ initialBill, onSuccess }: BillFormProps) => {
  const { addBill, updateBill } = useBills();
  const isEditing = !!initialBill;
  const [committees, setCommittees] = useState<Committee[]>([]);

  const [formData, setFormData] = useState({
    title: initialBill?.title || "",
    committee: initialBill?.committee || "",
    dateCommitted: initialBill
      ? format(initialBill.dateCommitted, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
    daysAllocated: initialBill?.pendingDays || 10,
  });

  useEffect(() => {
    fetchCommittees();
  }, []);

  const fetchCommittees = async () => {
    try {
      const { data, error } = await supabase
        .from("committees")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCommittees(data || []);
    } catch (error) {
      console.error("Error fetching committees:", error);
      toast({
        title: "Error",
        description: "Failed to load committees",
        variant: "destructive"
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === "daysAllocated" ? parseInt(value) || 0 : value 
    }));
  };

  const handleCommitteeChange = (value: string) => {
    setFormData(prev => ({ ...prev, committee: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.committee || !formData.dateCommitted || formData.daysAllocated <= 0) {
      toast({
        title: "Validation Error",
        description: "All fields are required and days allocated must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    const dateCommitted = new Date(formData.dateCommitted);

    if (isEditing && initialBill) {
      updateBill(initialBill.id, {
        title: formData.title,
        committee: formData.committee,
        dateCommitted,
        pendingDays: formData.daysAllocated
      });
    } else {
      addBill({
        title: formData.title,
        committee: formData.committee,
        dateCommitted,
        pendingDays: formData.daysAllocated
      });
    }

    // Reset form after submission
    if (!isEditing) {
      setFormData({
        title: "",
        committee: "",
        dateCommitted: format(new Date(), "yyyy-MM-dd"),
        daysAllocated: 10
      });
    }

    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">{isEditing ? "Edit Bill" : "Add New Bill"}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Bill Title</Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter bill title (e.g. Bill 15 - Agriculture Reform Act)"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="committee">Committee</Label>
          <Select value={formData.committee} onValueChange={handleCommitteeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a committee" />
            </SelectTrigger>
            <SelectContent>
              {committees.map((committee) => (
                <SelectItem key={committee.id} value={committee.name}>
                  {committee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="dateCommitted">Date Committed</Label>
          <Input
            id="dateCommitted"
            name="dateCommitted"
            type="date"
            value={formData.dateCommitted}
            onChange={handleChange}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="daysAllocated">Days Allocated</Label>
          <Input
            id="daysAllocated"
            name="daysAllocated"
            type="number"
            min="1"
            value={formData.daysAllocated}
            onChange={handleChange}
          />
          <p className="text-xs text-muted-foreground">
            Due date will be calculated automatically (adjusted to next business day if it falls on weekend)
          </p>
        </div>

        <Button type="submit" className="w-full">
          {isEditing ? "Save Changes" : "Add Bill"}
        </Button>
      </form>
    </Card>
  );
};
