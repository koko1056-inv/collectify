import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseItemDetailsFormProps {
  title: string;
  price?: string;
  releaseDate?: string;
  description?: string;
  quantity: number;
  itemId: string;
  isUserItem: boolean;
  content?: string | null;
  onEditComplete: () => void;
}

export function useItemDetailsForm({
  title,
  price,
  releaseDate = new Date().toISOString().split('T')[0],
  description,
  quantity,
  itemId,
  isUserItem,
  content,
  onEditComplete,
}: UseItemDetailsFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState({
    title,
    price: price || "0",
    releaseDate: releaseDate || new Date().toISOString().split('T')[0],
    description: description || "",
    quantity,
    content: content || "",
  });

  const handleSave = async () => {
    if (!editedData.title) {
      toast({
        title: "エラー",
        description: "タイトルは必須です",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const table = isUserItem ? "user_items" : "official_items";
      const updateData = isUserItem 
        ? {
            title: editedData.title,
            prize: editedData.price,
            quantity: editedData.quantity,
            release_date: editedData.releaseDate,
          }
        : {
            title: editedData.title,
            price: editedData.price,
            description: editedData.description,
            release_date: editedData.releaseDate,
            content: editedData.content,
          };

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["official-items"] });
      await queryClient.invalidateQueries({ queryKey: ["user-items"] });

      toast({
        title: "更新完了",
        description: "アイテム情報を更新しました",
      });
      onEditComplete();
    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: "エラー",
        description: "アイテム情報の更新に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedData({
      title,
      price: price || "0",
      releaseDate: releaseDate || new Date().toISOString().split('T')[0],
      description: description || "",
      quantity,
      content: content || "",
    });
    setIsEditing(false);
  };

  return {
    isEditing,
    isSaving,
    editedData,
    setIsEditing,
    setEditedData,
    handleSave,
    handleCancel,
  };
}