import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCollectionCard(id: string, userId?: string) {
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [isTagManageModalOpen, setIsTagManageModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  const { data: isLiked = false } = useQuery({
    queryKey: ["user-item-likes", id, userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase
        .from("user_item_likes")
        .select("id")
        .eq("user_item_id", id)
        .eq("user_id", userId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!userId && !!id,
  });

  const handleLikeToggle = async () => {
    if (!userId) return;
    
    try {
      if (isLiked) {
        await supabase
          .from("user_item_likes")
          .delete()
          .eq("user_item_id", id)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("user_item_likes")
          .insert({
            user_item_id: id,
            user_id: userId,
          });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  return {
    isMemoriesModalOpen,
    isTagManageModalOpen,
    isDeleteDialogOpen,
    isDetailsModalOpen,
    isTradeModalOpen,
    isLiked,
    setIsMemoriesModalOpen,
    setIsTagManageModalOpen,
    setIsDeleteDialogOpen,
    setIsDetailsModalOpen,
    setIsTradeModalOpen,
    handleLikeToggle,
  };
}