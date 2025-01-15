import { CardContent as UICardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TagList } from "./TagList";
import { LikeButton } from "./LikeButton";
import { BookMarked } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CollectionGoodsCardContentProps {
  id: string;
  isOwner: boolean;
  onMemoriesClick: () => void;
  quantity?: number;
}

export function CollectionGoodsCardContent({
  id,
  isOwner,
  onMemoriesClick,
  quantity = 1,
}: CollectionGoodsCardContentProps) {
  const { data: itemTags = [] } = useQuery({
    queryKey: ["user-item-tags", id],
    queryFn: async () => {
      if (!id) return [];
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
    enabled: !!id,
  });

  const { data: itemMemories = [] } = useQuery({
    queryKey: ["item-memories", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("item_memories")
        .select("*")
        .eq("user_item_id", id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching memories:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!id,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });

  return (
    <UICardContent className="px-3 py-2 space-y-1">
      <TagList tags={itemTags} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LikeButton itemId={id} />
          {itemMemories.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMemoriesClick();
              }}
              className="flex flex-col items-center gap-0.5"
            >
              <BookMarked className="h-4 w-4 text-purple-500" />
              <span className="text-[10px] text-purple-500">{itemMemories.length}</span>
            </button>
          )}
          {quantity > 1 && (
            <Badge variant="secondary" className="text-[10px] h-5">
              ×{quantity}
            </Badge>
          )}
        </div>
      </div>
    </UICardContent>
  );
}