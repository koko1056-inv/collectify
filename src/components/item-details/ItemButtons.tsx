import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { addToCollection } from "@/utils/collection-actions";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const {
    user
  } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useLanguage();

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
          toast.error(t("itemDetails.buttons.limitTitle"), {
            description: t("itemDetails.buttons.limitDescription"),
          });
          navigate("/shop");
        } else {
          toast.error(t("itemDetails.common.error"), {
            description: result.error || t("itemDetails.buttons.collectionAddFailed"),
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
          className="w-full"
        >
          {isAddingToCollection ? t("itemDetails.common.adding") : t("itemDetails.info.addToCollection")}
        </Button>
      ) : (
        <Button variant="secondary" disabled className="w-full">
          {t("itemDetails.buttons.inCollection")}
        </Button>
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
