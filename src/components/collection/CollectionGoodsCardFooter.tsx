
import { CardFooter } from "@/components/ui/card";
import { CardActions } from "./CardActions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface CollectionGoodsCardFooterProps {
  id: string;
  onMemoriesClick: () => void;
  onTagManageClick: () => void;
  onDeleteClick: () => void;
  onCreatePostClick: () => void;
}

export function CollectionGoodsCardFooter({
  id,
  onMemoriesClick,
  onTagManageClick,
  onDeleteClick,
  onCreatePostClick,
}: CollectionGoodsCardFooterProps) {
  const { data: itemTags = [], refetch } = useQuery({
    queryKey: ["user-item-tags", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_item_tags")
        .select("*")
        .eq("user_item_id", id);
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // リアルタイム更新を追加
  useEffect(() => {
    const channel = supabase
      .channel(`user-item-tags-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_item_tags',
          filter: `user_item_id=eq.${id}`
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, refetch]);

  return (
    <CardFooter className="px-2 pt-1 pb-2 border-t border-border/40">
      <CardActions
        onMemoriesClick={onMemoriesClick}
        onTagManageClick={onTagManageClick}
        onDeleteClick={onDeleteClick}
        onCreatePostClick={onCreatePostClick}
        hasMemories={false}
        hasTags={itemTags.length > 0}
        tagCount={itemTags.length}
      />
    </CardFooter>
  );
}
