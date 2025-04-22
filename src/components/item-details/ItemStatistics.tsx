
import { Users, Heart, RefreshCw } from "lucide-react";

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
    <div className="flex justify-around mb-4 text-sm text-gray-600">
      <div className="flex flex-col items-center">
        <Heart className="h-5 w-5 mb-1 text-red-500" />
        <div className="flex flex-col items-center">
          <span className="font-medium text-gray-900">{likesCount}</span>
          <span>いいね</span>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <Users className="h-5 w-5 mb-1 text-blue-500" />
        <div className="flex flex-col items-center">
          <span className="font-medium text-gray-900">{ownersCount}</span>
          <span>所有者</span>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <RefreshCw className="h-5 w-5 mb-1 text-green-500" />
        <div className="flex flex-col items-center">
          <span className="font-medium text-gray-900">{tradesCount}</span>
          <span>トレード</span>
        </div>
      </div>
    </div>
  );
}
