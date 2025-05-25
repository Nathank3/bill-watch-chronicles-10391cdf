
import { useState } from "react";
import { useDocuments, DocumentType } from "@/contexts/DocumentContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

interface DocumentFormProps {
  documentType: DocumentType;
  onSuccess: () => void;
}

export const DocumentForm = ({ documentType, onSuccess }: DocumentFormProps) => {
  const { addDocument } = useDocuments();
  const [formData, setFormData] = useState({
    title: "",
    committee: "",
    pendingDays: 14,
  });

  const committees = [
    "Agriculture Committee",
    "Education Committee", 
    "Finance Committee",
    "Health Committee",
    "Transportation Committee",
    "Justice Committee",
    "Environment Committee",
    "Trade Committee",
    "Energy Committee",
    "Security Committee"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.committee) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const now = new Date();
    const dateCommitted = now;

    try {
      addDocument({
        title: formData.title.trim(),
        committee: formData.committee,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder={`Enter ${documentType} title`}
            required
          />
        </div>

        <div>
          <Label htmlFor="committee">Committee *</Label>
          <Select 
            value={formData.committee} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, committee: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select committee" />
            </SelectTrigger>
            <SelectContent>
              {committees.map((committee) => (
                <SelectItem key={committee} value={committee}>
                  {committee}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="pendingDays">Pending Days</Label>
          <Input
            id="pendingDays"
            type="number"
            min="1"
            max="365"
            value={formData.pendingDays}
            onChange={(e) => setFormData(prev => ({ ...prev, pendingDays: parseInt(e.target.value) || 14 }))}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Number of days until presentation (1-365)
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit">
          Create {documentType.charAt(0).toUpperCase() + documentType.slice(1)}
        </Button>
      </div>
    </form>
  );
};
