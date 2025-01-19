import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PostSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        </div>
        <div className="mt-4">
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-[300px]" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="mt-4 flex space-x-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </Card>
  );
}