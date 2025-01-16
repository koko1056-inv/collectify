import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { trackAddToCollection } from "@/utils/analytics";

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

  const { data: isInCollection = false } = useQuery({
    queryKey: ["user-item-exists", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from("user_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("title", title)
        .eq("image", image)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking if item exists in collection:", error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user,
  });

  const { data: ownersCount = 0 } = useQuery({
    queryKey: ["item-owners-count", title, image],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_items")
        .select("*", { count: 'exact', head: true })
        .eq("title", title)
        .eq("image", image);
      
      if (error) {
        console.error("Error getting owners count:", error);
        return 0;
      }
      
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
        prize: "0",
        official_link: id,
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["user-item-exists", id, user.id] });
      await queryClient.invalidateQueries({ queryKey: ["user-items", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["item-owners-count", title, image] });

      // Track the event in Mixpanel
      trackAddToCollection(id, title, user.id);

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
    wishlistCount: 0,
    isWishlistModalOpen,
    isTagModalOpen,
    isCategoryModalOpen,
    setIsWishlistModalOpen,
    setIsTagModalOpen,
    setIsCategoryModalOpen,
    handleAddToCollection,
    ownersCount,
  };
}