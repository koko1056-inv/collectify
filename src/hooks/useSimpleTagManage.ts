import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTagsForItem } from "@/utils/tag/tag-queries";
import { updateTagsForMultipleItems } from "@/utils/tag/tag-mutations";
import { setItemContent } from "@/utils/tag/content-operations";
import { SimpleItemTag } from "@/utils/tag/types";
import { useToast } from "@/hooks/use-toast";

interface TagSelection {
  character: string | null;
  type: string | null;
  series: string | null;
}

export function useSimpleTagManage(
  isOpen: boolean,
  itemIds: string[],
  isUserItem: boolean,
  onClose: () => void
) {
  const [tagSelections, setTagSelections] = useState<TagSelection>({
    character: null,
    type: null,
    series: null
  });
  const [contentName, setContentName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 現在のタグを取得
  const { data: currentTags = [], isLoading } = useQuery({
    queryKey: ["current-tags", itemIds],
    queryFn: async () => {
      if (itemIds.length === 0) return [];
      return await getTagsForItem(itemIds[0], isUserItem);
    },
    enabled: isOpen && itemIds.length > 0,
  });

  // コンテンツ名を取得
  const { data: currentContentName } = useQuery({
    queryKey: ["item-content", itemIds],
    queryFn: async () => {
      if (itemIds.length === 0) return null;
      
      // Supabaseクライアントを直接使用
      const { supabase } = await import('@/integrations/supabase/client');
      const table = isUserItem ? 'user_items' : 'official_items';
      const { data } = await supabase
        .from(table)
        .select('content_name')
        .eq('id', itemIds[0])
        .single();
      
      return data?.content_name || null;
    },
    enabled: isOpen && itemIds.length > 0,
  });

  // 初期状態を設定
  useEffect(() => {
    if (!isOpen) {
      setTagSelections({ character: null, type: null, series: null });
      setContentName(null);
      return;
    }

    // 初回のみ実行するフラグ
    if (currentTags.length === 0 && !currentContentName) return;

    // 現在のタグから初期値を設定
    const character = currentTags.find(tag => tag.tags?.category === 'character')?.tags?.name || null;
    const type = currentTags.find(tag => tag.tags?.category === 'type')?.tags?.name || null;
    const series = currentTags.find(tag => tag.tags?.category === 'series')?.tags?.name || null;
    
    // 状態更新を1回だけ実行
    setTagSelections(prev => {
      const hasChanged = prev.character !== character || prev.type !== type || prev.series !== series;
      if (!hasChanged) return prev;
      return { character, type, series };
    });
    
    setContentName(prev => {
      const newContent = currentContentName || null;
      if (prev === newContent) return prev;
      return newContent;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, itemIds.join(',')]); // currentTagsとcurrentContentNameを依存配列から除外して無限ループを防ぐ

  // タグ変更ハンドラ
  const handleTagChange = useCallback((category: keyof TagSelection, value: string | null) => {
    console.log(`[SimpleTagManage] Tag changed - Category: ${category}, Value: ${value}`);
    
    setTagSelections(prev => {
      const newSelections = { ...prev, [category]: value };
      console.log('[SimpleTagManage] New selections:', newSelections);
      return newSelections;
    });
  }, []);

  // コンテンツ名変更ハンドラ
  const handleContentChange = useCallback((newContentName: string | null) => {
    console.log(`[SimpleTagManage] Content name changed: ${newContentName}`);
    setContentName(newContentName);
  }, []);

  // 保存ハンドラ
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      console.log('[SimpleTagManage] Starting save process');
      console.log('[SimpleTagManage] Tag selections:', tagSelections);
      console.log('[SimpleTagManage] Content name:', contentName);
      console.log('[SimpleTagManage] Item IDs:', itemIds);

      // 現在のタグ値を取得
      const currentCharacter = currentTags.find(tag => tag.tags?.category === 'character')?.tags?.name || null;
      const currentType = currentTags.find(tag => tag.tags?.category === 'type')?.tags?.name || null;
      const currentSeries = currentTags.find(tag => tag.tags?.category === 'series')?.tags?.name || null;

      // タグ更新を作成（変更があった場合のみ）
      const updates = [];
      if (tagSelections.character !== currentCharacter) {
        updates.push({ category: 'character', value: tagSelections.character });
      }
      if (tagSelections.type !== currentType) {
        updates.push({ category: 'type', value: tagSelections.type });
      }
      if (tagSelections.series !== currentSeries) {
        updates.push({ category: 'series', value: tagSelections.series });
      }

      console.log('[SimpleTagManage] Updates to apply:', updates);

      // コンテンツ名を更新
      for (const itemId of itemIds) {
        const success = await setItemContent(itemId, contentName, isUserItem);
        if (!success) {
          throw new Error(`Failed to update content for item: ${itemId}`);
        }
      }

      // タグを更新
      if (updates.length > 0) {
        const success = await updateTagsForMultipleItems(itemIds, updates, isUserItem, currentTags);
        if (!success) {
          throw new Error("Failed to update tags");
        }
      }

      // クエリを無効化（強化版）
      const invalidationPromises = [
        queryClient.invalidateQueries({ queryKey: ["current-tags"] }),
        queryClient.invalidateQueries({ queryKey: ["item-content"] }),
        queryClient.invalidateQueries({ queryKey: ["tags"] }),
        queryClient.invalidateQueries({ queryKey: ["item-tags-count"] }),
        // 関連するすべてのアイテムのタグクエリを無効化
        ...itemIds.flatMap(itemId => [
          queryClient.invalidateQueries({ queryKey: ["item-category-tags-count", itemId, isUserItem] }),
          queryClient.invalidateQueries({ queryKey: ["item-category-tags-count", itemId, !isUserItem] }),
          queryClient.invalidateQueries({ queryKey: ["user-item-tags", itemId] }),
          queryClient.invalidateQueries({ queryKey: ["current-tags", [itemId]] }),
          queryClient.invalidateQueries({ queryKey: ["item-content", [itemId]] }),
        ]),
        // アイテム一覧のクエリも無効化
        isUserItem 
          ? queryClient.invalidateQueries({ queryKey: ["user-items"] })
          : queryClient.invalidateQueries({ queryKey: ["official-items"] }),
        // 全体のタグ関連クエリも無効化
        queryClient.invalidateQueries({ queryKey: ["item-tags"] }),
        queryClient.invalidateQueries({ queryKey: ["tag-counts"] }),
      ];

      await Promise.all(invalidationPromises);
      
      // 追加で強制リフェッチも実行
      setTimeout(() => {
        itemIds.forEach(itemId => {
          queryClient.refetchQueries({ 
            queryKey: ["item-category-tags-count", itemId, isUserItem],
            exact: true 
          });
        });
      }, 200);

      console.log('[SimpleTagManage] Save completed successfully');
      
      toast({
        title: "保存しました",
        description: "タグとコンテンツ名が保存されました。",
      });
      
      onClose();
    } catch (error) {
      console.error("[SimpleTagManage] Save failed:", error);
      toast({
        title: "エラー",
        description: "保存中にエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, tagSelections, contentName, itemIds, isUserItem, currentTags, queryClient, toast, onClose]);

  return {
    tagSelections,
    contentName,
    isLoading,
    isSubmitting,
    handleTagChange,
    handleContentChange,
    handleSubmit
  };
}