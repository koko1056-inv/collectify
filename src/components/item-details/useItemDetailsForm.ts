
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export function useItemDetailsForm(itemId: string, isUserItem: boolean, initialData: any, onClose: () => void) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useLanguage();

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

      toast.success(t("itemDetails.save.success"), {
        description: t("itemDetails.save.successDescription"),
      });

      setIsEditing(false);
      onClose();
    } catch (error) {
      console.error("Error saving user item:", error);
      toast.error(t("itemDetails.common.error"), {
        description: t("itemDetails.save.failed"),
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
