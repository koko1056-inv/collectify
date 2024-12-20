import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

interface CurrentTagsProps {
  itemId: string;
  isUserItem?: boolean;
}

export function CurrentTags({ itemId, isUserItem = false }: CurrentTagsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: itemTags = [] } = useQuery({
    queryKey: isUserItem ? ["user-item-tags", itemId] : ["item-tags", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(isUserItem ? "user_item_tags" : "item_tags")
        .select(`
          tag_id,
          tags (
            id,
            name
          )
        `)
        .eq(isUserItem ? "user_item_id" : "official_item_id", itemId);
      if (error) throw error;
      return data.map(tag => ({
        id: tag.tags.id,
        name: tag.tags.name,
      }));
    },
  });

  const handleRemoveTag = async (tagId: string, tagName: string) => {
    try {
      const { error } = await supabase
        .from(isUserItem ? "user_item_tags" : "item_tags")
        .delete()
        .eq(isUserItem ? "user_item_id" : "official_item_id", itemId)
        .eq("tag_id", tagId);

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: isUserItem ? ["user-item-tags", itemId] : ["item-tags", itemId],
      });

      toast({
        title: "タグを削除しました",
        description: `${tagName}をアイテムから削除しました。`,
      });
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
      <h4 className="text-sm font-medium">現在のタグ</h4>
      <div className="flex flex-wrap gap-2">
        {itemTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id, tag.name)}
              className="hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {itemTags.length === 0 && (
          <p className="text-sm text-muted-foreground">タグはまだ追加されていません</p>
        )}
      </div>
    </div>
  );
}