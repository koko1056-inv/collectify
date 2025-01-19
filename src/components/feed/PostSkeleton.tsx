import { Card } from "@/components/ui/card";

export function PostSkeleton() {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-16 bg-gray-200 rounded mt-1 animate-pulse" />
        </div>
      </div>
      <div className="h-64 bg-gray-200 rounded animate-pulse" />
      <div className="flex items-center justify-between">
        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
      </div>
    </Card>
  );
}