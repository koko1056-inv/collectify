
import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/utils/sound";

interface UseOfficialGoodsCardProps {
  id: string;
  title: string;
  image: string;
}

export const useOfficialGoodsCard = ({ id, title, image }: UseOfficialGoodsCardProps) => {
  const { user } = useAuth();
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // コレクション内に存在するかチェック
  const { data: isInCollection = false } = useQuery({
    queryKey: ["user-item-exists", id, user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_items")
        .select("id")
        .eq("official_item_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking if item exists in collection:", error);
        return false;
      }

      return !!data;
    },
    enabled: !!user,
  });

  // ウィッシュリストの数を取得
  const { data: wishlistCount = 0 } = useQuery({
    queryKey: ["wishlist-count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("wishlist_items")
        .select("id", { count: "exact" })
        .eq("official_item_id", id);

      if (error) {
        console.error("Error fetching wishlist count:", error);
        return 0;
      }

      return count || 0;
    },
  });

  const handleAddToCollection = async () => {
    if (!user) {
      toast({
        title: "ログインが必要です",
        description: "コレクションに追加するにはログインしてください。",
        variant: "destructive",
      });
      return;
    }

    try {
      // コレクションに追加
      const { data, error } = await supabase
        .from("user_items")
        .insert([
          {
            title,
            image,
            user_id: user.id,
            official_item_id: id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // タグのコピー
      if (data?.id) {
        const { error: tagError } = await supabase.rpc("copy_tags_from_official_item", {
          p_official_item_id: id,
          p_user_item_id: data.id,
        });

        if (tagError) {
          console.error("Error copying tags:", tagError);
        }
      }

      // 追加時に「ピコン」という音を鳴らす
      playSound("success", 0.5);

      // クエリを更新
      await queryClient.invalidateQueries({ queryKey: ["user-item-exists", id, user.id] });
      await queryClient.invalidateQueries({ queryKey: ["user-items"] });
      await queryClient.invalidateQueries({ queryKey: ["item-owners-count", id] });

      // ウィッシュリストから削除（既に追加済みの場合）
      const { error: wishlistError } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("official_item_id", id)
        .eq("user_id", user.id);

      if (wishlistError) {
        console.error("Error removing from wishlist:", wishlistError);
      } else {
        await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
        await queryClient.invalidateQueries({ queryKey: ["wishlist-count", id] });
      }

      toast({
        title: "コレクションに追加しました",
        description: `${title}をコレクションに追加しました`,
      });
    } catch (error) {
      console.error("Error adding to collection:", error);
      
      // エラー時には別の音を鳴らす
      playSound("error", 0.5);
      
      toast({
        title: "エラー",
        description: "コレクションへの追加に失敗しました",
        variant: "destructive",
      });
    }
  };

  return {
    isInCollection,
    wishlistCount,
    isWishlistModalOpen,
    isTagModalOpen,
    setIsWishlistModalOpen,
    setIsTagModalOpen,
    handleAddToCollection,
  };
};
