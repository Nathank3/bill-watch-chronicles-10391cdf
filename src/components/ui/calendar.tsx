import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils.ts";
import { buttonVariants } from "@/components/ui/button.tsx";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { format } from "date-fns";
import { useNavigation, useDayPicker } from "react-day-picker";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        CaptionLabel: ({ displayMonth }) => {
            const { goToMonth } = useNavigation();
            const { fromYear, fromDate, toYear, toDate } = useDayPicker();

            const startYear = fromYear || fromDate?.getFullYear() || 1900;
            const endYear = toYear || toDate?.getFullYear() || 2100;

            const years = React.useMemo(() => {
                const arr = [];
                for (let i = startYear; i <= endYear; i++) {
                    arr.push(i);
                }
                return arr;
            }, [startYear, endYear]);

            const months = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];

            const handleYearChange = (yearStr: string) => {
                const newYear = parseInt(yearStr, 10);
                const newDate = new Date(displayMonth);
                newDate.setFullYear(newYear);
                if (goToMonth) {
                    goToMonth(newDate);
                }
            };

            const handleMonthChange = (monthStr: string) => {
                const newDate = new Date(displayMonth);
                newDate.setMonth(months.indexOf(monthStr));
                if (goToMonth) {
                    goToMonth(newDate);
                }
            };

            return (
                <div className="flex items-center gap-1">
                    {/* Month Picker */}
                    <Select onValueChange={handleMonthChange} value={months[displayMonth.getMonth()]}>
                        <SelectTrigger className="border-none shadow-none h-7 w-auto gap-1 p-0 pr-1.5 focus:ring-0 font-medium hover:bg-transparent bg-transparent">
                            <span className="text-sm font-medium">{months[displayMonth.getMonth()]}</span>
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            {months.map((m) => (
                                <SelectItem key={m} value={m}>
                                    {m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Year Picker */}
                    <Select onValueChange={handleYearChange} value={displayMonth.getFullYear().toString()}>
                        <SelectTrigger className="border-none shadow-none h-7 w-auto gap-1 p-0 pr-1.5 focus:ring-0 font-medium hover:bg-transparent bg-transparent">
                            <span className="text-sm font-medium">{displayMonth.getFullYear()}</span>
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            {years.map((y) => (
                                <SelectItem key={y} value={y.toString()}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        }
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
