
import { Heart, Users, Repeat2 } from "lucide-react";
import React from "react";

export interface ItemStatisticsProps {
  likesCount: number;
  ownersCount: number;
  tradesCount: number;
}

export const ItemStatistics: React.FC<ItemStatisticsProps> = ({ 
  likesCount, 
  ownersCount, 
  tradesCount 
}) => {
  return (
    <div className="flex justify-between items-center bg-gray-100 rounded-lg p-4 space-x-2">
      <div className="flex items-center space-x-2">
        <Heart className="w-4 h-4 text-red-500" />
        <span className="text-sm">{likesCount}</span>
      </div>
      <div className="flex items-center space-x-2">
        <Users className="w-4 h-4 text-blue-500" />
        <span className="text-sm">{ownersCount}</span>
      </div>
      <div className="flex items-center space-x-2">
        <Repeat2 className="w-4 h-4 text-green-500" />
        <span className="text-sm">{tradesCount}</span>
      </div>
    </div>
  );
};
