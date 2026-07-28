import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { addToCollection, incrementItemQuantity } from "@/utils/collection-actions";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Plus } from "lucide-react";
interface ItemButtonsProps {
  isInCollection: boolean;
  itemId: string;
  title: string;
  image: string;
  releaseDate: string;
  price?: string;
  refetchIsInCollection: () => Promise<any>;
  refetchOwnersCount: () => Promise<any>;
}
export function ItemButtons({
  isInCollection,
  itemId,
  title,
  image,
  releaseDate,
  price,
  refetchIsInCollection,
  refetchOwnersCount
}: ItemButtonsProps) {
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isIncrementingQuantity, setIsIncrementingQuantity] = useState(false);
  const {
    user
  } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // 既に持っているグッズの所持数を +1 する（2個目以降を記録する導線）。
  // ポイントは付与しない（同じ official_item への2回目はサーバー側が弾くため呼ばない）。
  const handleIncrementQuantity = async () => {
    if (!user) {
      toast.error(t("itemDetails.common.error"), {
        description: t("itemDetails.buttons.collectionLoginRequired")
      });
      return;
    }
    setIsIncrementingQuantity(true);
    try {
      const result = await incrementItemQuantity(user.id, itemId);

      if (!result.success) {
        // 見つからない（この公式グッズに紐づく行が無い）のと、更新に失敗したのを区別する
        toast.error(t("itemDetails.common.error"), {
          description: result.notFound
            ? t("collectionScreen.addFlow.incrementNotFound")
            : t("collectionScreen.addFlow.incrementFailed")
        });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["user-items"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["collectionCount"], refetchType: "all" });

      toast.success(
        t("collectionScreen.addFlow.incrementedTo", { count: result.quantity ?? 0 })
      );
    } finally {
      setIsIncrementingQuantity(false);
    }
  };

  // コレクションにアイテムを追加する関数
  const handleAddToCollection = async () => {
    if (!user) {
      toast.error(t("itemDetails.common.error"), {
        description: t("itemDetails.buttons.collectionLoginRequired")
      });
      return;
    }
    setIsAddingToCollection(true);
    try {
      // 既にコレクションにある場合は重複追加せず、所持数 +1 を提案する
      const { count: existingCount } = await supabase
        .from("user_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("official_item_id", itemId);

      if (existingCount && existingCount > 0) {
        toast(t("collectionScreen.addFlow.alreadyAddedTitle"), {
          description: t("collectionScreen.addFlow.alreadyAddedDesc"),
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
        officialItemId: itemId,
        releaseDate,
        prize: price || "0"
      });

      if (!result.success) {
        if (result.isAtLimit) {
          toast.error(t("collectionScreen.addFlow.limitTitle"), {
            description: result.maxSlots
              ? t("collectionScreen.addFlow.limitDescWithMax", { max: result.maxSlots })
              : t("collectionScreen.addFlow.limitDesc"),
          });
          navigate("/shop");
        } else {
          // result.error は Supabase の技術的なメッセージなので画面には出さない（ログのみ）
          if (result.error) console.error("addToCollection failed:", result.error);
          toast.error(t("itemDetails.common.error"), {
            description: t("itemDetails.buttons.collectionAddFailed"),
          });
        }
        return;
      }

      // タグをコピー
      if (result.userItemId) {
        const { data: tags, error: tagsError } = await supabase
          .from("item_tags")
          .select("tag_id")
          .eq("official_item_id", itemId);
        
        if (!tagsError && tags && tags.length > 0) {
          for (const tag of tags) {
            await supabase.from("user_item_tags").insert({
              user_item_id: result.userItemId,
              tag_id: tag.tag_id
            });
          }
        }
      }

      // 状態を更新
      await refetchIsInCollection();
      await refetchOwnersCount();
      await queryClient.invalidateQueries({ queryKey: ["user-items"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["item-owners-count", itemId], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["userPoints"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["collectionCount"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["hero-stats", user.id], refetchType: "all" });
      
      toast.success(t("itemDetails.buttons.addedToCollection"), {
        description: result.pointsAwarded
          ? t("itemDetails.buttons.pointsEarned", { count: result.pointsAwarded })
          : undefined,
      });
    } catch (error) {
      console.error("Error adding to collection:", error);
      toast.error(t("itemDetails.common.error"), {
        description: t("itemDetails.buttons.collectionAddFailed")
      });
    } finally {
      setIsAddingToCollection(false);
    }
  };

  // ウィッシュリストにアイテムを追加する関数
  const handleAddToWishlist = async () => {
    if (!user) {
      toast.error(t("itemDetails.common.error"), {
        description: t("itemDetails.buttons.wishlistLoginRequired")
      });
      return;
    }
    setIsAddingToWishlist(true);
    try {
      // Add to user's wishlist
      const {
        error: insertError
      } = await supabase.from("wishlists").insert({
        user_id: user.id,
        official_item_id: itemId
      });
      if (insertError) throw insertError;
      await queryClient.invalidateQueries({
        queryKey: ["wishlist", user.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ["is-in-wishlist", itemId, user.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ["wishlist-counts"]
      });
      toast.success(t("itemDetails.buttons.success"), {
        description: t("itemDetails.buttons.wishlistAdded")
      });
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast.error(t("itemDetails.common.error"), {
        description: t("itemDetails.buttons.wishlistAddFailed")
      });
    } finally {
      setIsAddingToWishlist(false);
    }
  };
  
  // ItemButtonsコンポーネントが何も返していなかったので、UIを追加
  return (
    <div className="flex gap-2">
      {!isInCollection ? (
        <Button
          onClick={handleAddToCollection}
          disabled={isAddingToCollection}
          className="flex-1"
        >
          {isAddingToCollection ? t("itemDetails.common.adding") : t("itemDetails.info.addToCollection")}
        </Button>
      ) : (
        <>
          <Button variant="secondary" disabled className="flex-1">
            {t("itemDetails.buttons.inCollection")}
          </Button>
          {/* 2個目以降を持っている人が所持数を増やせるようにする */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleIncrementQuantity}
            disabled={isIncrementingQuantity}
            title={t("collectionScreen.addFlow.incrementAction")}
            aria-label={t("collectionScreen.addFlow.incrementAction")}
          >
            {isIncrementingQuantity ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </>
      )}
      <Button 
        variant="outline" 
        onClick={handleAddToWishlist} 
        disabled={isAddingToWishlist}
      >
        {isAddingToWishlist ? t("itemDetails.common.adding") : t("itemDetails.buttons.wishlist")}
      </Button>
    </div>
  );
}
