import { differenceInDays } from "date-fns";

/**
 * Calculate current countdown days for an item based on its presentation date
 * Returns negative number if overdue
 */
export const calculateCurrentCountdown = (presentationDate: Date): number => {
  const now = new Date();
  const days = differenceInDays(presentationDate, now);
  return days;
};

/**
 * Determine if an item is overdue based on presentation date or extension count
 */
export const isItemOverdue = (presentationDate: Date, extensionsCount: number): boolean => {
  const countdown = calculateCurrentCountdown(presentationDate);
  return countdown < 0 || extensionsCount > 0;
};

/**
 * Get display countdown (absolute value for showing to users)
 * Returns positive number even if overdue
 */
export const getDisplayCountdown = (presentationDate: Date): number => {
  const countdown = calculateCurrentCountdown(presentationDate);
  return Math.abs(countdown);
};

/**
 * Get appropriate status based on current state
 */
export const determineItemStatus = (
  currentStatus: string,
  presentationDate: Date,
  extensionsCount: number
): "pending" | "concluded" | "overdue" | "frozen" => {
  if (currentStatus === "concluded") {
    return "concluded";
  }
  
  const countdown = calculateCurrentCountdown(presentationDate);
  if (countdown <= 0) {
    return "frozen";
  }
  
  if (isItemOverdue(presentationDate, extensionsCount)) {
    return "overdue";
  }
  
  return "pending";
};
