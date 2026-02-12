
import { useState, useEffect } from "react";
import { Document, useDocuments } from "@/contexts/DocumentContext.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { RescheduleDialog } from "./RescheduleDialog.tsx";
import { CountdownProgress } from "./CountdownProgress.tsx";
import { formatDistanceToNow, format } from "date-fns";
import { Calendar, Trash2, Snowflake, Clock, AlertCircle, HelpCircle, CheckCircle2 } from "lucide-react";
import { calculateCurrentCountdown, isItemOverdue, determineItemStatus } from "@/utils/countdownUtils.ts";
import { EditBusinessDialog } from "./EditBusinessDialog.tsx";
import { Edit3 } from "lucide-react";
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Update countdown in real-time
  useEffect(() => {
    const updateCountdown = () => {
      const countdown = calculateCurrentCountdown(document.presentationDate);
      const overdue = isItemOverdue(document.presentationDate, document.extensionsCount);

      setCurrentCountdown(countdown);
      setIsOverdue(overdue);

      if (document.status === "concluded" || !document.presentationDate) {
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
        return (
          <Badge className="bg-green-600 text-white flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Concluded
          </Badge>
        );
      case "tbd":
        return (
          <Badge variant="secondary" className="bg-gray-200 text-gray-700 flex items-center gap-1">
            <HelpCircle className="h-3 w-3" />
            TBD
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="bg-red-600 text-white flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Overdue
          </Badge>
        );
      case "frozen":
        return (
          <Badge className="bg-cyan-500 text-white flex items-center gap-1">
            <Snowflake className="h-3 w-3" />
            Frozen
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-500 text-white flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const formatDate = (date: Date): string => {
    return format(date, "dd/MM/yyyy");
  };

  const isActionable = isOverdue || effectiveStatus === "overdue";
  const documentType = document.type.charAt(0).toUpperCase() + document.type.slice(1);
  const shouldShowCountdown = (effectiveStatus === "pending" || effectiveStatus === "overdue") && timeLeft;

  return (
    <Card className={`document-card document-${effectiveStatus} p-4`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-start gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="shrink-0">{documentType}</Badge>
            <h3 className={`font-medium text-lg break-words flex-1 min-w-0`}>
              {document.title}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Committee: {document.committee}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="font-medium">Date Committed:</span> {document.dateCommitted ? formatDate(document.dateCommitted) : (effectiveStatus === "concluded" ? "N/A" : "TBD")}
            </p>
            {(effectiveStatus === "pending" || effectiveStatus === "overdue") && (
              <>
                <p className="text-sm">
                  <span className="font-medium">Days Allocated:</span> {document.daysAllocated} days
                </p>
                <p className={`text-sm ${isOverdue ? "text-destructive font-semibold" : ""}`}>
                  <span className="font-medium">{isOverdue ? "Days Overdue" : "Days Remaining"}:</span> {Math.abs(currentCountdown)} days
                </p>
                
                {/* Visual Progress Indicator */}
                <div className="mt-3">
                  <CountdownProgress 
                    daysRemaining={currentCountdown} 
                    totalDays={document.daysAllocated}
                    isOverdue={isOverdue}
                  />
                </div>
              </>
            )}
            
            {/* TBD Message */}
            {effectiveStatus === "tbd" && (
                 <p className="text-sm text-muted-foreground italic">
                    Awaiting court judgment or further action.
                 </p>
            )}

            {document.extensionsCount > 0 && (
              <p className="text-sm text-amber-600">
                <span className="font-medium">Extensions:</span> {document.extensionsCount} time(s)
              </p>
            )}
            <p className="text-sm">
              <span className="font-medium">Date Due:</span> {document.presentationDate ? formatDate(document.presentationDate) : "TBD"}
            </p>
            {effectiveStatus === "concluded" && (
              <p className="text-sm">
                <span className="font-medium">Date Concluded:</span> {document.concludedAt ? formatDate(document.concludedAt) : "N/A"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge()}
            
            {/* Show Concluded Date */}
            {effectiveStatus === "concluded" && document.concludedAt && (
              <span className="text-sm text-green-700 font-medium">
                on {formatDate(document.concludedAt)}
              </span>
            )}

            {shouldShowCountdown && (
              <span className={`countdown text-sm ${isOverdue ? "countdown-urgent text-destructive font-medium" : "text-muted-foreground"}`}>
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

          {(effectiveStatus === "pending" || effectiveStatus === "overdue") && (
            <RescheduleDialog onReschedule={handleReschedule}>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-1" />
                Reschedule
              </Button>
            </RescheduleDialog>
          )}

          {/* Edit Button */}
          <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
            <Edit3 className="h-4 w-4 mr-1" />
            Edit
          </Button>

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
      
       {/* Edit Dialog */}
      <EditBusinessDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen} 
        item={{
          id: document.id,
          title: document.title,
          committee: document.committee,
          type: document.type,
          status: document.status,
          dateCommitted: document.dateCommitted,
          pendingDays: document.daysAllocated,
          presentationDate: document.presentationDate,
          daysAllocated: document.daysAllocated,
          extensionsCount: document.extensionsCount,
          concludedAt: document.concludedAt
        }}
      />
    </Card>
  );
};
