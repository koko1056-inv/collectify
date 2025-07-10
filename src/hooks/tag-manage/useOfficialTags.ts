import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTagsForItem } from "@/utils/tag/tag-queries";
import { SimpleItemTag } from "@/utils/tag/types";

export function useOfficialTags(isOpen: boolean, itemIds: string[], isUserItem: boolean) {
  // 公式アイテムのタグ情報を取得（ユーザーアイテムの場合）
  const { data: officialItemIds } = useQuery({
    queryKey: ["user-items-official-ids", itemIds],
    queryFn: async () => {
      if (!isUserItem || itemIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("user_items")
        .select("id, official_item_id")
        .in("id", itemIds)
        .not("official_item_id", "is", null);
      
      if (error || !data) return [];
      return data.map(item => item.official_item_id).filter(Boolean);
    },
    enabled: isOpen && itemIds.length > 0 && isUserItem,
  });

  const { data: officialTags = [] } = useQuery({
    queryKey: ["official-items-tags", officialItemIds],
    queryFn: async () => {
      if (!officialItemIds || officialItemIds.length === 0) return [];
      
      // 複数の公式アイテムのタグを取得
      const allTags = await Promise.all(
        officialItemIds.map(id => getTagsForItem(id, false))
      );
      
      // 重複を排除
      const uniqueTags = new Map<string, SimpleItemTag>();
      allTags.flat().forEach(tag => {
        if (tag.tags) {
          uniqueTags.set(tag.tags.id, tag);
        }
      });
      
      return Array.from(uniqueTags.values());
    },
    enabled: !!officialItemIds && officialItemIds.length > 0,
  });

  return { officialTags };
}