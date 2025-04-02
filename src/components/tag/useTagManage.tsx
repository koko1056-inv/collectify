
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TagUpdate } from "@/types/tag";
import { SimpleItemTag } from "@/utils/tag/types";

export function useTagManage(
  isOpen: boolean,
  itemIds: string[],
  isUserItem: boolean = false,
  onClose: () => void,
  onSubmit?: (updates: TagUpdate[]) => Promise<void>
) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentTags, setCurrentTags] = useState<SimpleItemTag[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<TagUpdate[]>([]);
  const [contentName, setContentName] = useState<string | null>(null);
  const [officialTags, setOfficialTags] = useState<SimpleItemTag[]>([]);
  
  const { toast } = useToast();

  // アイテムのタグを取得
  useEffect(() => {
    if (!isOpen || !itemIds.length) return;

    const fetchItemTags = async () => {
      setIsLoading(true);
      try {
        // メインアイテムのタグを取得
        const itemId = itemIds[0];
        
        // アイテムの種類に応じてテーブルを選択
        const table = isUserItem ? "user_item_tags" : "item_tags";
        const idField = isUserItem ? "user_item_id" : "official_item_id";
        
        const { data, error } = await supabase
          .from(table)
          .select(`
            tag_id,
            tags:tag_id (
              id,
              name,
              category,
              created_at
            )
          `)
          .eq(idField, itemId);
        
        if (error) throw error;
        
        // 単純化したタグデータに変換
        const formattedTags = (data || []).map(tag => ({
          tag_id: tag.tag_id,
          tags: {
            id: tag.tags.id,
            name: tag.tags.name,
            category: tag.tags.category,
            created_at: tag.tags.created_at
          }
        }));

        setCurrentTags(formattedTags);
        
        // コンテンツ名を取得（オフィシャルアイテムの場合のみ）
        if (!isUserItem) {
          const { data: itemData } = await supabase
            .from("official_items")
            .select("content_name")
            .eq("id", itemId)
            .single();
          
          if (itemData) {
            setContentName(itemData.content_name);
          }
        }
        
        // ユーザーアイテムの場合、対応するオフィシャルアイテムのタグを取得
        if (isUserItem) {
          const { data: userItem } = await supabase
            .from("user_items")
            .select("official_item_id")
            .eq("id", itemId)
            .single();
          
          if (userItem?.official_item_id) {
            const { data: officialTagData } = await supabase
              .from("item_tags")
              .select(`
                tag_id,
                tags:tag_id (
                  id,
                  name,
                  category,
                  created_at
                )
              `)
              .eq("official_item_id", userItem.official_item_id);
            
            if (officialTagData) {
              // 単純化したタグデータに変換
              const formattedOfficialTags = officialTagData.map(tag => ({
                tag_id: tag.tag_id,
                tags: {
                  id: tag.tags.id,
                  name: tag.tags.name,
                  category: tag.tags.category,
                  created_at: tag.tags.created_at
                }
              }));
              
              setOfficialTags(formattedOfficialTags);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching tags:", error);
        toast({
          title: "エラー",
          description: "タグの読み込み中にエラーが発生しました。",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchItemTags();
  }, [isOpen, itemIds, isUserItem, toast]);

  // タグの変更を処理
  const handleTagChange = (category: string) => (value: string | null) => {
    // 既存の同じカテゴリの更新を削除
    const filteredUpdates = pendingUpdates.filter(update => update.category !== category);
    
    // 新しい更新を追加
    setPendingUpdates([...filteredUpdates, { category, value }]);
  };

  // コンテンツ名の変更を処理
  const handleContentChange = (newContentName: string | null) => {
    setContentName(newContentName);
  };

  // フォームの送信を処理
  const handleSubmit = async () => {
    try {
      if (onSubmit) {
        await onSubmit(pendingUpdates);
      }
      
      setPendingUpdates([]);
      onClose();
      
      toast({
        title: "更新完了",
        description: "タグが正常に更新されました。",
      });
    } catch (error) {
      console.error("Error submitting tag updates:", error);
      toast({
        title: "エラー",
        description: "タグの更新中にエラーが発生しました。",
        variant: "destructive"
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
