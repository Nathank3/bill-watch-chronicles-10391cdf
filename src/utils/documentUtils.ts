
import { addDays, getDay } from "date-fns";

// Adjust date for non-sitting days (move to next sitting day if it falls on Thursday, Friday, Saturday, Sunday)
// Sitting days are Monday (1), Tuesday (2), Wednesday (3)
export const adjustForSittingDay = (date: Date): Date => {
  const newDate = new Date(date);
  const dayOfWeek = getDay(newDate); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // If it falls on Thursday (4), Friday (5), Saturday (6), or Sunday (0)
  if (dayOfWeek === 4) { // Thursday
    return addDays(newDate, 4); // Move to Monday
  } else if (dayOfWeek === 5) { // Friday
    return addDays(newDate, 3); // Move to Monday
  } else if (dayOfWeek === 6) { // Saturday
    return addDays(newDate, 2); // Move to Monday
  } else if (dayOfWeek === 0) { // Sunday
    return addDays(newDate, 1); // Move to Monday
  }
  
  return newDate; // Monday, Tuesday, Wednesday are sitting days
};

// Keep the old function for backward compatibility but mark as deprecated
export const adjustForWeekend = adjustForSittingDay;

// Calculate presentation date based on date committed and pending days
// Calculate presentation date based on date committed and pending days
export const calculatePresentationDate = (dateCommitted: Date | null, pendingDays: number): Date | null => {
  if (!dateCommitted) return null;
  const calculatedDate = addDays(new Date(dateCommitted), pendingDays);
  return adjustForSittingDay(calculatedDate);
};
