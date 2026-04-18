import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { trackAddToCollection } from "@/utils/analytics";
import { copyTagsFromOfficialItem } from "@/utils/tag-operations";
import { useSoundEffect } from "@/hooks/useSoundEffect";
import { addToCollection } from "@/utils/collection-actions";
import { useNavigate } from "react-router-dom";

interface UseOfficialGoodsCardProps {
  id: string;
  title: string;
  image: string;
}

export function useOfficialGoodsCard({ id, title, image }: UseOfficialGoodsCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { playSuccessSound } = useSoundEffect();

  const { data: isInCollection = false, refetch: refetchIsInCollection } = useQuery({
    queryKey: ["user-item-exists", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { count, error } = await supabase
        .from("user_items")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id)
        .eq("official_item_id", id);
      
      if (error) {
        console.error("Error checking if item exists in collection:", error);
        return false;
      }
      
      return (count || 0) > 0;
    },
    enabled: !!user,
  });

  const { data: ownersCount = 0 } = useQuery({
    queryKey: ["item-owners-count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_items")
        .select("*", { count: 'exact', head: true })
        .eq("official_item_id", id);
      
      if (error) {
        console.error("Error getting owners count:", error);
        return 0;
      }
      
      return count || 0;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('user-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_items',
          filter: `user_id=eq.${user?.id} and official_item_id=eq.${id}`
        },
        async () => {
          await refetchIsInCollection();
          await queryClient.invalidateQueries({ queryKey: ["user-items", user?.id] });
          await queryClient.invalidateQueries({ queryKey: ["item-owners-count", id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user?.id, queryClient, refetchIsInCollection]);

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
      // 既にコレクションに存在するか確認
      const { count } = await supabase
        .from("user_items")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id)
        .eq("official_item_id", id);

      if (count && count > 0) {
        toast({
          title: "既に追加済み",
          description: "このアイテムは既にコレクションに追加されています。",
        });
        await refetchIsInCollection();
        return;
      }

      // 上限チェック付きでコレクションに追加
      const result = await addToCollection({
        userId: user.id,
        title,
        image,
        officialItemId: id,
        releaseDate: new Date().toISOString().split('T')[0],
        prize: "0"
      });

      if (!result.success) {
        if (result.isAtLimit) {
          toast({
            title: "コレクション枠が上限です",
            description: "ポイントショップで枠を追加購入してください。",
            variant: "destructive",
          });
        } else {
          toast({
            title: "エラー",
            description: result.error || "コレクションへの追加に失敗しました。",
            variant: "destructive",
          });
        }
        return;
      }

      // タグをコピー
      if (result.userItemId) {
        await copyTagsFromOfficialItem(id, result.userItemId);
      }

      trackAddToCollection(id, title, user.id);

      await refetchIsInCollection();
      // refetchType: "all" で非アクティブなクエリも強制再フェッチ（検索→コレクションタブ遷移時に即反映）
      await queryClient.invalidateQueries({ queryKey: ["user-items"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["item-owners-count", id], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["userPoints"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["collectionCount"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["hero-stats", user.id], refetchType: "all" });

      // 効果音を再生
      playSuccessSound();

      toast({
        title: "コレクションに追加しました！",
        description: result.pointsAwarded ? `+${result.pointsAwarded}ポイント獲得` : undefined,
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
