import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CurrentTagsProps {
  itemId: string;
  isUserItem?: boolean;
  isCategory?: boolean;
}

interface Tag {
  id: string;
  name: string;
  is_category: boolean;
}

interface TagRelation {
  id: string;
  tag_id: string;
  tags: Tag;
}

export function CurrentTags({ itemId, isUserItem = false, isCategory = false }: CurrentTagsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentTags = [] } = useQuery({
    queryKey: isUserItem ? ["user-item-tags", itemId] : ["item-tags", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(isUserItem ? "user_item_tags" : "item_tags")
        .select(`
          id,
          tag_id,
          tags (
            id,
            name,
            is_category
          )
        `)
        .eq(isUserItem ? "user_item_id" : "official_item_id", itemId)
        .single();

      if (error) throw error;

      // Filter tags based on is_category and ensure proper type casting
      return data ? [data].filter(tag => tag.tags?.is_category === isCategory) as TagRelation[] : [];
    },
  });

  const handleRemoveTag = async (tagRelationId: string, tagName: string) => {
    try {
      const { error } = await supabase
        .from(isUserItem ? "user_item_tags" : "item_tags")
        .delete()
        .eq("id", tagRelationId);

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: isUserItem ? ["user-item-tags", itemId] : ["item-tags", itemId],
      });

      toast({
        title: isCategory ? "カテゴリを削除しました" : "タグを削除しました",
        description: `${tagName}をアイテムから削除しました。`,
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
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{isCategory ? "現在のカテゴリ" : "現在のタグ"}</h4>
      <div className="flex flex-wrap gap-2">
        {currentTags
          .filter((tag) => tag.tags !== null)
          .map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="pr-2 flex items-center gap-1"
            >
              {tag.tags.name}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveTag(tag.id, tag.tags.name)}
              />
            </Badge>
          ))}
      </div>
    </div>
  );
}