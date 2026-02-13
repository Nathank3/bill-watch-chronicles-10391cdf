
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { BillForm } from "@/components/BillForm.tsx";
import { DocumentForm } from "@/components/DocumentForm.tsx";
import { DocumentType } from "@/types/document.ts";
import { Button } from "@/components/ui/button.tsx";
import { ArrowLeft } from "lucide-react";

export default function AddBusinessView() {
  const { type = "bills" } = useParams();
  const navigate = useNavigate();
  
  // Normalize type
  const singularType = type.endsWith("s") ? type.slice(0, -1) : type;
  const isBill = singularType === "bill";

  const handleSuccess = () => {
    // Navigate back to list view on success
    navigate(`/dashboard/view/${type}`);
  };

  const title = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Add New {singularType === "bill" ? "Bill" : title.slice(0, -1)}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
            {isBill ? (
                <BillForm onSuccess={handleSuccess} />
            ) : (
                <DocumentForm 
                    documentType={singularType as DocumentType} 
                    onSuccess={handleSuccess} 
                />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
