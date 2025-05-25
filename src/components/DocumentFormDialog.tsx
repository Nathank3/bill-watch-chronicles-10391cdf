
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DocumentForm } from "./DocumentForm";
import { Plus } from "lucide-react";
import { DocumentType } from "@/contexts/DocumentContext";

interface DocumentFormDialogProps {
  documentType: DocumentType;
  title: string;
  children?: React.ReactNode;
}

export const DocumentFormDialog = ({ documentType, title, children }: DocumentFormDialogProps) => {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add New {title}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New {title}</DialogTitle>
        </DialogHeader>
        <DocumentForm documentType={documentType} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
};
