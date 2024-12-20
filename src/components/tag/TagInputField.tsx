import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface TagInputFieldProps {
  itemId: string;
}

export function TagInputField({ itemId }: TagInputFieldProps) {
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

        const { error: relationError } = await supabase
          .from("item_tags")
          .insert([{
            official_item_id: itemId,
            tag_id: tagId,
          }]);

        if (relationError) throw relationError;

        queryClient.invalidateQueries({ queryKey: ["item-tags", itemId] });
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