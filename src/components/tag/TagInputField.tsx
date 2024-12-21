import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface TagInputFieldProps {
  itemId: string;
  isUserItem?: boolean;
  isCategory?: boolean;
  onOpenSelectionDialog?: () => void;
}

export function TagInputField({ 
  itemId, 
  isUserItem = false, 
  isCategory = false,
  onOpenSelectionDialog 
}: TagInputFieldProps) {
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

          if (createTagError) throw createTagError;
          tagId = newTag.id;
        }

        if (!tagId) {
          throw new Error(isCategory ? "カテゴリIDが見つかりませんでした。" : "タグIDが見つかりませんでした。");
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
    <div className="flex gap-2">
      <Input
        placeholder={isCategory ? "新しいカテゴリを入力してEnterを押してください" : "新しいタグを入力してEnterを押してください"}
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyDown={handleAddTag}
      />
      {isCategory && onOpenSelectionDialog && (
        <Button
          variant="outline"
          onClick={onOpenSelectionDialog}
          className="flex-shrink-0"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}