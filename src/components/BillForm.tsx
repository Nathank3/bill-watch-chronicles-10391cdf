
import { useState, useEffect } from "react";
import { useBills, Bill } from "@/contexts/BillContext.tsx";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { supabase } from "@/integrations/supabase/client.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "@/components/ui/use-toast.ts";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar.tsx";
import { calculatePresentationDate } from "@/utils/documentUtils.ts";

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
  const { isAdmin } = useAuth();
  const isEditing = !!initialBill;
  const [committees, setCommittees] = useState<Committee[]>([]);

  const [formData, setFormData] = useState({
    title: initialBill?.title || "",
    committee: initialBill?.committee || "",
    dateCommitted: initialBill && initialBill.dateCommitted
      ? format(initialBill.dateCommitted, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"), // Default to today for new forms, or fallback
    daysAllocated: initialBill?.pendingDays || 10,
  });

  // Calculate the projected date based on current form data
  // Calculate the projected date based on current form data
  // We use current date as fallback if form date is invalid, though input type='date' restricts this
  const dateCommittedObj = new Date(formData.dateCommitted);
  const projectedDate = !isNaN(dateCommittedObj.getTime()) && formData.daysAllocated > 0
    ? calculatePresentationDate(dateCommittedObj, formData.daysAllocated)
    : new Date(); // Fallback for display only

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

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      if (isEditing && initialBill) {
        await updateBill(initialBill.id, {
          title: formData.title,
          committee: formData.committee,
          dateCommitted,
          pendingDays: formData.daysAllocated
        });
      } else {
        await addBill({
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
    } catch (error) {
      console.error("Error submitting bill:", error);
      // Toast is already handled in context, but we prevent closing the dialog here
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
            <SelectContent className="max-h-[200px]">
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
            disabled={isEditing && !(isAdmin && formData.title.trim().toLowerCase() === "reports")}
            className={isEditing && !(isAdmin && formData.title.trim().toLowerCase() === "reports") ? "bg-muted" : ""}
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
            Due date will be calculated automatically (adjusted to next sitting day)
          </p>
        </div>

        {/* Real-time Due Date Visualizer */}
        <div className="flex flex-col gap-3 border rounded-md p-4 bg-muted/20 items-center justify-center">
          <Label className="font-semibold text-muted-foreground">Target Presentation Date</Label>
          <div className="pointer-events-none bg-background rounded-md shadow-sm">
            <Calendar
              mode="single"
              selected={projectedDate}
              month={projectedDate}
              className="rounded-md border"
              weekStartsOn={1} // Monday start for legislative context usually
            />
          </div>
          <p className="text-sm font-medium text-primary">
            {format(projectedDate, "EEEE, MMMM do, yyyy")}
          </p>
        </div>

        <Button type="submit" className="w-full">
          {isEditing ? "Save Changes" : "Add Bill"}
        </Button>
      </form>
    </Card>
  );
};
