
import { useState } from "react";
import { useBills, Bill } from "@/contexts/BillContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

interface BillFormProps {
  initialBill?: Bill;
  onSuccess?: () => void;
}

export const BillForm = ({ initialBill, onSuccess }: BillFormProps) => {
  const { addBill, updateBill } = useBills();
  const isEditing = !!initialBill;

  const [formData, setFormData] = useState({
    title: initialBill?.title || "",
    mca: initialBill?.mca || "",
    department: initialBill?.department || "",
    presentationDate: initialBill
      ? new Date(initialBill.presentationDate).toISOString().slice(0, 16)
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16) // Default to tomorrow
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.mca || !formData.department || !formData.presentationDate) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive"
      });
      return;
    }

    const presentationDate = new Date(formData.presentationDate);

    if (presentationDate < new Date()) {
      toast({
        title: "Invalid Date",
        description: "Presentation date must be in the future",
        variant: "destructive"
      });
      return;
    }

    if (isEditing && initialBill) {
      updateBill(initialBill.id, {
        title: formData.title,
        mca: formData.mca,
        department: formData.department,
        presentationDate
      });
    } else {
      addBill({
        title: formData.title,
        mca: formData.mca,
        department: formData.department,
        presentationDate
      });
    }

    // Reset form after submission
    if (!isEditing) {
      setFormData({
        title: "",
        mca: "",
        department: "",
        presentationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
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
            placeholder="Enter bill title"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="mca">MCA Name</Label>
          <Input
            id="mca"
            name="mca"
            value={formData.mca}
            onChange={handleChange}
            placeholder="Enter MCA name"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            name="department"
            value={formData.department}
            onChange={handleChange}
            placeholder="Enter department"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="presentationDate">Presentation Date & Time</Label>
          <Input
            id="presentationDate"
            name="presentationDate"
            type="datetime-local"
            value={formData.presentationDate}
            onChange={handleChange}
          />
        </div>

        <Button type="submit" className="w-full">
          {isEditing ? "Save Changes" : "Add Bill"}
        </Button>
      </form>
    </Card>
  );
};
