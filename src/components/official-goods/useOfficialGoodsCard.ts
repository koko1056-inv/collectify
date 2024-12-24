import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface UseOfficialGoodsCardProps {
  id: string;
  title: string;
  image: string;
}

export function useOfficialGoodsCard({ id, title, image }: UseOfficialGoodsCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: isInCollection } = useQuery({
    queryKey: ["user-item-exists", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data } = await supabase
        .from("user_items")
        .select("id")
        .eq("title", title)
        .eq("image", image)
        .eq("user_id", user.id)
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!user,
  });

  const { data: wishlistCount = 0 } = useQuery({
    queryKey: ["wishlist-count", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("wishlists")
        .select("*", { count: 'exact', head: true })
        .eq("official_item_id", id);
      
      return count || 0;
    },
  });

  const handleAddToCollection = async () => {
    if (!user) {
      toast({
        title: "エラー",
        description: "コレクションに追加するにはログインが必要です。",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("user_items").insert({
        title,
        image,
        release_date: new Date().toISOString().split('T')[0],
        user_id: user.id,
        is_shared: false,
        prize: "0", // Set default prize to "0" to satisfy not-null constraint
        official_link: id,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-item-exists", id, user.id] });
      queryClient.invalidateQueries({ queryKey: ["user-items", user.id] });

      toast({
        title: "成功",
        description: "コレクションに追加しました。",
      });
    } catch (error) {
      console.error("Error adding to collection:", error);
      toast({
        title: "エラー",
        description: "コレクションへの追加に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return {
    isInCollection,
    wishlistCount,
    isWishlistModalOpen,
    isTagModalOpen,
    isCategoryModalOpen,
    setIsWishlistModalOpen,
    setIsTagModalOpen,
    setIsCategoryModalOpen,
    handleAddToCollection,
  };
}