import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CurrentTagsProps {
  itemIds: string[];
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
  tags: Tag | null;
}

export function CurrentTags({ itemIds, isUserItem = false, isCategory = false }: CurrentTagsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = isUserItem ? "user-item-tags" : "item-tags";

  const { data: currentTags = [] } = useQuery<TagRelation[]>({
    queryKey: [queryKey, itemIds],
    queryFn: async () => {
      if (!itemIds.length) return [];
      
      const { data, error } = await supabase
        .from(isUserItem ? "user_item_tags" : "item_tags")
        .select(`
          id,
          tags (
            id,
            name,
            is_category
          )
        `)
        .in(isUserItem ? "user_item_id" : "official_item_id", itemIds);

      if (error) throw error;

      return (data || []).filter(tag => tag.tags?.is_category === isCategory);
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
        queryKey: [queryKey, itemIds],
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
              {tag.tags!.name}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveTag(tag.id, tag.tags!.name)}
              />
            </Badge>
          ))}
      </div>
    </div>
  );
}