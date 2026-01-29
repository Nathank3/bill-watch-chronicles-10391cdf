import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils.ts"
import { Button } from "@/components/ui/button.tsx"
import { Calendar } from "@/components/ui/calendar.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx"

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: React.HTMLAttributes<HTMLDivElement> & {
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
}) {
  const [fromString, setFromString] = React.useState("")
  const [toString, setToString] = React.useState("")

  // Sync inputs with selected date
  React.useEffect(() => {
    if (date?.from) setFromString(format(date.from, "yyyy-MM-dd"))
    if (date?.to) setToString(format(date.to, "yyyy-MM-dd"))
    else if (!date?.to) setToString("") 
    if (!date) {
        setFromString("")
        setToString("")
    }
  }, [date])

  const handleManualInput = (type: "from" | "to", value: string) => {
    if (type === "from") setFromString(value)
    else setToString(value)

    const parsedDate = parse(value, "yyyy-MM-dd", new Date())
    
    if (isValid(parsedDate)) {
      if (type === "from") {
        setDate({ from: parsedDate, to: date?.to })
      } else {
        setDate({ from: date?.from, to: parsedDate })
      }
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b space-y-3">
             <div className="flex gap-2">
                <div className="grid gap-1.5 flex-1">
                    <Label htmlFor="from">Start</Label>
                    <Input 
                        id="from" 
                        type="date" 
                        value={fromString} 
                        onChange={(e) => handleManualInput("from", e.target.value)} 
                        className="h-8"
                    />
                </div>
                <div className="grid gap-1.5 flex-1">
                     <Label htmlFor="to">End</Label>
                     <Input 
                        id="to" 
                        type="date" 
                        value={toString} 
                        onChange={(e) => handleManualInput("to", e.target.value)}
                        className="h-8" 
                    />
                </div>
             </div>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            captionLayout="dropdown-buttons"
            fromYear={2010}
            toYear={2030}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
