import { CardContent as UICardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TagList } from "./TagList";
import { LikeButton } from "./LikeButton";
import { BookMarked } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useCardEventHandlers } from "./CardEventHandlers";

interface CollectionGoodsCardContentProps {
  id: string;
  isOwner: boolean;
  isShared: boolean;
  onMemoriesClick: () => void;
}

export function CollectionGoodsCardContent({
  id,
  isOwner,
  isShared,
  onMemoriesClick,
}: CollectionGoodsCardContentProps) {
  const { handleShareToggle } = useCardEventHandlers(id);

  const { data: itemTags = [] } = useQuery({
    queryKey: ["user-item-tags", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_item_tags")
        .select(`
          tag_id,
          tags (
            id,
            name
          )
        `)
        .eq("user_item_id", id);
      if (error) throw error;
      return data;
    },
  });

  const { data: itemMemories = [] } = useQuery({
    queryKey: ["item-memories", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_memories")
        .select("*")
        .eq("user_item_id", id);
      if (error) throw error;
      return data;
    },
  });

  const handleShareToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <UICardContent className="px-3 py-2 space-y-1">
      <TagList tags={itemTags} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <LikeButton itemId={id} />
          {itemMemories.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMemoriesClick();
              }}
              className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600 transition-colors"
            >
              <BookMarked className="h-3.5 w-3.5" />
              <span>{itemMemories.length}</span>
            </button>
          )}
        </div>
        {isOwner && (
          <div onClick={handleShareToggleClick}>
            <Switch
              checked={isShared}
              onCheckedChange={handleShareToggle}
              className="scale-75 origin-right"
            />
          </div>
        )}
      </div>
    </UICardContent>
  );
}