
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface UseItemDetailsFormProps {
  title: string;
  price?: string;
  releaseDate?: string;
  description?: string;
  quantity?: number;
  purchaseDate?: string;
  purchasePrice?: string;
  itemId: string;
  isUserItem?: boolean;
  onEditComplete: () => void;
}

export function useItemDetailsForm({
  title,
  price = "",
  releaseDate = "",
  description = "",
  quantity = 1,
  purchaseDate = "",
  purchasePrice = "",
  itemId,
  isUserItem = false,
  onEditComplete,
}: UseItemDetailsFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editedData, setEditedData] = useState({
    title,
    price,
    purchase_date: purchaseDate,
    purchase_price: purchasePrice,
    release_date: releaseDate,
    description,
    quantity,
    content_name: null,
    tags: [] as string[],
  });

  const handleCancel = () => {
    setEditedData({
      title,
      price,
      purchase_date: purchaseDate,
      purchase_price: purchasePrice,
      release_date: releaseDate,
      description,
      quantity,
      content_name: null,
      tags: [],
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const table = isUserItem ? "user_items" : "official_items";
      const updateData = {
        title: editedData.title,
        [isUserItem ? "prize" : "price"]: editedData.price,
        release_date: editedData.release_date,
        quantity: editedData.quantity,
      };

      if (isUserItem) {
        Object.assign(updateData, {
          purchase_date: editedData.purchase_date || null,
          purchase_price: editedData.purchase_price || null,
        });
      } else {
        Object.assign(updateData, { 
          description: editedData.description,
          content_name: editedData.content_name 
        });
      }

      const { error: updateError } = await supabase
        .from(table)
        .update(updateData)
        .eq("id", itemId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["official-items"] });
      queryClient.invalidateQueries({ queryKey: ["user-items"] });

      toast({
        title: "更新完了",
        description: "アイテム情報を更新しました。",
      });

      onEditComplete();
    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: "エラー",
        description: "アイテムの更新に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isEditing,
    setIsEditing,
    isSaving,
    editedData,
    setEditedData,
    handleSave,
    handleCancel,
  };
}
