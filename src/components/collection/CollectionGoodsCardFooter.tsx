
import { CardFooter } from "@/components/ui/card";
import { CardActions } from "./CardActions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CollectionGoodsCardFooterProps {
  id: string;
  onMemoriesClick: () => void;
  onTagManageClick: () => void;
  onDeleteClick: () => void;
}

export function CollectionGoodsCardFooter({
  id,
  onMemoriesClick,
  onTagManageClick,
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

  return (
    <CardFooter className="px-2 py-1.5">
      <CardActions
        onMemoriesClick={onMemoriesClick}
        onTagManageClick={onTagManageClick}
        onDeleteClick={onDeleteClick}
        hasMemories={false}
        hasTags={itemTags.length > 0}
      />
    </CardFooter>
  );
}
