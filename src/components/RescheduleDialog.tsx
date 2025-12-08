
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, differenceInCalendarDays, isPast } from "date-fns";
import { adjustForSittingDay } from "@/utils/documentUtils";

interface RescheduleDialogProps {
  onReschedule: (date: Date) => void;
  children: React.ReactNode;
}

export const RescheduleDialog = ({ onReschedule, children }: RescheduleDialogProps) => {
  const [open, setOpen] = useState(false);

  // State for date string (YYYY-MM-DD)
  const [dateStr, setDateStr] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // State for number of days from today
  const [daysToAdd, setDaysToAdd] = useState<number>(0);

  // Initialize on open
  useEffect(() => {
    if (open) {
      const today = new Date();
      setDateStr(format(today, "yyyy-MM-dd"));
      setDaysToAdd(0);
    }
  }, [open]);

  // Handle Date Input Change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateStr = e.target.value;
    setDateStr(newDateStr);

    if (newDateStr) {
      const newDate = new Date(newDateStr);
      if (!isNaN(newDate.getTime())) {
        const diff = differenceInCalendarDays(newDate, new Date());
        setDaysToAdd(diff > 0 ? diff : 0);
      }
    }
  };

  // Handle Days Input Change
  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = parseInt(e.target.value) || 0;
    setDaysToAdd(days);

    const today = new Date();
    const newDate = addDays(today, days);
    setDateStr(format(newDate, "yyyy-MM-dd"));
  };

  // Calculate the actual effective date (adjusted for sitting days)
  const calculateEffectiveDate = () => {
    const baseDate = new Date(dateStr);
    if (isNaN(baseDate.getTime())) return new Date();
    return adjustForSittingDay(baseDate);
  };

  const effectiveDate = calculateEffectiveDate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveDate) {
      onReschedule(effectiveDate);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="days-input">Days from Today</Label>
              <Input
                id="days-input"
                type="number"
                min="0"
                value={daysToAdd}
                onChange={handleDaysChange}
                placeholder="e.g. 7"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-input">Select Date</Label>
              <Input
                id="date-input"
                type="date"
                value={dateStr}
                onChange={handleDateChange}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border rounded-md p-4 bg-muted/20 items-center justify-center">
            <Label className="font-semibold text-muted-foreground">Effective Presentation Date</Label>
            <div className="pointer-events-none bg-background rounded-md shadow-sm scale-90">
              <Calendar
                mode="single"
                selected={effectiveDate}
                month={effectiveDate}
                className="rounded-md border"
                weekStartsOn={1}
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-primary">
                {format(effectiveDate, "EEEE, MMMM do, yyyy")}
              </p>
              {effectiveDate.getTime() !== new Date(dateStr).getTime() && (
                <p className="text-xs text-amber-600 mt-1">
                  *Adjusted to next sitting day
                </p>
              )}
            </div>

          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Reschedule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
