import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/types";

interface CurrentTagsProps {
  itemIds: string[];
  isUserItem?: boolean;
  isCategory?: boolean;
  className?: string;
  showRemove?: boolean;
}

export function CurrentTags({ 
  itemIds,
  isUserItem = false,
  isCategory = false,
  className = "",
  showRemove = true 
}: CurrentTagsProps) {
  const { data: tags = [] } = useQuery({
    queryKey: ["current-tags", itemIds, isUserItem],
    queryFn: async () => {
      if (!itemIds.length) return [];

      const table = isUserItem ? "user_item_tags" : "item_tags";
      const idColumn = isUserItem ? "user_item_id" : "official_item_id";

      const { data, error } = await supabase
        .from(table)
        .select(`
          tags (
            id,
            name
          )
        `)
        .in(idColumn, itemIds)
        .eq("tags.is_category", isCategory);

      if (error) throw error;
      return data?.map(item => item.tags).filter(Boolean) as Tag[] || [];
    }
  });

  const handleRemoveTag = async (tagId: string) => {
    try {
      const table = isUserItem ? "user_item_tags" : "item_tags";
      const idColumn = isUserItem ? "user_item_id" : "official_item_id";

      const { error } = await supabase
        .from(table)
        .delete()
        .in(idColumn, itemIds)
        .eq("tag_id", tagId);

      if (error) throw error;
    } catch (error) {
      console.error("Error removing tag:", error);
    }
  };

  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="flex items-center gap-1 text-xs"
        >
          {tag.name}
          {showRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => handleRemoveTag(tag.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </Badge>
      ))}
    </div>
  );
}