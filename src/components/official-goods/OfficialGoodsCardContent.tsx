import { CardContent, CardTitle } from "@/components/ui/card";

interface OfficialGoodsCardContentProps {
  title: string;
  artist?: string | null;
  anime?: string | null;
  itemId: string;
}

export function OfficialGoodsCardContent({ 
  title, 
  artist, 
  itemId
}: OfficialGoodsCardContentProps) {
  return (
    <CardContent className="p-2 sm:p-3 overflow-hidden">
      <CardTitle className="text-sm sm:text-base mb-1 line-clamp-2 text-gray-900">{title}</CardTitle>
      {artist && (
        <div className="space-y-0.5">
          {artist && (
            <p className="text-xs text-gray-600 line-clamp-1">
              アーティスト: {artist}
            </p>
          )}
        </div>
      )}
    </CardContent>
  );
}