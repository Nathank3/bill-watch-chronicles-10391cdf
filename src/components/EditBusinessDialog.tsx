import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, AlertTriangle } from "lucide-react";
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
    dateCommitted: Date;
    pendingDays: number;
    presentationDate: Date;
    daysAllocated: number;
    extensionsCount: number;
  };
}

export const EditBusinessDialog = ({ open, onOpenChange, item }: EditBusinessDialogProps) => {
  const [title, setTitle] = useState(item.title);
  const [committee, setCommittee] = useState(item.committee);
  const [type, setType] = useState<string>(item.type === "bill" ? "Bill" : item.type.charAt(0).toUpperCase() + item.type.slice(1));
  const [dateCommitted, setDateCommitted] = useState<Date>(item.dateCommitted);
  const [committees, setCommittees] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Reset state when item changes or dialog opens
  useEffect(() => {
    if (open) {
      setTitle(item.title);
      setCommittee(item.committee);
      setType(item.type === "bill" ? "Bill" : item.type.charAt(0).toUpperCase() + item.type.slice(1));
      setDateCommitted(item.dateCommitted);
    }
  }, [open, item]);

  useEffect(() => {
    const fetchCommittees = async () => {
      const { data } = await supabase.from("committees").select("name").order("name");
      if (data) setCommittees(data.map(c => c.name));
    };
    fetchCommittees();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const normalizedType = type.toLowerCase() as "bill" | DocumentType;
      
      await convertBusinessItem(
        item,
        normalizedType,
        {
          title,
          committee,
          dateCommitted
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Business Item</DialogTitle>
          <DialogDescription>
             Modify details or change the category of this item.
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
                {committees.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Committed</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !dateCommitted && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateCommitted ? format(dateCommitted, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateCommitted}
                  onSelect={(d) => d && setDateCommitted(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
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
