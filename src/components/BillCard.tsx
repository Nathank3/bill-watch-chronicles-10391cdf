
import { useState, useEffect } from "react";
import { Bill, useBills } from "@/contexts/BillContext";
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

interface BillCardProps {
  bill: Bill;
  showActions?: boolean;
  onStatusChange?: (id: string, status: "pending" | "concluded" | "overdue") => void;
  onReschedule?: (id: string, additionalDays: number) => void;
}

export const BillCard = ({ bill, showActions = false, onStatusChange, onReschedule }: BillCardProps) => {
  const { rescheduleBill, deleteBill } = useBills();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isPastDeadline, setIsPastDeadline] = useState<boolean>(false);

  // Update countdown in real-time
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const isPastDate = isPast(bill.presentationDate);
      setIsPastDeadline(isPastDate);
      
      if (bill.status === "concluded") {
        setTimeLeft("");
      } else if (isPastDate || bill.status === "overdue") {
        const distance = formatDistanceToNow(bill.presentationDate, { addSuffix: true });
        setTimeLeft(distance);
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
  }, [bill.presentationDate, bill.status]);

  const handleReschedule = (additionalDays: number) => {
    if (onReschedule) {
      onReschedule(bill.id, additionalDays);
    } else {
      rescheduleBill(bill.id, additionalDays);
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
      case "concluded":
        return <Badge className="bg-bill-passed">Concluded</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (date: Date): string => {
    return format(date, "dd/MM/yyyy");
  };

  const isActionable = (isPastDeadline && bill.status === "pending") || bill.status === "overdue";
  const shouldShowCountdown = (bill.status === "pending" || bill.status === "overdue") && timeLeft;

  return (
    <Card className={`bill-card bill-${bill.status} p-4`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-lg mb-1">{bill.title}</h3>
          <p className="text-sm text-muted-foreground">
            Committee: {bill.committee}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="font-medium">Date Committed:</span> {formatDate(bill.dateCommitted)}
            </p>
            {(bill.status === "pending" || bill.status === "overdue") && (
              <p className="text-sm">
                <span className="font-medium">Days Allocated:</span> {bill.pendingDays} days
              </p>
            )}
            {bill.status === "overdue" && (
              <p className="text-sm text-destructive">
                <span className="font-medium">Overdue Days:</span> {bill.overdue_days || 0} days
              </p>
            )}
            {bill.status === "concluded" && bill.date_laid && (
              <p className="text-sm text-green-600">
                <span className="font-medium">Date Laid:</span> {formatDate(new Date(bill.date_laid))}
              </p>
            )}
            <p className="text-sm">
              <span className="font-medium">Date Due:</span> {formatDate(bill.presentationDate)}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge(bill.status)}
            {shouldShowCountdown && (
              <span className={`countdown text-sm ${
                bill.status === "overdue" || isPastDeadline 
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
          
          {(bill.status === "pending" || bill.status === "overdue") && (
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
    </Card>
  );
};
