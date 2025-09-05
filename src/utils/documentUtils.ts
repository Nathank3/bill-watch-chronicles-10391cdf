
import { addDays, isSaturday, isSunday, isThursday, isFriday, format } from "date-fns";

// Adjust date for non-sitting days (move to next Monday if it falls on Thu/Fri/Sat/Sun)
export const adjustForWeekend = (date: Date): Date => {
  const newDate = new Date(date);
  
  if (isThursday(newDate)) {
    return addDays(newDate, 4); // Move to Monday
  } else if (isFriday(newDate)) {
    return addDays(newDate, 3); // Move to Monday
  } else if (isSaturday(newDate)) {
    return addDays(newDate, 2); // Move to Monday
  } else if (isSunday(newDate)) {
    return addDays(newDate, 1); // Move to Monday
  }
  
  return newDate;
};

// Format date as "Day, DD/MM/YYYY"
export const formatDateWithDay = (date: Date): string => {
  return format(date, "EEEE, dd/MM/yyyy");
};

// Calculate pending days from current date to presentation date
export const calculatePendingDays = (presentationDate: Date): number => {
  const now = new Date();
  const diffTime = presentationDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Calculate presentation date based on date committed and pending days
export const calculatePresentationDate = (dateCommitted: Date, pendingDays: number): Date => {
  const calculatedDate = addDays(new Date(dateCommitted), pendingDays);
  return adjustForWeekend(calculatedDate);
};
