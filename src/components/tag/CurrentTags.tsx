import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CurrentTagsProps {
  itemIds: string[];
  isUserItem?: boolean;
  isCategory?: boolean;
}

type TagData = {
  id: string;
  tag_id: string;
  tags: {
    id: string;
    name: string;
  } | null;
};

export function CurrentTags({ itemIds, isUserItem = false, isCategory = false }: CurrentTagsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentTags = [] } = useQuery({
    queryKey: [isUserItem ? "user-item-tags" : "item-tags", itemIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(isUserItem ? "user_item_tags" : "item_tags")
        .select(`
          id,
          tag_id,
          tags (
            id,
            name
          )
        `)
        .in(isUserItem ? "user_item_id" : "official_item_id", itemIds)
        .eq("tags.is_category", isCategory);

      if (error) throw error;
      return data as TagData[];
    },
  });

  const handleRemoveTag = async (tagData: TagData) => {
    try {
      const { error } = await supabase
        .from(isUserItem ? "user_item_tags" : "item_tags")
        .delete()
        .eq("id", tagData.id);

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: [isUserItem ? "user-item-tags" : "item-tags", itemIds],
      });

      toast({
        title: isCategory ? "カテゴリを削除しました" : "タグを削除しました",
        description: `${tagData.tags?.name}を削除しました。`,
      });
    } catch (error) {
      console.error("Error removing tag:", error);
      toast({
        title: "エラー",
        description: isCategory ? "カテゴリの削除に失敗しました。" : "タグの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {currentTags.map((tagData) => (
        <Badge
          key={tagData.id}
          variant="secondary"
          className="cursor-pointer hover:bg-secondary/80"
          onClick={() => handleRemoveTag(tagData)}
        >
          {tagData.tags?.name}
        </Badge>
      ))}
    </div>
  );
}