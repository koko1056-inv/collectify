import { CardContent, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OfficialGoodsCardContentProps {
  title: string;
  artist?: string | null;
  anime?: string | null;
  itemId: string;
}

export function OfficialGoodsCardContent({ 
  title, 
  artist, 
  anime,
  itemId
}: OfficialGoodsCardContentProps) {
  return (
    <CardContent className="p-2 sm:p-3 overflow-hidden">
      <CardTitle className="text-sm sm:text-base mb-1 line-clamp-2 text-gray-900">{title}</CardTitle>
      {(artist || anime) && (
        <div className="space-y-0.5">
          {artist && (
            <p className="text-xs text-gray-600 line-clamp-1">
              アーティスト: {artist}
            </p>
          )}
          {anime && (
            <p className="text-xs text-gray-600 line-clamp-1">
              アニメ: {anime}
            </p>
          )}
        </div>
      )}
    </CardContent>
  );
}