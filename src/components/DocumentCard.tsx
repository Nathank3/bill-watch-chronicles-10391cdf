
import { useState, useEffect } from "react";
import { Document, useDocuments } from "@/contexts/DocumentContext.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { RescheduleDialog } from "./RescheduleDialog.tsx";
import { formatDistanceToNow, format } from "date-fns";
import { Calendar, Trash2, Snowflake } from "lucide-react";
import { calculateCurrentCountdown, isItemOverdue, determineItemStatus } from "@/utils/countdownUtils.ts";
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
} from "@/components/ui/alert-dialog.tsx";

interface DocumentCardProps {
  document: Document;
  showActions?: boolean;
  onStatusChange?: (id: string, status: "pending" | "concluded") => void;
}

export const DocumentCard = ({ document, showActions = false, onStatusChange }: DocumentCardProps) => {
  const { rescheduleDocument, deleteDocument } = useDocuments();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [currentCountdown, setCurrentCountdown] = useState<number>(0);
  const [isOverdue, setIsOverdue] = useState<boolean>(false);

  // Update countdown in real-time
  useEffect(() => {
    const updateCountdown = () => {
      const countdown = calculateCurrentCountdown(document.presentationDate);
      const overdue = isItemOverdue(document.presentationDate, document.extensionsCount);

      setCurrentCountdown(countdown);
      setIsOverdue(overdue);

      if (document.status === "concluded") {
        setTimeLeft("");
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
  }, [document.presentationDate, document.status, document.extensionsCount]);


  const handleReschedule = (newDate: Date) => {
    rescheduleDocument(document.id, newDate);
  };

  const handleDelete = () => {
    deleteDocument(document.id);
  };

  const effectiveStatus = determineItemStatus(document.status, document.presentationDate, document.extensionsCount);

  const getStatusBadge = () => {
    switch (effectiveStatus) {
      case "concluded":
        return <Badge className="bg-bill-passed">Concluded</Badge>;
      case "frozen":
        return (
          <Badge className="bg-bill-frozen text-blue-900 border-blue-200">
            <Snowflake className="h-3 w-3 mr-1" />
            Frozen
          </Badge>
        );
      case "overdue":
        return <Badge className="bg-destructive text-destructive-foreground">Overdue</Badge>;
      default:
        return <Badge className="bg-bill-pending">Pending</Badge>;
    }
  };

  const formatDate = (date: Date): string => {
    return format(date, "dd/MM/yyyy");
  };

  const isActionable = isOverdue || effectiveStatus === "overdue" || effectiveStatus === "frozen";
  const documentType = document.type.charAt(0).toUpperCase() + document.type.slice(1);
  const shouldShowCountdown = (effectiveStatus === "pending" || effectiveStatus === "overdue" || effectiveStatus === "frozen") && timeLeft;

  return (
    <Card className={`document-card document-${effectiveStatus} p-4 ${effectiveStatus === "frozen" ? "bill-frozen" : ""}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-start gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="shrink-0">{documentType}</Badge>
            <h3 className={`font-medium text-lg break-words flex-1 min-w-0 ${effectiveStatus === "frozen" ? "text-destructive" : ""}`}>
              {document.title}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Committee: {document.committee}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="font-medium">Date Committed:</span> {formatDate(document.dateCommitted)}
            </p>
            {(effectiveStatus === "pending" || effectiveStatus === "overdue" || effectiveStatus === "frozen") && (
              <>
                <p className="text-sm">
                  <span className="font-medium">Days Allocated:</span> {document.daysAllocated} days
                </p>
                <p className={`text-sm ${isOverdue || effectiveStatus === "frozen" ? "text-destructive font-semibold" : ""}`}>
                  <span className="font-medium">{isOverdue || effectiveStatus === "frozen" ? "Days Overdue" : "Days Remaining"}:</span> {Math.abs(currentCountdown)} days
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
            {getStatusBadge()}
            {shouldShowCountdown && (
              <span className={`countdown text-sm ${isOverdue || effectiveStatus === "frozen" ? "countdown-urgent text-destructive font-medium" : "text-muted-foreground"}`}>
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

          {(effectiveStatus === "pending" || effectiveStatus === "overdue" || effectiveStatus === "frozen") && (
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
