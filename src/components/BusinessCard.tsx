import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Business, BusinessStatus } from "@/types/business";
import { useBusiness } from "@/contexts/BusinessContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RescheduleDialog } from "@/components/RescheduleDialog";
import { Clock, Calendar, Building2, FileText } from "lucide-react";

interface BusinessCardProps {
  business: Business;
  showActions?: boolean;
  onStatusChange?: (id: string, status: BusinessStatus) => void;
  onReschedule?: (id: string, additionalDays: number) => void;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({ 
  business, 
  showActions = false, 
  onStatusChange,
  onReschedule 
}) => {
  const { rescheduleBusiness, deleteBusiness } = useBusiness();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isPastDeadline, setIsPastDeadline] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const timeDiff = business.presentationDate.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        setIsPastDeadline(true);
        const overdueDays = Math.floor(Math.abs(timeDiff) / (1000 * 60 * 60 * 24));
        setTimeLeft(`Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`);
      } else {
        setIsPastDeadline(false);
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeLeft(`${days} day${days !== 1 ? 's' : ''}, ${hours}h`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${minutes}m`);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [business.presentationDate]);

  const handleReschedule = (additionalDays: number) => {
    if (onReschedule) {
      onReschedule(business.id, additionalDays);
    } else {
      rescheduleBusiness(business.id, additionalDays);
    }
  };

  const handleDelete = () => {
    deleteBusiness(business.id);
  };

  const getStatusBadge = (status: BusinessStatus) => {
    const statusConfig = {
      pending: { variant: "default" as const, label: "Pending" },
      passed: { variant: "secondary" as const, label: "Passed" },
      overdue: { variant: "destructive" as const, label: "Overdue" }
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      bill: FileText,
      statement: Building2,
      report: FileText,
      regulation: Building2,
      policy: FileText,
      petition: FileText
    };
    const Icon = icons[type as keyof typeof icons] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const formatDate = (date: Date) => format(date, "dd/MM/yyyy");
  
  const isActionable = business.status === "pending" || business.status === "overdue";
  const shouldShowCountdown = isActionable;

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg leading-tight flex items-center gap-2">
            {getTypeIcon(business.type)}
            {business.title}
          </CardTitle>
          {getStatusBadge(business.status)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Committee:</span>
            <span className="font-medium">{business.committee}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Due:</span>
            <span className="font-medium">{formatDate(business.presentationDate)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Committed:</span>
            <span className="font-medium">{formatDate(business.dateCommitted)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Days allocated:</span>
            <span className="font-medium">{business.daysAllocated}</span>
          </div>
        </div>

        {shouldShowCountdown && (
          <div className={`text-sm p-2 rounded-md ${
            isPastDeadline 
              ? "bg-destructive/10 text-destructive border border-destructive/20" 
              : "bg-primary/10 text-primary border border-primary/20"
          }`}>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{timeLeft}</span>
            </div>
          </div>
        )}

        {showActions && isActionable && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange?.(business.id, "passed")}
            >
              Mark as Passed
            </Button>
            
            <RescheduleDialog onReschedule={handleReschedule}>
              <Button size="sm" variant="outline">
                Reschedule
              </Button>
            </RescheduleDialog>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{business.title}". This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};