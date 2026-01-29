import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { format, addDays, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, Loader2, AlertTriangle, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { supabase } from "@/integrations/supabase/client.ts";
import { convertBusinessItem } from "@/utils/businessConverter.ts";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast.ts";
import { DocumentType } from "@/types/document.ts";

interface EditBusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    title: string;
    committee: string;
    type: "bill" | DocumentType;
    status: string;
    dateCommitted: Date | null;
    pendingDays: number;
    presentationDate: Date | null;
    daysAllocated: number;
    extensionsCount: number;
    statusReason?: string;
  };
}

export const EditBusinessDialog = ({ open, onOpenChange, item }: EditBusinessDialogProps) => {
  const [title, setTitle] = useState(item.title);
  const [committee, setCommittee] = useState(item.committee);
  const [status, setStatus] = useState(item.status);
  const [statusReason, setStatusReason] = useState(item.statusReason || "");
  const [type, setType] = useState<string>(item.type === "bill" ? "Bill" : item.type.charAt(0).toUpperCase() + item.type.slice(1));
  const [dateCommitted, setDateCommitted] = useState<Date | undefined>(item.dateCommitted || undefined);
  
  // Date Logic
  const [pendingDays, setPendingDays] = useState<number>(item.pendingDays || 0);
  const [presentationDate, setPresentationDate] = useState<Date | undefined>(item.presentationDate || undefined);

  const [committees, setCommittees] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Reset state when item changes or dialog opens
  useEffect(() => {
    if (open) {
      setTitle(item.title);
      setCommittee(item.committee);
      setStatus(item.status);
      setStatusReason(item.statusReason || "");
      setType(item.type === "bill" ? "Bill" : item.type.charAt(0).toUpperCase() + item.type.slice(1));
      setDateCommitted(item.dateCommitted || undefined);
      setPendingDays(item.pendingDays || 0);
      setPresentationDate(item.presentationDate || undefined);
    }
  }, [open, item]);

  useEffect(() => {
    const fetchCommittees = async () => {
      const { data } = await supabase.from("committees").select("name").order("name");
      if (data) setCommittees(data.map(c => c.name));
    };
    fetchCommittees();
  }, []);

  // Update calculations when Committed Date changes
  const handleCommittedDateChange = (date: Date | undefined) => {
    setDateCommitted(date);
    if (date && pendingDays) {
        // If we have days, recalculate due date from new start date
        setPresentationDate(addDays(date, pendingDays));
    } else if (date && presentationDate) {
        // If we have due date, keep it (effectively changing duration)
        const diff = differenceInDays(presentationDate, date);
        setPendingDays(diff);
    }
  };

  // Update calculations when Days change
  const handleDaysChange = (days: number) => {
    setPendingDays(days);
    if (dateCommitted) {
        setPresentationDate(addDays(dateCommitted, days));
    }
  };

  // Update calculations when Due Date changes
  const handlePresentationDateChange = (date: Date | undefined) => {
      setPresentationDate(date);
      if (date && dateCommitted) {
          const diff = differenceInDays(date, dateCommitted);
          setPendingDays(diff);
      }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const normalizedType = type.toLowerCase() as "bill" | DocumentType;
      
      // Determine if extension count should increase
      // Simplistic logic: if days increased, maybe extension? 
      // For now, we won't auto-increment extensions counter here unless explicitly requested, 
      // but the user can use the Reschedule dialog for explicit extensions. 
      // However, if they edit here, we just save the new values.
      
      await convertBusinessItem(
        item as any,
        normalizedType,
        {
          title,
          committee,
          dateCommitted: dateCommitted,
          status,
          statusReason: (status === "limbo" || status === "concluded") ? statusReason : undefined,
          pendingDays,
          presentationDate: presentationDate,
          // If status isn't limbo, ensure we have valid dates? 
          // Database might require them for 'pending'.
        }
      );

      toast({
        title: "Success",
        description: "Business item updated successfully."
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update item:", error);
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isTypeChanging = (type.toLowerCase() === "bill" && item.type !== "bill") || 
                         (type.toLowerCase() !== "bill" && item.type === "bill");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Business Item</DialogTitle>
          <DialogDescription>
             Modify details, manage dates, or change the category.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bill">Bill</SelectItem>
                <SelectItem value="Motion">Motion</SelectItem>
                <SelectItem value="Statement">Statement</SelectItem>
                <SelectItem value="Report">Report</SelectItem>
                <SelectItem value="Petition">Petition</SelectItem>
                <SelectItem value="Regulation">Regulation</SelectItem>
                <SelectItem value="Policy">Policy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="committee" className="text-right">
              Committee
            </Label>
            <Select value={committee} onValueChange={setCommittee}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select committee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Committees">All Committees</SelectItem>
                {committees.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Management Section */}
          <div className="col-span-4 border-t border-b py-4 my-2 space-y-4 bg-muted/20 -mx-6 px-6">
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Timeline Management</h4>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Committed</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !dateCommitted && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateCommitted ? format(dateCommitted, "PPP") : <span>Pick Start Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateCommitted}
                      onSelect={handleCommittedDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="days" className="text-right">Allocated Days</Label>
                  <div className="col-span-3 flex items-center gap-2">
                       <Button 
                            variant="outline" size="icon" className="h-9 w-9" 
                            onClick={() => handleDaysChange(pendingDays - 1)}
                            disabled={!dateCommitted}
                       >
                           <Minus className="h-3 w-3" />
                       </Button>
                       <Input 
                            id="days" type="number" 
                            value={pendingDays} 
                            onChange={(e) => handleDaysChange(parseInt(e.target.value) || 0)}
                            className="w-24 text-center"
                            disabled={!dateCommitted}
                       />
                       <Button 
                            variant="outline" size="icon" className="h-9 w-9" 
                            onClick={() => handleDaysChange(pendingDays + 1)}
                            disabled={!dateCommitted}
                       >
                           <Plus className="h-3 w-3" />
                       </Button>
                       <span className="text-xs text-muted-foreground ml-2">(Edit duration directly)</span>
                  </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium text-primary">Due Date</Label>
                <div className="col-span-3 flex gap-2">
                    <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant="outline"
                        className={cn(
                            "flex-1 justify-start text-left font-normal border-primary/50 bg-primary/5",
                            !presentationDate && "text-muted-foreground"
                        )}
                        disabled={!dateCommitted}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {presentationDate ? format(presentationDate, "PPP") : <span>Calculated Deadline</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={presentationDate}
                        onSelect={handlePresentationDateChange}
                        initialFocus
                        disabled={(date) => dateCommitted ? date < dateCommitted : false}
                        />
                    </PopoverContent>
                    </Popover>
                </div>
              </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="concluded">Concluded</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="frozen">Frozen</SelectItem>
                <SelectItem value="limbo">Limbo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(status === "limbo" || status === "concluded") && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                {status === "concluded" ? "Conclusion Details" : "Limbo Reason"}
              </Label>
              <Textarea
                id="reason"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="col-span-3"
                placeholder={status === "concluded" ? "Final outcome summary..." : "Why is this in Limbo?"}
              />
            </div>
          )}
          
           {isTypeChanging && (
             <div className="col-span-4 bg-amber-50 rounded-md p-3 flex gap-2 items-start text-sm text-amber-800 border border-amber-200">
               <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
               <div>
                 <strong>Warning: Type Conversion</strong>
                 <p>Converting between Bills and other Documents will create a new record and delete the old one. The ID will change.</p>
               </div>
             </div>
           )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
