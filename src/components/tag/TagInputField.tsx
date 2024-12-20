import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface TagInputFieldProps {
  itemId: string;
  isUserItem?: boolean;
}

export function TagInputField({ itemId, isUserItem = false }: TagInputFieldProps) {
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTagName = tagInput.trim().toLowerCase();

      try {
        let tagId;
        const { data: existingTag } = await supabase
          .from("tags")
          .select("id")
          .eq("name", newTagName)
          .maybeSingle();

        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const { data: newTag, error: createTagError } = await supabase
            .from("tags")
            .insert([{ name: newTagName }])
            .select()
            .single();

          if (createTagError) throw createTagError;
          tagId = newTag.id;
        }

        // Insert into the appropriate tags table based on item type
        const { error: relationError } = await supabase
          .from(isUserItem ? "user_item_tags" : "item_tags")
          .insert(
            isUserItem
              ? [{ user_item_id: itemId, tag_id: tagId }]
              : [{ official_item_id: itemId, tag_id: tagId }]
          );

        if (relationError) throw relationError;

        // Invalidate the appropriate queries
        queryClient.invalidateQueries({
          queryKey: isUserItem ? ["user-item-tags", itemId] : ["item-tags", itemId],
        });
        queryClient.invalidateQueries({ queryKey: ["tags"] });

        setTagInput("");
        toast({
          title: "タグを追加しました",
          description: `${newTagName}をアイテムに追加しました。`,
        });
      } catch (error) {
        console.error("Error adding tag:", error);
        toast({
          title: "エラー",
          description: "タグの追加に失敗しました。",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Input
      placeholder="新しいタグを入力してEnterを押してください"
      value={tagInput}
      onChange={(e) => setTagInput(e.target.value)}
      onKeyDown={handleAddTag}
    />
  );
}