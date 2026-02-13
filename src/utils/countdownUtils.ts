import { differenceInDays } from "date-fns";

/**
 * Calculate current countdown days for an item based on its presentation date
 * Returns negative number if overdue
 */
/**
 * Calculate current countdown days for an item based on its presentation date
 * Returns negative number if overdue
 * Returns 0 if presentationDate is null (Safe Guard)
 */
export const calculateCurrentCountdown = (presentationDate: Date | null): number => {
  if (!presentationDate) return 0;
  const now = new Date();
  const days = differenceInDays(presentationDate, now);
  return days;
};

/**
 * Determine if an item is overdue based on presentation date or extension count
 */
export const isItemOverdue = (presentationDate: Date | null, extensionsCount: number): boolean => {
  if (!presentationDate) return false;
  const countdown = calculateCurrentCountdown(presentationDate);
  return countdown < 0 || extensionsCount > 0;
};

/**
 * Get display countdown (absolute value for showing to users)
 * Returns positive number even if overdue
 */
export const getDisplayCountdown = (presentationDate: Date | null): number => {
  if (!presentationDate) return 0;
  const countdown = calculateCurrentCountdown(presentationDate);
  return Math.abs(countdown);
};

/**
 * Get appropriate status based on current state
 */
export const determineItemStatus = (
  currentStatus: string,
  presentationDate: Date | null,
  extensionsCount: number
): "pending" | "concluded" | "overdue" | "frozen" | "limbo" => {
  if (currentStatus === "concluded") {
    return "concluded";
  }

  if (currentStatus === "limbo" || !presentationDate) {
    return "limbo";
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
