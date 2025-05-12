
import { useState, useEffect } from "react";
import { Document } from "@/contexts/DocumentContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, isPast, format } from "date-fns";

interface DocumentCardProps {
  document: Document;
  showActions?: boolean;
  onStatusChange?: (id: string, status: "pending" | "concluded") => void;
}

export const DocumentCard = ({ document, showActions = false, onStatusChange }: DocumentCardProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isPastDeadline, setIsPastDeadline] = useState<boolean>(false);

  // Update countdown in real-time
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const isPastDate = isPast(document.presentationDate);
      setIsPastDeadline(isPastDate);
      
      if (isPastDate) {
        setTimeLeft("Deadline passed");
      } else {
        setTimeLeft(formatDistanceToNow(document.presentationDate, { addSuffix: true }));
      }
    };

    // Update immediately
    updateCountdown();
    
    // Then update every minute
    const interval = setInterval(updateCountdown, 60000);
    
    return () => clearInterval(interval);
  }, [document.presentationDate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-bill-pending">Pending</Badge>;
      case "concluded":
        return <Badge className="bg-bill-passed">Concluded</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (date: Date): string => {
    return format(date, "dd/MM/yyyy"); // Day/Month/Year format
  };

  const isActionable = isPastDeadline && document.status === "pending";
  
  // Capitalize first letter of document type
  const documentType = document.type.charAt(0).toUpperCase() + document.type.slice(1);

  return (
    <Card className={`document-card document-${document.status} p-4`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{documentType}</Badge>
            <h3 className="font-medium text-lg">{document.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Committee: {document.committee}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="font-medium">Date Committed:</span> {formatDate(document.dateCommitted)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Pending Days:</span> {document.pendingDays} days
            </p>
            <p className="text-sm">
              <span className="font-medium">Date Due:</span> {formatDate(document.presentationDate)}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge(document.status)}
            {document.status === "pending" && (
              <span className={`countdown ${isPastDeadline ? "countdown-urgent" : ""}`}>
                {timeLeft}
              </span>
            )}
          </div>
        </div>
      </div>

      {showActions && isActionable && onStatusChange && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge 
            className="bg-bill-passed cursor-pointer hover:opacity-90" 
            onClick={() => onStatusChange(document.id, "concluded")}
          >
            Mark as Concluded
          </Badge>
        </div>
      )}
    </Card>
  );
};
