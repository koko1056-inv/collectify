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
  const { data: itemTags = [] } = useQuery({
    queryKey: ["item-tags", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_tags")
        .select(`
          tags (
            id,
            name
          )
        `)
        .eq("official_item_id", itemId);
      if (error) throw error;
      return data;
    },
  });

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
      {itemTags && itemTags.length > 0 && (
        <div className="flex gap-1 mt-1 overflow-hidden whitespace-nowrap">
          {itemTags
            .filter((tag) => tag.tags !== null)
            .map((tag) => (
              <span
                key={tag.tags.id}
                className="inline-flex items-center shrink-0 px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 line-clamp-1"
              >
                {tag.tags.name}
              </span>
            ))}
        </div>
      )}
    </CardContent>
  );
}