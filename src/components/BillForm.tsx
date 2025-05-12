
import { useState } from "react";
import { useBills, Bill } from "@/contexts/BillContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface BillFormProps {
  initialBill?: Bill;
  onSuccess?: () => void;
}

export const BillForm = ({ initialBill, onSuccess }: BillFormProps) => {
  const { addBill, updateBill } = useBills();
  const isEditing = !!initialBill;

  const [formData, setFormData] = useState({
    title: initialBill?.title || "",
    committee: initialBill?.committee || "",
    dateCommitted: initialBill
      ? format(initialBill.dateCommitted, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
    pendingDays: initialBill?.pendingDays || 10,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === "pendingDays" ? parseInt(value) || 0 : value 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.committee || !formData.dateCommitted || formData.pendingDays <= 0) {
      toast({
        title: "Validation Error",
        description: "All fields are required and pending days must be greater than 0",
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
        pendingDays: formData.pendingDays
      });
    } else {
      addBill({
        title: formData.title,
        committee: formData.committee,
        dateCommitted,
        pendingDays: formData.pendingDays
      });
    }

    // Reset form after submission
    if (!isEditing) {
      setFormData({
        title: "",
        committee: "",
        dateCommitted: format(new Date(), "yyyy-MM-dd"),
        pendingDays: 10
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
          <Input
            id="committee"
            name="committee"
            value={formData.committee}
            onChange={handleChange}
            placeholder="Enter committee name"
          />
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
          <Label htmlFor="pendingDays">Pending Days</Label>
          <Input
            id="pendingDays"
            name="pendingDays"
            type="number"
            min="1"
            value={formData.pendingDays}
            onChange={handleChange}
          />
          <p className="text-xs text-muted-foreground">
            Due date will be calculated automatically (adjusted to next Monday if it falls on weekend)
          </p>
        </div>

        <Button type="submit" className="w-full">
          {isEditing ? "Save Changes" : "Add Bill"}
        </Button>
      </form>
    </Card>
  );
};
