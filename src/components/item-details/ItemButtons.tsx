import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAddOfficialItem } from "@/hooks/useAddOfficialItem";
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
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const {
    user
  } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const {
    add,
    increment,
    isAdding: isAddingToCollection,
    isIncrementing: isIncrementingQuantity,
  } = useAddOfficialItem({
    onAdded: async () => {
      await refetchIsInCollection();
      await refetchOwnersCount();
    },
  });

  const handleIncrementQuantity = () => increment(itemId);
  const handleAddToCollection = () =>
    add({ id: itemId, title, image, releaseDate, price });

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
