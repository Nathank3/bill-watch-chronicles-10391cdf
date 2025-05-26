
import { useState } from "react";
import { useDocuments, DocumentType } from "@/contexts/DocumentContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface DocumentFormProps {
  documentType: DocumentType;
  onSuccess: () => void;
}

export const DocumentForm = ({ documentType, onSuccess }: DocumentFormProps) => {
  const { addDocument } = useDocuments();
  const [formData, setFormData] = useState({
    title: "",
    committee: "",
    dateCommitted: format(new Date(), "yyyy-MM-dd"),
    pendingDays: 14,
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
    
    if (!formData.title.trim() || !formData.committee.trim() || !formData.dateCommitted || formData.pendingDays <= 0) {
      toast({
        title: "Validation Error",
        description: "All fields are required and pending days must be greater than 0",
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
        pendingDays: formData.pendingDays,
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
        pendingDays: 14,
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
          <Input
            id="committee"
            name="committee"
            value={formData.committee}
            onChange={handleChange}
            placeholder="Enter committee name"
            required
          />
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
          <Label htmlFor="pendingDays">Pending Days *</Label>
          <Input
            id="pendingDays"
            name="pendingDays"
            type="number"
            min="1"
            max="365"
            value={formData.pendingDays}
            onChange={handleChange}
            required
          />
          <p className="text-sm text-muted-foreground mt-1">
            Due date will be calculated automatically (1-365 days)
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
