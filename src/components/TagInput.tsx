import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TagInputField } from "./tag/TagInputField";
import { CurrentTags } from "./tag/CurrentTags";
import { PreviousTags } from "./tag/PreviousTags";
import { Tag } from "@/types";

interface TagInputProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagInput({ selectedTags, onTagsChange }: TagInputProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });

  const { data: userPreviousTags = [] } = useQuery({
    queryKey: ["user-previous-tags"],
    queryFn: async () => {
      const { data: userItems, error: userItemsError } = await supabase
        .from("user_items")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id);
      
      if (userItemsError) throw userItemsError;
      if (!userItems?.length) return [];

      const { data: tagIds, error: tagsError } = await supabase
        .from("user_item_tags")
        .select("tag_id")
        .in("user_item_id", userItems.map(item => item.id));

      if (tagsError) throw tagsError;
      if (!tagIds?.length) return [];

      const uniqueTagIds = [...new Set(tagIds.map(t => t.tag_id))];

      const { data: tags, error: tagNamesError } = await supabase
        .from("tags")
        .select("*")
        .in("id", uniqueTagIds)
        .order("name");

      if (tagNamesError) throw tagNamesError;
      return tags as Tag[];
    },
  });

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      const tagToDelete = existingTags.find(tag => tag.name === tagToRemove);
      
      if (tagToDelete) {
        onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));

        toast({
          title: "タグを削除しました",
          description: `${tagToRemove}を削除しました。`,
        });
      }
    } catch (error) {
      console.error("Error removing tag:", error);
      toast({
        title: "エラー",
        description: "タグの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="tags" className="text-sm font-medium">
        タグ
      </label>
      <TagInputField
        selectedTags={selectedTags}
        onTagsChange={onTagsChange}
      />
      <CurrentTags
        tags={selectedTags}
        onRemove={handleRemoveTag}
      />
      <PreviousTags
        tags={userPreviousTags}
        selectedTags={selectedTags}
        onTagSelect={(tagName) => onTagsChange([...selectedTags, tagName])}
        title="使ったことのあるタグ"
      />
      <PreviousTags
        tags={existingTags}
        selectedTags={selectedTags}
        onTagSelect={(tagName) => onTagsChange([...selectedTags, tagName])}
        title="既存のタグ"
      />
    </div>
  );
}