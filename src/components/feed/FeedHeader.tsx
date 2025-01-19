import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FeedHeader() {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-900">コミュニティ</h1>
      <Button variant="outline" size="icon" className="h-9 w-9">
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}