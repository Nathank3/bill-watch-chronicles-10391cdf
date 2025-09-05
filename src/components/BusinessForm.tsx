import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BusinessType } from "@/types/business";
import { useBusiness } from "@/contexts/BusinessContext";

interface BusinessFormProps {
  onSuccess?: () => void;
  initialData?: {
    title: string;
    committee: string;
    type: BusinessType;
    dateCommitted: Date;
    daysAllocated: number;
    dateLaid?: Date;
  };
}

export const BusinessForm: React.FC<BusinessFormProps> = ({ onSuccess, initialData }) => {
  const { addBusiness, committees } = useBusiness();
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    committee: initialData?.committee || "",
    type: initialData?.type || "bill" as BusinessType,
    dateCommitted: initialData?.dateCommitted || new Date(),
    daysAllocated: initialData?.daysAllocated || 14,
    dateLaid: initialData?.dateLaid || undefined
  });

  const businessTypes: { value: BusinessType; label: string }[] = [
    { value: "bill", label: "Bill" },
    { value: "statement", label: "Statement" },
    { value: "report", label: "Report" },
    { value: "regulation", label: "Regulation" },
    { value: "policy", label: "Policy" },
    { value: "petition", label: "Petition" }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.committee.trim()) {
      return;
    }

    addBusiness({
      title: formData.title.trim(),
      committee: formData.committee.trim(),
      type: formData.type,
      dateCommitted: formData.dateCommitted,
      daysAllocated: formData.daysAllocated,
      dateLaid: formData.dateLaid
    });

    // Reset form
    setFormData({
      title: "",
      committee: "",
      type: "bill",
      dateCommitted: new Date(),
      daysAllocated: 14,
      dateLaid: undefined
    });

    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter business title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Business Type</Label>
        <Select value={formData.type} onValueChange={(value: BusinessType) => setFormData({ ...formData, type: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select business type" />
          </SelectTrigger>
          <SelectContent>
            {businessTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="committee">Committee</Label>
        <Select value={formData.committee} onValueChange={(value) => setFormData({ ...formData, committee: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select committee" />
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

      <div className="space-y-2">
        <Label htmlFor="dateCommitted">Date Committed</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.dateCommitted && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.dateCommitted ? format(formData.dateCommitted, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.dateCommitted}
              onSelect={(date) => date && setFormData({ ...formData, dateCommitted: date })}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="daysAllocated">Days Allocated</Label>
        <Input
          id="daysAllocated"
          type="number"
          min="1"
          max="365"
          value={formData.daysAllocated}
          onChange={(e) => setFormData({ ...formData, daysAllocated: parseInt(e.target.value) || 14 })}
          required
        />
        <p className="text-sm text-muted-foreground">
          Number of days allocated for this business item
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateLaid">Date Laid (Optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.dateLaid && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.dateLaid ? format(formData.dateLaid, "PPP") : <span>Pick a date (optional)</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.dateLaid}
              onSelect={(date) => setFormData({ ...formData, dateLaid: date })}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button type="submit" className="w-full">
        Add Business
      </Button>
    </form>
  );
};