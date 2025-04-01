
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TagUpdate } from "@/types/tag";
import { SimpleItemTag } from "@/utils/tag/types";
import { updateGroupColor } from "@/utils/tag/group-updates";

export function useTagManage(
  isOpen: boolean,
  itemIds: string[],
  isUserItem: boolean = false,
  onClose: () => void,
  onSubmit?: (updates: TagUpdate[]) => Promise<void>
) {
  const [currentTags, setCurrentTags] = useState<SimpleItemTag[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<TagUpdate[]>([]);
  const [contentName, setContentName] = useState<string | null>(null);
  const [officialTags, setOfficialTags] = useState<SimpleItemTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // タグを読み込む
  useEffect(() => {
    if (isOpen && itemIds.length > 0) {
      loadTags();
    }
    return () => {
      setCurrentTags([]);
      setPendingUpdates([]);
      setContentName(null);
    };
  }, [isOpen, itemIds]);

  // タグを読み込む関数
  const loadTags = async () => {
    setIsLoading(true);
    
    try {
      // 現在のタグを取得
      const { data, error } = await supabase
        .from(isUserItem ? "user_item_tags" : "item_tags")
        .select(`
          tag_id,
          tags (
            id,
            name,
            category,
            created_at
          )
        `)
        .eq(isUserItem ? "user_item_id" : "official_item_id", itemIds[0]);
      
      if (error) throw error;
      
      // タグデータを変換して設定
      const formattedTags: SimpleItemTag[] = (data || []).map((tag: any) => ({
        tag_id: tag.tag_id,
        tags: tag.tags || { id: "", name: "", category: "" }
      }));
      
      setCurrentTags(formattedTags);
      
      // ユーザーアイテムの場合、コンテンツ名を取得
      if (isUserItem) {
        const { data: itemData, error: itemError } = await supabase
          .from("user_items")
          .select("*")
          .eq("id", itemIds[0])
          .single();
        
        if (!itemError && itemData) {
          // content_nameプロパティが存在する場合のみ設定
          if ('content_name' in itemData) {
            setContentName(itemData.content_name || null);
          }
        }
        
        // 公式アイテムのタグを取得（関連がある場合）
        const { data: relatedItemData, error: relatedError } = await supabase
          .from("user_items")
          .select("official_item_id")
          .eq("id", itemIds[0])
          .single();
        
        if (!relatedError && relatedItemData && relatedItemData.official_item_id) {
          const { data: officialTagsData, error: officialTagsError } = await supabase
            .from("item_tags")
            .select(`
              tag_id,
              tags (
                id,
                name,
                category,
                created_at
              )
            `)
            .eq("official_item_id", relatedItemData.official_item_id);
          
          if (!officialTagsError) {
            // 同様に変換して設定
            const formattedOfficialTags: SimpleItemTag[] = (officialTagsData || []).map((tag: any) => ({
              tag_id: tag.tag_id,
              tags: tag.tags || { id: "", name: "", category: "" }
            }));
            
            setOfficialTags(formattedOfficialTags);
          }
        }
      }
    } catch (error) {
      console.error("Error loading tags:", error);
      toast({
        title: "エラー",
        description: "タグの読み込みに失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // タグ変更ハンドラ
  const handleTagChange = (category: string) => (value: string | null) => {
    setPendingUpdates(prev => {
      // 既存の更新がある場合は上書き
      const filtered = prev.filter(update => update.category !== category);
      
      if (value === null) {
        // 値がnullの場合、既存のものを削除
        return filtered;
      }
      
      // 現在選択されているタグと同じ場合は更新しない
      const currentTagInCategory = currentTags.find(tag => 
        tag.tags?.category === category
      );
      
      if (currentTagInCategory?.tags?.name === value) {
        return filtered;
      }
      
      // 更新を追加
      return [...filtered, { category, value }];
    });
  };
  
  // コンテンツ名変更ハンドラ
  const handleContentChange = (newContentName: string | null) => {
    setContentName(newContentName);
  };
  
  // 送信ハンドラ
  const handleSubmit = async () => {
    try {
      // 親コンポーネントが送信処理を提供している場合はそれを使用
      if (onSubmit) {
        await onSubmit(pendingUpdates);
      } else {
        // デフォルトの送信処理（例としてグループ色の更新）
        for (const update of pendingUpdates) {
          if (update.category === 'color' && update.value && itemIds[0]) {
            await updateGroupColor(itemIds[0], update.value);
          }
        }
      }
      
      toast({
        title: "保存しました",
        description: "変更が正常に保存されました。",
      });
      
      onClose();
    } catch (error) {
      console.error("Error submitting updates:", error);
      toast({
        title: "エラー",
        description: "変更の保存中にエラーが発生しました。",
        variant: "destructive",
      });
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
