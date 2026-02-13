import { cn } from "@/lib/utils.ts";

interface CountdownProgressProps {
  daysRemaining: number;
  totalDays: number;
  isOverdue?: boolean;
}

export function CountdownProgress({ 
  daysRemaining, 
  totalDays,
  isOverdue = false 
}: CountdownProgressProps) {
  // Calculate percentage (clamp between 0-100)
  const percentage = Math.max(0, Math.min(100, (daysRemaining / totalDays) * 100));
  
  // Determine color based on percentage and overdue status
  const getColor = () => {
    if (isOverdue) return "bg-red-600";
    if (percentage > 50) return "bg-green-500";
    if (percentage > 25) return "bg-amber-500";
    return "bg-red-500";
  };
  
  const getTextColor = () => {
    if (isOverdue) return "text-red-600";
    if (percentage > 50) return "text-green-600";
    if (percentage > 25) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className={cn("text-xs font-medium", getTextColor())}>
          {isOverdue ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
        </span>
        <span className="text-xs text-muted-foreground">
          {totalDays} days total
        </span>
      </div>
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-300 rounded-full",
            getColor()
          )} 
          style={{ width: `${isOverdue ? 100 : percentage}%` }}
        />
      </div>
    </div>
  );
}
