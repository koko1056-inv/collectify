import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface TagInputFieldProps {
  itemIds: string[];
  isUserItem?: boolean;
  isCategory?: boolean;
}

export function TagInputField({ itemIds, isUserItem = false, isCategory = false }: TagInputFieldProps) {
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTagName = tagInput.trim().toLowerCase();

      try {
        // First check if tag exists
        let tagId;
        const { data: existingTag } = await supabase
          .from("tags")
          .select("id")
          .eq("name", newTagName)
          .eq("is_category", isCategory)
          .maybeSingle();

        if (existingTag) {
          tagId = existingTag.id;
        } else {
          // Create new tag if it doesn't exist
          const { data: newTag, error: createTagError } = await supabase
            .from("tags")
            .insert([{ name: newTagName, is_category: isCategory }])
            .select()
            .single();

          if (createTagError) throw createTagError;
          tagId = newTag.id;
        }

        if (!tagId) {
          throw new Error(isCategory ? "カテゴリIDが見つかりませんでした。" : "タグIDが見つかりませんでした。");
        }

        // Add tag to all selected items
        const tagsToInsert = itemIds.map(itemId => ({
          [isUserItem ? "user_item_id" : "official_item_id"]: itemId,
          tag_id: tagId
        }));

        const { error: relationError } = await supabase
          .from(isUserItem ? "user_item_tags" : "item_tags")
          .insert(tagsToInsert);

        if (relationError) throw relationError;

        // Invalidate queries
        queryClient.invalidateQueries({
          queryKey: isUserItem ? ["user-item-tags", itemIds] : ["item-tags", itemIds],
        });
        queryClient.invalidateQueries({ queryKey: ["tags"] });

        setTagInput("");
        toast({
          title: isCategory ? "カテゴリを追加しました" : "タグを追加しました",
          description: `${newTagName}を${itemIds.length}個のアイテムに追加しました。`,
        });
      } catch (error) {
        console.error("Error adding tag:", error);
        toast({
          title: "エラー",
          description: isCategory ? "カテゴリの追加に失敗しました。" : "タグの追加に失敗しました。",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Input
      placeholder={isCategory ? "新しいカテゴリを入力してEnterを押してください" : "新しいタグを入力してEnterを押してください"}
      value={tagInput}
      onChange={(e) => setTagInput(e.target.value)}
      onKeyDown={handleAddTag}
    />
  );
}