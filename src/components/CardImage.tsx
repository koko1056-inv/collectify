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
        <div className="absolute bottom-1 left-1 flex gap-0.5">
          {memoriesCount >= 1 && (
            <Badge className="bg-amber-600 hover:bg-amber-600 text-[10px] py-0 px-1.5">
              <Medal className="h-2.5 w-2.5 mr-0.5" />
              1日
            </Badge>
          )}
          {memoriesCount >= 10 && (
            <Badge className="bg-gray-400 hover:bg-gray-400 text-[10px] py-0 px-1.5">
              <Star className="h-2.5 w-2.5 mr-0.5" />
              10日
            </Badge>
          )}
          {memoriesCount >= 100 && (
            <Badge className="bg-yellow-500 hover:bg-yellow-500 text-[10px] py-0 px-1.5">
              <Trophy className="h-2.5 w-2.5 mr-0.5" />
              100日
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}