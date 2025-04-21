
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useItemDetailsForm(itemId: string, isUserItem: boolean, initialData: any, onClose: () => void) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 編集データの初期化
  useEffect(() => {
    setEditedData(initialData);
  }, [initialData, isUserItem, itemId]);

  // 編集モードのリセット
  useEffect(() => {
    return () => {
      setIsEditing(false);
    };
  }, []);

  // ユーザーアイテム保存ハンドラ
  const handleSaveUserItem = async () => {
    if (!isUserItem || !itemId) return;
    setIsSaving(true);
    
    try {
      console.log("Saving user item with data:", editedData);
      
      const updateData = {
        quantity: editedData.quantity,
        note: editedData.note,
        content_name: editedData.content_name,
        image: editedData.image
      };
      
      console.log("Update data:", updateData);
      
      const { error } = await supabase
        .from("user_items")
        .update(updateData)
        .eq("id", itemId);

      if (error) {
        console.error("Error updating user item:", error);
        throw error;
      }

      // キャッシュを更新
      await queryClient.invalidateQueries({ queryKey: ["user-items"] });
      await queryClient.invalidateQueries({ queryKey: ["item-memories", [itemId]] });

      toast({
        title: "保存完了",
        description: "アイテム情報を保存しました。",
      });
      
      setIsEditing(false);
      onClose();
    } catch (error) {
      console.error("Error saving user item:", error);
      toast({
        title: "エラー",
        description: "保存に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isEditing,
    setIsEditing,
    editedData,
    setEditedData,
    isSaving,
    handleSaveUserItem
  };
}
