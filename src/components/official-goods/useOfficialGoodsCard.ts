import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface UseOfficialGoodsCardProps {
  id: string;
  title: string;
  image: string;
}

export function useOfficialGoodsCard({ id, title, image }: UseOfficialGoodsCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  const { data: existingItem, isError: isExistingItemError } = useQuery({
    queryKey: ["user-items", user?.id, title, image],
    queryFn: async () => {
      if (!user) return null;
      
      try {
        const { data, error } = await supabase
          .from("user_items")
          .select("id")
          .eq("user_id", user.id)
          .eq("title", title)
          .eq("image", image)
          .maybeSingle();

        if (error) {
          console.error("Error checking if item exists in collection:", error);
          return null;
        }

        return data;
      } catch (error) {
        console.error("Error checking if item exists in collection:", error);
        return null;
      }
    },
    enabled: !!user,
  });

  const { data: wishlistCount = 0, isError: isWishlistError } = useQuery({
    queryKey: ["wishlist-count", id],
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from("wishlists")
          .select("*", { count: "exact", head: true })
          .eq("official_item_id", id);

        if (error) {
          console.error("Error getting wishlist count:", error);
          return 0;
        }

        return count || 0;
      } catch (error) {
        console.error("Error getting wishlist count:", error);
        return 0;
      }
    },
  });

  const handleAddToCollection = async () => {
    if (!user) {
      toast({
        title: "ログインが必要です",
        description: "コレクションに追加するにはログインしてください。",
      });
      return;
    }

    try {
      const { error } = await supabase.from("user_items").insert({
        title,
        image,
        user_id: user.id,
        release_date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;

      toast({
        title: "追加しました",
        description: "コレクションにアイテムを追加しました。",
      });
    } catch (error) {
      console.error("Error adding item to collection:", error);
      toast({
        title: "エラー",
        description: "アイテムの追加に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return {
    isInCollection: !!existingItem,
    wishlistCount,
    isWishlistModalOpen,
    isTagModalOpen,
    setIsWishlistModalOpen,
    setIsTagModalOpen,
    handleAddToCollection,
  };
}