
import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TagUpdate } from "@/types/tag";
import { getTagsForItem, getTagsForMultipleItems } from "@/utils/tag/tag-queries";
import { setItemContent } from "@/utils/tag/content-operations";
import { SimpleItemTag } from "@/utils/tag/types";

export function useTagManage(
  isOpen: boolean,
  itemIds: string[],
  isUserItem: boolean,
  onClose: () => void,
  onSubmit?: (updates: TagUpdate[]) => Promise<void>
) {
  const [pendingUpdates, setPendingUpdates] = useState<TagUpdate[]>([]);
  const [contentName, setContentName] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // 複数アイテムの場合は共通タグのみを取得・表示
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

  // コンテンツ名を取得
  const { data: itemsData } = useQuery({
    queryKey: ["items-content", itemIds, isUserItem],
    queryFn: async () => {
      if (itemIds.length === 0) return [];
      
      const table = isUserItem ? "user_items" : "official_items";
      const { data, error } = await supabase
        .from(table)
        .select("id, content_name")
        .in("id", itemIds);
      
      if (error) {
        console.error("Error fetching items content:", error);
        return [];
      }
      
      return data || [];
    },
    enabled: isOpen && itemIds.length > 0,
  });

  // 複数アイテムの場合は共通のコンテンツ名を取得
  useEffect(() => {
    if (itemsData && itemsData.length > 0) {
      if (itemsData.length === 1) {
        // 単一アイテムの場合はそのままコンテンツ名を設定
        setContentName(itemsData[0].content_name);
      } else {
        // 複数アイテムの場合は、すべて同じコンテンツ名を持つ場合のみそれを表示
        const firstContentName = itemsData[0].content_name;
        const allSameContent = itemsData.every(item => item.content_name === firstContentName);
        
        if (allSameContent) {
          setContentName(firstContentName);
        } else {
          // 異なるコンテンツ名が混在する場合は空にする
          setContentName(null);
        }
      }
    }
  }, [itemsData]);

  // モーダルが閉じられたときにリセット
  useEffect(() => {
    if (!isOpen) {
      setPendingUpdates([]);
      setContentName(null);
    }
  }, [isOpen]);

  // タグ変更ハンドラ
  const handleTagChange = useCallback((category: string) => (value: string | null) => {
    console.log(`Updating tag for category: ${category} with value: ${value}`);
    setPendingUpdates((prev) => {
      const existing = prev.findIndex((u) => u.category === category);
      if (existing !== -1) {
        const updated = [...prev];
        updated[existing] = { category, value };
        return updated;
      }
      return [...prev, { category, value }];
    });
  }, []);

  // コンテンツ名変更ハンドラ
  const handleContentChange = useCallback((newContentName: string | null) => {
    console.log(`Setting content name to: ${newContentName}`);
    setContentName(newContentName);
  }, []);

  // 保存ハンドラ
  const handleSubmit = async () => {
    try {
      console.log(`Saving content name: ${contentName}`);
      console.log(`Pending updates: ${JSON.stringify(pendingUpdates)}`);
      
      // コンテンツ名を更新
      for (const itemId of itemIds) {
        await setItemContent(itemId, contentName, isUserItem);
      }
      
      await queryClient.invalidateQueries({ queryKey: ["item-content"] });
      await queryClient.invalidateQueries({ queryKey: ["user-items"] });
      await queryClient.invalidateQueries({ queryKey: ["items-content"] });
      
      // タグ更新を実行
      if (onSubmit && pendingUpdates.length > 0) {
        await onSubmit(pendingUpdates.filter((u) => u.value !== null));
      }
      
      onClose();
    } catch (error) {
      console.error("Error updating items:", error);
    }
  };

  return {
    currentTags,
    pendingUpdates,
    contentName,
    officialTags,
    isLoading,
    handleTagChange,
    handleContentChange,
    handleSubmit
  };
}
