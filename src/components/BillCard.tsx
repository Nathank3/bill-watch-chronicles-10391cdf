
import { useEffect, useState } from "react";
import { Bill } from "@/contexts/BillContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RescheduleDialog } from "./RescheduleDialog";
import { formatDistanceToNow, isPast, format, differenceInDays } from "date-fns";

interface BillCardProps {
  bill: Bill;
  showActions?: boolean;
  onStatusChange?: (id: string, status: "pending" | "concluded") => void;
  onReschedule?: (id: string, newDays: number) => void;
}

export const BillCard = ({ bill, showActions = false, onStatusChange, onReschedule }: BillCardProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isPastDeadline, setIsPastDeadline] = useState<boolean>(false);
  const [actualPendingDays, setActualPendingDays] = useState<number>(0);

  // Update countdown in real-time
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const isPastDate = isPast(bill.presentationDate);
      setIsPastDeadline(isPastDate);
      
      // Calculate actual pending days remaining
      const daysRemaining = differenceInDays(bill.presentationDate, now);
      setActualPendingDays(Math.max(0, daysRemaining));
      
      if (isPastDate) {
        setTimeLeft("Deadline passed");
      } else {
        setTimeLeft(formatDistanceToNow(bill.presentationDate, { addSuffix: true }));
      }
    };

    // Update immediately
    updateCountdown();
    
    // Then update every minute
    const interval = setInterval(updateCountdown, 60000);
    
    return () => clearInterval(interval);
  }, [bill.presentationDate]);

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

  const isActionable = isPastDeadline && bill.status === "pending";
  const canReschedule = bill.status === "pending";

  const handleReschedule = (days: number) => {
    if (onReschedule) {
      onReschedule(bill.id, days);
    }
  };

  return (
    <Card className={`bill-card bill-${bill.status} p-4`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-lg">{bill.title}</h3>
          <p className="text-sm text-muted-foreground">
            Committee: {bill.committee}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="font-medium">Date Committed:</span> {formatDate(bill.dateCommitted)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Days Remaining:</span> {actualPendingDays} days
            </p>
            <p className="text-sm">
              <span className="font-medium">Date Due:</span> {formatDate(bill.presentationDate)}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge(bill.status)}
            {bill.status === "pending" && (
              <span className={`countdown ${isPastDeadline ? "countdown-urgent" : ""}`}>
                {timeLeft}
              </span>
            )}
          </div>
        </div>
      </div>

      {showActions && bill.status === "pending" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {isActionable && onStatusChange && (
            <Button 
              size="sm"
              onClick={() => onStatusChange(bill.id, "concluded")}
              className="bg-green-600 hover:bg-green-700"
            >
              Mark as Concluded
            </Button>
          )}
          {canReschedule && onReschedule && (
            <RescheduleDialog onReschedule={handleReschedule}>
              <Button 
                size="sm"
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Reschedule
              </Button>
            </RescheduleDialog>
          )}
        </div>
      )}
    </Card>
  );
};
