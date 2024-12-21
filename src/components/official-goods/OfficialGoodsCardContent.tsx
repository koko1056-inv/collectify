import { CardContent, CardTitle } from "@/components/ui/card";

interface OfficialGoodsCardContentProps {
  title: string;
  description?: string | null;
  price: string;
  releaseDate: string;
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
  description,
  price,
  releaseDate,
  artist, 
  anime, 
  item_tags = [] 
}: OfficialGoodsCardContentProps) {
  return (
    <CardContent className="p-4">
      <CardTitle className="text-lg mb-2 line-clamp-2 text-gray-900">{title}</CardTitle>
      <div className="space-y-1 mb-2">
        <p className="text-sm text-gray-600">
          価格: {price}円
        </p>
        <p className="text-sm text-gray-600">
          発売日: {releaseDate}
        </p>
        {description && (
          <p className="text-sm text-gray-600">
            {description}
          </p>
        )}
        {artist && (
          <p className="text-sm text-gray-600">
            アーティスト: {artist}
          </p>
        )}
        {anime && (
          <p className="text-sm text-gray-600">
            アニメ: {anime}
          </p>
        )}
      </div>
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