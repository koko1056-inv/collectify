import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { trackAddToCollection } from "@/utils/analytics";
import { copyTagsFromOfficialItem } from "@/utils/tag-operations";
import { useSoundEffect } from "@/hooks/useSoundEffect";
import { addToCollection, incrementItemQuantity } from "@/utils/collection-actions";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface UseOfficialGoodsCardProps {
  id: string;
  title: string;
  image: string;
}

export function useOfficialGoodsCard({ id, title, image }: UseOfficialGoodsCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { playSuccessSound } = useSoundEffect();
  const { t } = useLanguage();

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

  // 既に持っているグッズの所持数を +1 する（2個目以降を記録する導線）。
  // ポイントは付与しない（同じ official_item への2回目はサーバー側が弾くため呼ばない）。
  const handleIncrementQuantity = async () => {
    if (!user) return;

    const result = await incrementItemQuantity(user.id, id);

    if (!result.success) {
      toast.error(t("collectionScreen.common.error"), {
        description: t("collectionScreen.addFlow.incrementFailed"),
      });
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["user-items"], refetchType: "all" });
    await queryClient.invalidateQueries({ queryKey: ["collectionCount"], refetchType: "all" });

    playSuccessSound();
    toast.success(
      t("collectionScreen.addFlow.incrementedTo", { count: result.quantity ?? 0 })
    );
  };

  const handleAddToCollection = async () => {
    if (!user) {
      toast.error(t("collectionScreen.common.error"), {
        description: t("collectionScreen.official.loginToAdd"),
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
        // 重複追加はせず、「もう1個持っている」を記録できる導線を出す
        toast(t("collectionScreen.official.alreadyAdded"), {
          description: t("collectionScreen.official.alreadyAddedDesc"),
          action: {
            label: t("collectionScreen.addFlow.incrementAction"),
            onClick: () => {
              void handleIncrementQuantity();
            },
          },
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
          toast.error(t("collectionScreen.addFlow.limitTitle"), {
            description: result.maxSlots
              ? t("collectionScreen.addFlow.limitDescWithMax", { max: result.maxSlots })
              : t("collectionScreen.addFlow.limitDesc"),
          });
        } else {
          // result.error は Supabase の技術的なメッセージなので画面には出さない（ログのみ）
          if (result.error) console.error("addToCollection failed:", result.error);
          toast.error(t("collectionScreen.common.error"), {
            description: t("collectionScreen.official.addFailed"),
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

      toast.success(t("collectionScreen.official.added"), {
        description: result.pointsAwarded ? `+${result.pointsAwarded}${t("collectionScreen.official.pointsEarnedSuffix")}` : undefined,
      });
    } catch (error) {
      console.error("Error adding to collection:", error);
      toast.error(t("collectionScreen.common.error"), {
        description: t("collectionScreen.official.addFailed"),
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
