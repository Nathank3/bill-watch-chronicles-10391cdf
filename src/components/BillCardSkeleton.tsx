import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

export function BillCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Title */}
        <Skeleton className="h-6 w-3/4" />
        
        {/* Committee */}
        <Skeleton className="h-4 w-1/2" />
        
        {/* Details section */}
        <div className="space-y-2 mt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        
        {/* Badge and countdown */}
        <div className="flex items-center gap-2 mt-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </Card>
  );
}

export function BillListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <BillCardSkeleton key={i} />
      ))}
    </div>
  );
}
