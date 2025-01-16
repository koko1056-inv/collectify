import { Medal, Star, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CardImageProps {
  image: string;
  title: string;
  memoriesCount?: number;
}

export function CardImage({ image, title, memoriesCount = 0 }: CardImageProps) {
  return (
    <div className="aspect-square relative overflow-hidden rounded-t-lg">
      <img
        src={image}
        alt={title}
        className="w-full h-full transition-all duration-300 hover:scale-105 object-cover"
      />
      {memoriesCount > 0 && (
        <div className="absolute bottom-2 left-2 flex gap-1">
          {memoriesCount >= 1 && (
            <Badge className="bg-amber-600 hover:bg-amber-600">
              <Medal className="h-3 w-3 mr-1" />
              1日
            </Badge>
          )}
          {memoriesCount >= 10 && (
            <Badge className="bg-gray-400 hover:bg-gray-400">
              <Star className="h-3 w-3 mr-1" />
              10日
            </Badge>
          )}
          {memoriesCount >= 100 && (
            <Badge className="bg-yellow-500 hover:bg-yellow-500">
              <Trophy className="h-3 w-3 mr-1" />
              100日
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}