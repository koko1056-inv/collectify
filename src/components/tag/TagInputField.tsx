import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface TagInputFieldProps {
  itemId: string;
  isUserItem?: boolean;
  isCategory?: boolean;
}

export function TagInputField({ itemId, isUserItem = false, isCategory = false }: TagInputFieldProps) {
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTagName = tagInput.trim().toLowerCase();

      // Add validation for tag length
      if (newTagName.length > 50) {
        toast({
          title: "エラー",
          description: "タグは50文字以内で入力してください。",
          variant: "destructive",
        });
        return;
      }

      try {
        // First check if tag exists
        const { data: existingTag, error: searchError } = await supabase
          .from("tags")
          .select("id")
          .eq("name", newTagName)
          .eq("is_category", isCategory)
          .maybeSingle();

        if (searchError) throw searchError;

        let tagId;
        if (existingTag) {
          tagId = existingTag.id;
          
          // Check if this tag is already associated with the item
          const { data: existingItemTag } = await supabase
            .from(isUserItem ? "user_item_tags" : "item_tags")
            .select("id")
            .eq(isUserItem ? "user_item_id" : "official_item_id", itemId)
            .eq("tag_id", tagId)
            .maybeSingle();

          if (existingItemTag) {
            toast({
              title: isCategory ? "カテゴリが既に存在します" : "タグが既に存在します",
              description: `${newTagName}は既にこのアイテムに追加されています。`,
              variant: "destructive",
            });
            setTagInput("");
            return;
          }
        } else {
          // Create new tag if it doesn't exist
          const { data: newTag, error: createTagError } = await supabase
            .from("tags")
            .insert([{ name: newTagName, is_category: isCategory }])
            .select()
            .single();

          if (createTagError) {
            // If we get a unique constraint violation, try to fetch the tag again
            // as it might have been created by another user in the meantime
            if (createTagError.code === "23505") {
              const { data: retryTag, error: retryError } = await supabase
                .from("tags")
                .select("id")
                .eq("name", newTagName)
                .eq("is_category", isCategory)
                .single();

              if (retryError) throw retryError;
              tagId = retryTag.id;
            } else {
              throw createTagError;
            }
          } else {
            tagId = newTag.id;
          }
        }

        // Insert into the appropriate tags table
        const { error: relationError } = await supabase
          .from(isUserItem ? "user_item_tags" : "item_tags")
          .insert(
            isUserItem
              ? [{ user_item_id: itemId, tag_id: tagId }]
              : [{ official_item_id: itemId, tag_id: tagId }]
          );

        if (relationError) throw relationError;

        // Invalidate queries
        queryClient.invalidateQueries({
          queryKey: isUserItem ? ["user-item-tags", itemId] : ["item-tags", itemId],
        });
        queryClient.invalidateQueries({ queryKey: ["tags"] });

        setTagInput("");
        toast({
          title: isCategory ? "カテゴリを追加しました" : "タグを追加しました",
          description: `${newTagName}をアイテムに追加しました。`,
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
      maxLength={50}
    />
  );
}