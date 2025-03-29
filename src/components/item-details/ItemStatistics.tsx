
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

interface ItemStatisticsProps {
  likesCount: number;
  ownersCount: number;
  tradesCount: number;
}

export function ItemStatistics({ 
  likesCount, 
  ownersCount, 
  tradesCount 
}: ItemStatisticsProps) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-gray-100">
      <div className="flex flex-col items-center">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Heart className="h-5 w-5" />
        </Button>
        <span className="text-xs mt-1">{likesCount}いいね</span>
      </div>
      
      <div className="flex flex-col items-center">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <span className="text-sm font-medium">{ownersCount}</span>
        </Button>
        <span className="text-xs mt-1">所有者</span>
      </div>
      
      <div className="flex flex-col items-center">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <span className="text-sm font-medium">{tradesCount}</span>
        </Button>
        <span className="text-xs mt-1">トレード</span>
      </div>
    </div>
  );
}
