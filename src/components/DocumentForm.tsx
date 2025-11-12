
import { useState, useEffect } from "react";
import { useDocuments, DocumentType } from "@/contexts/DocumentContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DocumentFormProps {
  documentType: DocumentType;
  onSuccess: () => void;
}

interface Committee {
  id: string;
  name: string;
}

export const DocumentForm = ({ documentType, onSuccess }: DocumentFormProps) => {
  const { addDocument } = useDocuments();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    committee: "",
    dateCommitted: format(new Date(), "yyyy-MM-dd"),
    daysAllocated: 14,
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
    
    if (!formData.title.trim() || !formData.committee.trim() || !formData.dateCommitted || formData.daysAllocated <= 0) {
      toast({
        title: "Validation Error",
        description: "All fields are required and days allocated must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    const dateCommitted = new Date(formData.dateCommitted);

    try {
      addDocument({
        title: formData.title.trim(),
        committee: formData.committee.trim(),
        dateCommitted,
        pendingDays: formData.daysAllocated,
        type: documentType
      });

      toast({
        title: "Success",
        description: `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} created successfully`,
      });

      onSuccess();
      
      // Reset form
      setFormData({
        title: "",
        committee: "",
        dateCommitted: format(new Date(), "yyyy-MM-dd"),
        daysAllocated: 14,
      });
    } catch (error) {
      console.error("Error creating document:", error);
      toast({
        title: "Error",
        description: "Failed to create document. Please try again.",
        variant: "destructive"
      });
    }
  };

  const documentTypeLabel = documentType.charAt(0).toUpperCase() + documentType.slice(1);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4">
        <div>
          <Label htmlFor="title">{documentTypeLabel} Title *</Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder={`Enter ${documentType} title`}
            required
          />
        </div>

        <div>
          <Label htmlFor="committee">Committee *</Label>
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

        <div>
          <Label htmlFor="dateCommitted">Date Committed *</Label>
          <Input
            id="dateCommitted"
            name="dateCommitted"
            type="date"
            value={formData.dateCommitted}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="daysAllocated">Days Allocated *</Label>
          <Input
            id="daysAllocated"
            name="daysAllocated"
            type="number"
            min="1"
            max="365"
            value={formData.daysAllocated}
            onChange={handleChange}
            required
          />
          <p className="text-sm text-muted-foreground mt-1">
            Due date will be calculated automatically (adjusted to next sitting day if it falls on non sitting days i.e Thursday, Friday, Saturday and Sunday)
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit">
          Create {documentTypeLabel}
        </Button>
      </div>
    </form>
  );
};
