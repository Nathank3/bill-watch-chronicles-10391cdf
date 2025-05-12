
import { addDays, isSaturday, isSunday } from "date-fns";

// Adjust date for weekends (move to next Monday if it falls on weekend)
export const adjustForWeekend = (date: Date): Date => {
  const newDate = new Date(date);
  
  if (isSaturday(newDate)) {
    return addDays(newDate, 2); // Move to Monday
  } else if (isSunday(newDate)) {
    return addDays(newDate, 1); // Move to Monday
  }
  
  return newDate;
};

// Calculate presentation date based on date committed and pending days
export const calculatePresentationDate = (dateCommitted: Date, pendingDays: number): Date => {
  const calculatedDate = addDays(new Date(dateCommitted), pendingDays);
  return adjustForWeekend(calculatedDate);
};
