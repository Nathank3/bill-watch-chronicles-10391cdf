
import { useParams, useNavigate } from "react-router-dom";
import { BillForm } from "@/components/BillForm.tsx";
import { DocumentForm } from "@/components/DocumentForm.tsx";
import { DocumentType } from "@/types/document.ts";


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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {isBill ? (
          <BillForm onSuccess={handleSuccess} />
      ) : (
          <DocumentForm 
              documentType={singularType as DocumentType} 
              onSuccess={handleSuccess} 
          />
      )}
    </div>
  );
}
