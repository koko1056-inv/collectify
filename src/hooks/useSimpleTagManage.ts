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
  const [contentId, setContentId] = useState<string | null>(null);
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
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // コンテンツ名とIDを取得
  const { data: currentContentData } = useQuery({
    queryKey: ["item-content", itemIds],
    queryFn: async () => {
      if (itemIds.length === 0) return null;
      
      // Supabaseクライアントを直接使用
      const { supabase } = await import('@/integrations/supabase/client');
      const table = isUserItem ? 'user_items' : 'official_items';
      const { data: itemData } = await supabase
        .from(table)
        .select('content_name')
        .eq('id', itemIds[0])
        .single();
      
      if (!itemData?.content_name) return null;

      // コンテンツ名からコンテンツIDを取得
      const { data: contentData } = await supabase
        .from('content_names')
        .select('id, name')
        .eq('name', itemData.content_name)
        .single();
      
      return contentData ? { name: contentData.name, id: contentData.id } : null;
    },
    enabled: isOpen && itemIds.length > 0,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // 初期状態を設定（モーダルが開いた時とデータロード完了時に1回だけ）
  useEffect(() => {
    if (!isOpen) {
      // モーダルが閉じた時はリセット
      setTagSelections({ character: null, type: null, series: null });
      setContentName(null);
      setContentId(null);
      return;
    }

    // ローディング中は何もしない
    if (isLoading) return;

    // 現在のタグから初期値を設定（タグが0件でも実行する）
    const character = currentTags.find(tag => tag.tags?.category === 'character')?.tags?.name || null;
    const type = currentTags.find(tag => tag.tags?.category === 'type')?.tags?.name || null;
    const series = currentTags.find(tag => tag.tags?.category === 'series')?.tags?.name || null;
    
    console.log('[useSimpleTagManage] Setting initial values:', { character, type, series, contentName: currentContentData?.name });
    
    // 値が変わった場合のみ更新（無限ループ防止）
    setTagSelections(prev => {
      if (prev.character === character && prev.type === type && prev.series === series) {
        return prev;
      }
      return { character, type, series };
    });
    
    setContentName(prev => {
      const newName = currentContentData?.name || null;
      if (prev === newName) return prev;
      return newName;
    });
    
    setContentId(prev => {
      const newId = currentContentData?.id || null;
      if (prev === newId) return prev;
      return newId;
    });
    // itemIds.join(',')を使うことで配列の変更を文字列で検知
  }, [isOpen, isLoading, itemIds.join(','), currentTags.length, currentContentData?.name, currentContentData?.id]);

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
  const handleContentChange = useCallback(async (newContentName: string | null) => {
    console.log(`[SimpleTagManage] Content name changed: ${newContentName}`);
    setContentName(newContentName);

    try {
      // 新しいコンテンツ名から即時にcontentIdを解決して反映
      if (newContentName) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: content } = await supabase
          .from('content_names')
          .select('id')
          .eq('name', newContentName)
          .maybeSingle();
        setContentId(content?.id || null);
      } else {
        setContentId(null);
      }
    } catch (e) {
      console.error('[SimpleTagManage] Failed to resolve contentId from name:', e);
      setContentId(null);
    }
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

      // すべての関連クエリを無効化
      await queryClient.invalidateQueries({ queryKey: ["current-tags"] });
      await queryClient.invalidateQueries({ queryKey: ["item-content"] });
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      await queryClient.invalidateQueries({ queryKey: ["tags-by-category"] });
      await queryClient.invalidateQueries({ queryKey: ["item-tags"] });
      await queryClient.invalidateQueries({ queryKey: ["user-item-tags"] });
      await queryClient.invalidateQueries({ queryKey: ["item-category-tags-count"] });
      
      if (isUserItem) {
        await queryClient.invalidateQueries({ queryKey: ["user-items"] });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["official-items"] });
      }

      // 明示的にデータを再フェッチして、最新の状態を取得
      await Promise.all([
        queryClient.refetchQueries({ 
          queryKey: ["current-tags", itemIds],
          exact: true 
        }),
        queryClient.refetchQueries({ 
          queryKey: ["item-content", itemIds],
          exact: true 
        })
      ]);

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
    contentId,
    isLoading,
    isSubmitting,
    handleTagChange,
    handleContentChange,
    handleSubmit
  };
}