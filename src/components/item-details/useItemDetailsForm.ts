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
  itemId: string;
  isUserItem?: boolean;
  content_name?: string | null;
  onEditComplete: () => void;
}

export function useItemDetailsForm({
  title,
  price = "",
  releaseDate = "",
  description = "",
  quantity = 1,
  itemId,
  isUserItem = false,
  content_name = null,
  onEditComplete,
}: UseItemDetailsFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editedData, setEditedData] = useState({
    title,
    price,
    release_date: releaseDate,
    description,
    quantity,
    content_name,
    tags: [] as string[],
  });

  const handleCancel = () => {
    setEditedData({
      title,
      price,
      release_date: releaseDate,
      description,
      quantity,
      content_name,
      tags: [],
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const table = isUserItem ? "user_items" : "official_items";
      const { error: updateError } = await supabase
        .from(table)
        .update({
          title: editedData.title,
          price: editedData.price,
          release_date: editedData.release_date,
          description: editedData.description,
          quantity: editedData.quantity,
          content_name: editedData.content_name,
        })
        .eq("id", itemId);

      if (updateError) throw updateError;

      // Handle tags update for official items
      if (!isUserItem && editedData.tags.length > 0) {
        // Delete existing tags
        const { error: deleteError } = await supabase
          .from("item_tags")
          .delete()
          .eq("official_item_id", itemId);

        if (deleteError) throw deleteError;

        // Add new tags
        for (const tagName of editedData.tags) {
          // Check if tag exists
          const { data: existingTag } = await supabase
            .from("tags")
            .select("id")
            .eq("name", tagName)
            .maybeSingle();

          let tagId;
          if (!existingTag) {
            // Create new tag
            const { data: newTag, error: createTagError } = await supabase
              .from("tags")
              .insert([{ name: tagName }])
              .select()
              .single();

            if (createTagError) throw createTagError;
            tagId = newTag.id;
          } else {
            tagId = existingTag.id;
          }

          // Create tag relation
          const { error: relationError } = await supabase
            .from("item_tags")
            .insert([{
              official_item_id: itemId,
              tag_id: tagId,
            }]);

          if (relationError) throw relationError;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["official-items"] });
      queryClient.invalidateQueries({ queryKey: ["user-items"] });
      queryClient.invalidateQueries({ queryKey: ["item-tags"] });

      toast({
        title: "更新完了",
        description: "アイテム情報を更新しました。",
      });

      setIsEditing(false);
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