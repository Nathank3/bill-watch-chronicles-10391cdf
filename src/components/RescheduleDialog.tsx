
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RescheduleDialogProps {
  onReschedule: (days: number) => void;
  children: React.ReactNode;
}

export const RescheduleDialog = ({ onReschedule, children }: RescheduleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<string>("7");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numDays = parseInt(days);
    if (numDays > 0 && numDays <= 365) {
      onReschedule(numDays);
      setOpen(false);
      setDays("7");
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
          <div>
            <Label htmlFor="days">Number of days to add</Label>
            <Input
              id="days"
              type="number"
              min="1"
              max="365"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="Enter number of days"
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter between 1 and 365 days
            </p>
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
