
import { useEffect, useState } from "react";
import { Bill } from "@/contexts/BillContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, isPast, format } from "date-fns";

interface BillCardProps {
  bill: Bill;
  showActions?: boolean;
  onStatusChange?: (id: string, status: "passed" | "rejected" | "rescheduled", newDate?: Date) => void;
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
      case "passed":
        return <Badge className="bg-bill-passed">Passed</Badge>;
      case "rejected":
        return <Badge className="bg-bill-rejected">Rejected</Badge>;
      case "rescheduled":
        return <Badge className="bg-bill-rescheduled">Rescheduled</Badge>;
      default:
        return null;
    }
  };

  const isActionable = isPastDeadline && bill.status === "pending";

  return (
    <Card className={`bill-card bill-${bill.status}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-lg">{bill.title}</h3>
          <p className="text-sm text-muted-foreground">
            {bill.mca} • {bill.department}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {getStatusBadge(bill.status)}
            <span className={`countdown ${isPastDeadline && bill.status === "pending" ? "countdown-urgent" : ""}`}>
              {timeLeft}
            </span>
          </div>
        </div>
      </div>

      {showActions && isActionable && onStatusChange && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge 
            className="bg-bill-passed cursor-pointer hover:opacity-90" 
            onClick={() => onStatusChange(bill.id, "passed")}
          >
            Mark as Passed
          </Badge>
          <Badge 
            className="bg-bill-rejected cursor-pointer hover:opacity-90" 
            onClick={() => onStatusChange(bill.id, "rejected")}
          >
            Mark as Rejected
          </Badge>
          <Badge 
            className="bg-bill-rescheduled cursor-pointer hover:opacity-90" 
            onClick={() => {
              // For simplicity, just add 7 days to current date
              const newDate = new Date(bill.presentationDate);
              newDate.setDate(newDate.getDate() + 7);
              onStatusChange(bill.id, "rescheduled", newDate);
            }}
          >
            Reschedule
          </Badge>
        </div>
      )}

      <div className="mt-2 text-xs text-muted-foreground">
        Presentation date: {format(bill.presentationDate, "PPP p")}
      </div>
    </Card>
  );
};
