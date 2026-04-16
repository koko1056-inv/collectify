
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
    <div className="flex justify-between items-center px-4 py-3 border-t border-border">
      <div className="flex space-x-6">
        <div className="text-center">
          <div className="text-sm font-medium">{likesCount}</div>
          <div className="text-xs text-muted-foreground">いいね</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium">{ownersCount}</div>
          <div className="text-xs text-muted-foreground">オーナー</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium">{tradesCount}</div>
          <div className="text-xs text-muted-foreground">トレード</div>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="rounded-full p-2 h-8 w-8">
        <Heart className="h-4 w-4" />
      </Button>
    </div>
  );
}
