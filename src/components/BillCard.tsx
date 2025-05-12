
import { useEffect, useState } from "react";
import { Bill } from "@/contexts/BillContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, isPast, format } from "date-fns";

interface BillCardProps {
  bill: Bill;
  showActions?: boolean;
  onStatusChange?: (id: string, status: "pending" | "concluded") => void;
}

export const BillCard = ({ bill, showActions = false, onStatusChange }: BillCardProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isPastDeadline, setIsPastDeadline] = useState<boolean>(false);

  // Update countdown in real-time
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const isPastDate = isPast(bill.presentationDate);
      setIsPastDeadline(isPastDate);
      
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
    return format(date, "dd/MM/yyyy"); // Day/Month/Year format
  };

  const isActionable = isPastDeadline && bill.status === "pending";

  return (
    <Card className={`bill-card bill-${bill.status} p-4`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-lg">{bill.title}</h3>
          <p className="text-sm text-muted-foreground">
            Committee: {bill.committee}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="font-medium">Date Committed:</span> {formatDate(bill.dateCommitted)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Pending Days:</span> {bill.pendingDays} days
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

      {showActions && isActionable && onStatusChange && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge 
            className="bg-bill-passed cursor-pointer hover:opacity-90" 
            onClick={() => onStatusChange(bill.id, "concluded")}
          >
            Mark as Concluded
          </Badge>
        </div>
      )}
    </Card>
  );
};
