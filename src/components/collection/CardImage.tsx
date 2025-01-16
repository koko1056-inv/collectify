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
      {memoriesCount >= 1 && (
        <Badge 
          className="absolute bottom-2 left-2 bg-bronze hover:bg-bronze"
          variant="secondary"
        >
          <Medal className="w-4 h-4 mr-1" />
          1日達成
        </Badge>
      )}
      {memoriesCount >= 10 && (
        <Badge 
          className="absolute bottom-2 left-24 bg-silver hover:bg-silver"
          variant="secondary"
        >
          <Star className="w-4 h-4 mr-1" />
          10日達成
        </Badge>
      )}
      {memoriesCount >= 100 && (
        <Badge 
          className="absolute bottom-2 right-2 bg-gold hover:bg-gold"
          variant="secondary"
        >
          <Trophy className="w-4 h-4 mr-1" />
          100日達成
        </Badge>
      )}
    </div>
  );
}