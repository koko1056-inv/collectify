import { CardContent, CardTitle } from "@/components/ui/card";
import { Music, Tv } from "lucide-react";

interface OfficialGoodsCardContentProps {
  title: string;
  artist?: string | null;
  anime?: string | null;
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
  item_tags = [] 
}: OfficialGoodsCardContentProps) {
  return (
    <CardContent className="p-4">
      <CardTitle className="text-lg mb-2 line-clamp-2 text-gray-900">{title}</CardTitle>
      {(artist || anime) && (
        <div className="space-y-1 mb-2">
          {artist && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Music className="h-4 w-4" />
              <span>{artist}</span>
            </div>
          )}
          {anime && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Tv className="h-4 w-4" />
              <span>{anime}</span>
            </div>
          )}
        </div>
      )}
      {item_tags && item_tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item_tags
            .filter((tag) => tag.tags !== null)
            .map((tag) => (
              <span
                key={tag.tags!.id}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
              >
                {tag.tags!.name}
              </span>
            ))}
        </div>
      )}
    </CardContent>
  );
}