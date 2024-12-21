import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Tv } from "lucide-react";

interface OfficialGoodsCardContentProps {
  title: string;
  artist: string | null;
  anime: string | null;
  item_tags?: Array<{
    tags: {
      id: string;
      name: string;
    } | null;
  }>;
}

export function OfficialGoodsCardContent({
  title,
  artist,
  anime,
  item_tags = [],
}: OfficialGoodsCardContentProps) {
  return (
    <CardContent className="p-4">
      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{title}</h3>
      <div className="space-y-2">
        {artist && (
          <div className="flex items-center gap-1">
            <Music className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{artist}</span>
          </div>
        )}
        {anime && (
          <div className="flex items-center gap-1">
            <Tv className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{anime}</span>
          </div>
        )}
        {item_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item_tags.map((tag, index) => (
              tag.tags && (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag.tags.name}
                </Badge>
              )
            ))}
          </div>
        )}
      </div>
    </CardContent>
  );
}