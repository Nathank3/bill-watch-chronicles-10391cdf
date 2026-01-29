
import { useState, useEffect } from "react";
import { Bill, useBills } from "@/contexts/BillContext.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { RescheduleDialog } from "./RescheduleDialog.tsx";
import { formatDistanceToNow, format } from "date-fns";
import { Calendar, Trash2, Snowflake } from "lucide-react";
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

interface BillCardProps {
  bill: Bill;
  showActions?: boolean;
  onStatusChange?: (id: string, status: "pending" | "concluded" | "overdue") => void;
  onReschedule?: (id: string, newDate: Date) => void;
}

export const BillCard = ({ bill, showActions = false, onStatusChange, onReschedule }: BillCardProps) => {
  const { rescheduleBill, deleteBill } = useBills();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [currentCountdown, setCurrentCountdown] = useState<number>(0);
  const [isOverdue, setIsOverdue] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Update countdown in real-time
  useEffect(() => {
    const updateCountdown = () => {
      const countdown = calculateCurrentCountdown(bill.presentationDate);
      const overdue = isItemOverdue(bill.presentationDate, bill.extensionsCount);

      setCurrentCountdown(countdown);
      setIsOverdue(overdue);

      if (bill.status === "concluded" || !bill.presentationDate) {
        setTimeLeft("");
      } else {
        const distance = formatDistanceToNow(bill.presentationDate, { addSuffix: true });
        setTimeLeft(distance);
      }
    };

    // Update immediately
    updateCountdown();

    // Then update every minute
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [bill.presentationDate, bill.status, bill.extensionsCount]);

  const handleReschedule = (newDate: Date) => {
    if (onReschedule) {
      onReschedule(bill.id, newDate);
    } else {
      rescheduleBill(bill.id, newDate);
    }
  };

  const handleDelete = () => {
    deleteBill(bill.id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-bill-pending">Pending</Badge>;
      case "overdue":
        return <Badge className="bg-destructive text-destructive-foreground">Overdue</Badge>;
      case "frozen":
        return (
          <Badge className="bg-bill-frozen text-blue-900 border-blue-200">
            <Snowflake className="h-3 w-3 mr-1" />
            Frozen
          </Badge>
        );
      case "limbo":
        return <Badge variant="secondary" className="bg-gray-200 text-gray-700">In Limbo</Badge>;
      case "concluded":
        return <Badge className="bg-bill-passed">Concluded</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (date: Date): string => {
    return format(date, "dd/MM/yyyy");
  };

  const effectiveStatus = determineItemStatus(bill.status, bill.presentationDate, bill.extensionsCount);
  const isActionable = isOverdue || effectiveStatus === "overdue" || effectiveStatus === "frozen";
  const shouldShowCountdown = (effectiveStatus === "pending" || effectiveStatus === "overdue" || effectiveStatus === "frozen") && timeLeft;

  return (
    <Card className={`bill-card bill-${effectiveStatus} p-4 ${effectiveStatus === "frozen" ? "bill-frozen" : ""}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-start gap-2 mb-1 flex-wrap">
            <h3 className={`font-medium text-lg break-words flex-1 min-w-0 ${effectiveStatus === "frozen" ? "text-destructive" : ""}`}>
              {bill.title}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Committee: {bill.committee}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="font-medium">Date Committed:</span> {bill.dateCommitted ? formatDate(bill.dateCommitted) : "TBD (In Limbo)"}
            </p>
            {(effectiveStatus === "pending" || effectiveStatus === "overdue" || effectiveStatus === "frozen") && (
              <>
                <p className="text-sm">
                  <span className="font-medium">Days Allocated:</span> {bill.daysAllocated} days
                </p>
                <p className={`text-sm ${isOverdue || effectiveStatus === "frozen" ? "text-destructive font-semibold" : ""}`}>
                  <span className="font-medium">Days Remaining:</span> {Math.abs(currentCountdown)} days
                </p>
              </>
            )}
            
            {/* Limbo Message */}
            {effectiveStatus === "limbo" && (
                 <p className="text-sm text-muted-foreground italic">
                    Awaiting court judgment or further action.
                 </p>
            )}

            {bill.extensionsCount > 0 && (
              <p className="text-sm text-amber-600">
                <span className="font-medium">Extensions:</span> {bill.extensionsCount} time(s)
              </p>
            )}
            <p className="text-sm">
              <span className="font-medium">Date Due:</span> {bill.presentationDate ? formatDate(bill.presentationDate) : "TBD"}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge(effectiveStatus)}
            {shouldShowCountdown && (
              <span className={`countdown text-sm ${isOverdue || effectiveStatus === "frozen"
                ? "countdown-urgent text-destructive font-medium"
                : "text-muted-foreground"
                }`}>
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
              onClick={() => onStatusChange(bill.id, "concluded")}
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
                  This action cannot be undone. This will permanently delete the bill "{bill.title}".
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
          id: bill.id,
          title: bill.title,
          committee: bill.committee,
          type: "bill",
          status: bill.status,
          dateCommitted: bill.dateCommitted,
          pendingDays: bill.daysAllocated, // Approximate mapping
          presentationDate: bill.presentationDate,
          daysAllocated: bill.daysAllocated,
          extensionsCount: bill.extensionsCount
        }}
      />
    </Card>
  );
};
