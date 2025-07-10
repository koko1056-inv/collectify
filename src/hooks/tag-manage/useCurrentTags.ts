import { useQuery } from "@tanstack/react-query";
import { getTagsForItem, getTagsForMultipleItems } from "@/utils/tag/tag-queries";
import { SimpleItemTag } from "@/utils/tag/types";

export function useCurrentTags(isOpen: boolean, itemIds: string[], isUserItem: boolean) {
  const { data: currentTags = [], isLoading } = useQuery({
    queryKey: ["current-tags", itemIds],
    queryFn: async () => {
      if (itemIds.length === 0) return [];
      
      if (itemIds.length === 1) {
        // 単一アイテムの場合は通常通りタグを取得
        return await getTagsForItem(itemIds[0], isUserItem);
      } else {
        // 複数アイテムの場合は共通タグのみを表示
        const allTags = await getTagsForMultipleItems(itemIds, isUserItem);
        
        // カテゴリー別に最も頻出するタグを抽出
        const categoryMap = new Map<string, Map<string, number>>();
        
        for (const tag of allTags) {
          if (!tag.tags || !tag.tags.category) continue;
          
          const category = tag.tags.category;
          const tagName = tag.tags.name;
          
          if (!categoryMap.has(category)) {
            categoryMap.set(category, new Map<string, number>());
          }
          
          const tagCount = categoryMap.get(category)!;
          tagCount.set(tagName, (tagCount.get(tagName) || 0) + 1);
        }
        
        // 最も頻出するタグを選択
        const commonTags: SimpleItemTag[] = [];
        
        categoryMap.forEach((tagCounts, category) => {
          let maxCount = 0;
          let maxTagName = '';
          let maxTagId = '';
          
          tagCounts.forEach((count, tagName) => {
            if (count > maxCount) {
              maxCount = count;
              maxTagName = tagName;
              // タグIDを見つける
              const tagItem = allTags.find(t => t.tags?.name === tagName && t.tags?.category === category);
              maxTagId = tagItem?.tag_id || '';
            }
          });
          
          // すべてのアイテムが同じタグを持つ場合のみ共通タグとして扱う
          if (maxCount === itemIds.length && maxTagId) {
            const tagItem = allTags.find(t => t.tag_id === maxTagId);
            if (tagItem) {
              commonTags.push({
                id: tagItem.id,
                tag_id: maxTagId,
                tags: tagItem.tags
              });
            }
          }
        });
        
        return commonTags;
      }
    },
    enabled: isOpen && itemIds.length > 0,
  });

  return { currentTags, isLoading };
}