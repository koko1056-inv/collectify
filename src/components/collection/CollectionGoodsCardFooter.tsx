import { CardFooter } from "@/components/ui/card";
import { CardActions } from "./CardActions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CollectionGoodsCardFooterProps {
  id: string;
  onMemoriesClick: () => void;
  onTagManageClick: () => void;
  onShareClick: () => void;
  onDeleteClick: () => void;
}

export function CollectionGoodsCardFooter({
  id,
  onMemoriesClick,
  onTagManageClick,
  onShareClick,
  onDeleteClick,
}: CollectionGoodsCardFooterProps) {
  const { data: itemTags = [] } = useQuery({
    queryKey: ["user-item-tags", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_item_tags")
        .select("*")
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

  return (
    <CardFooter className="px-2 py-1.5">
      <CardActions
        onMemoriesClick={onMemoriesClick}
        onTagManageClick={onTagManageClick}
        onShareClick={onShareClick}
        onDeleteClick={onDeleteClick}
        hasMemories={itemMemories.length > 0}
        hasTags={itemTags.length > 0}
      />
    </CardFooter>
  );
}