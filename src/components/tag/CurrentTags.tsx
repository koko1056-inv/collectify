import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Basic type definitions with readonly properties
interface Tag {
  readonly id: string;
  readonly name: string;
  readonly is_category: boolean;
}

interface TagRelation {
  readonly id: string;
  readonly tags: Tag | null;
}

// Props type definition with readonly properties
interface CurrentTagsProps {
  readonly itemIds: readonly string[];
  readonly isUserItem?: boolean;
  readonly isCategory?: boolean;
}

// Type guard for TagRelation with non-null tags
function isValidTagRelation(tag: TagRelation): tag is TagRelation & { tags: Tag } {
  return tag.tags !== null;
}

export function CurrentTags({ 
  itemIds, 
  isUserItem = false, 
  isCategory = false 
}: CurrentTagsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tableName = isUserItem ? "user_item_tags" : "item_tags";
  const idColumn = isUserItem ? "user_item_id" : "official_item_id";

  type QueryData = TagRelation[];
  type QueryKey = readonly [string, readonly string[], boolean];

  const { data: currentTags = [] } = useQuery<QueryData, Error, QueryData, QueryKey>({
    queryKey: [tableName, itemIds, isCategory],
    queryFn: async () => {
      if (!itemIds.length) return [];
      
      const { data, error } = await supabase
        .from(tableName)
        .select(`
          id,
          tags (
            id,
            name,
            is_category
          )
        `)
        .in(idColumn, itemIds)
        .eq("tags.is_category", isCategory);

      if (error) throw error;
      return (data || []) as TagRelation[];
    },
  });

  const handleRemoveTag = async (tagRelationId: string, tagName: string) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", tagRelationId);

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: [tableName, itemIds],
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
          .filter(isValidTagRelation)
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