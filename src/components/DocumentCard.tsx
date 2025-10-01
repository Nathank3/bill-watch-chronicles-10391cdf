
import { useState, useEffect } from "react";
import { Document, useDocuments } from "@/contexts/DocumentContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RescheduleDialog } from "./RescheduleDialog";
import { formatDistanceToNow, isPast, format } from "date-fns";
import { Calendar, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DocumentCardProps {
  document: Document;
  showActions?: boolean;
  onStatusChange?: (id: string, status: "pending" | "concluded") => void;
}

export const DocumentCard = ({ document, showActions = false, onStatusChange }: DocumentCardProps) => {
  const { rescheduleDocument, deleteDocument } = useDocuments();
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
        const distance = formatDistanceToNow(document.presentationDate, { addSuffix: true });
        setTimeLeft(distance);
      }
    };

    // Update immediately
    updateCountdown();
    
    // Then update every minute
    const interval = setInterval(updateCountdown, 60000);
    
    return () => clearInterval(interval);
  }, [document.presentationDate]);

  const handleReschedule = (additionalDays: number) => {
    rescheduleDocument(document.id, additionalDays);
  };

  const handleDelete = () => {
    deleteDocument(document.id);
  };

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
    return format(date, "dd/MM/yyyy");
  };

  const isActionable = isPastDeadline && document.status === "pending";
  const documentType = document.type.charAt(0).toUpperCase() + document.type.slice(1);
  const shouldShowCountdown = document.status === "pending" && document.pendingDays > 0;

  return (
    <Card className={`document-card document-${document.status} p-4`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
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
            {(document.status === "pending" || document.status === "overdue") && (
              <>
                <p className="text-sm">
                  <span className="font-medium">Days Allocated:</span> {document.daysAllocated} days
                </p>
                <p className="text-sm">
                  <span className="font-medium">Current Countdown:</span> {document.currentCountdown} days
                </p>
              </>
            )}
            {document.extensionsCount > 0 && (
              <p className="text-sm text-amber-600">
                <span className="font-medium">Extensions:</span> {document.extensionsCount} time(s)
              </p>
            )}
            <p className="text-sm">
              <span className="font-medium">Date Due:</span> {formatDate(document.presentationDate)}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge(document.status)}
            {shouldShowCountdown && (
              <span className={`countdown text-sm ${isPastDeadline ? "countdown-urgent text-destructive font-medium" : "text-muted-foreground"}`}>
                {timeLeft}
              </span>
            )}
          </div>
        </div>
      </div>

      {showActions && (
        <div className="mt-4 flex flex-wrap gap-2">
          {isActionable && onStatusChange && (
            <Badge 
              className="bg-bill-passed cursor-pointer hover:opacity-90" 
              onClick={() => onStatusChange(document.id, "concluded")}
            >
              Mark as Concluded
            </Badge>
          )}
          
          {document.status === "pending" && (
            <RescheduleDialog onReschedule={handleReschedule}>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-1" />
                Reschedule
              </Button>
            </RescheduleDialog>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the {documentType.toLowerCase()} "{document.title}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </Card>
  );
};
