import { memo } from "react";
import { OfficialGoodsCard } from "../OfficialGoodsCard";
import { SwipeableCard } from "./SwipeableCard";
import { useOfficialGoodsCard } from "./useOfficialGoodsCard";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

interface MemoizedOfficialGoodsCardProps {
  id: string;
  title: string;
  image: string;
  artist?: string | null;
  anime?: string | null;
  price?: string;
  releaseDate?: string;
  createdBy?: string | null;
  contentName?: string | null;
}

const OfficialGoodsCardWithSwipe = ({
  id,
  title,
  image,
  artist,
  anime,
  price,
  releaseDate,
  createdBy,
  contentName,
}: MemoizedOfficialGoodsCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isInCollection, handleAddToCollection } = useOfficialGoodsCard({ id, title, image });
  const { t } = useLanguage();

  const handleSwipeRight = () => {
    if (isInCollection) {
      toast({
        title: t("collectionScreen.official.alreadyAdded"),
        description: t("collectionScreen.official.alreadyAddedDesc"),
      });
      return;
    }
    handleAddToCollection();
  };

  const handleSwipeLeft = async () => {
    if (!user) {
      toast({
        title: t("collectionScreen.official.wishlistLoginRequired"),
        description: t("collectionScreen.official.wishlistLoginDesc"),
        variant: "destructive",
      });
      return;
    }

    try {
      // 既にウィッシュリストに存在するか確認
      const { data: existing } = await supabase
        .from("user_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("official_item_id", id)
        .single();

      if (existing) {
        toast({
          title: t("collectionScreen.official.alreadyInWishlistOrCollection"),
        });
        return;
      }

      // ウィッシュリストに追加（quantity: 0 でウィッシュリストを表現）
      const { error } = await supabase.from("user_items").insert({
        user_id: user.id,
        official_item_id: id,
        title,
        image,
        release_date: new Date().toISOString().split("T")[0],
        prize: "0",
        quantity: 0, // ウィッシュリスト = quantity 0
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["user-items"], refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: ["hero-stats", user.id], refetchType: "all" });

      toast({
        title: t("collectionScreen.official.wishlistAdded"),
        description: t("collectionScreen.official.wishlistAddedDesc"),
      });
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast({
        title: t("collectionScreen.common.error"),
        description: t("collectionScreen.official.wishlistAddFailed"),
        variant: "destructive",
      });
    }
  };

  return (
    <SwipeableCard
      onSwipeRight={handleSwipeRight}
      onSwipeLeft={handleSwipeLeft}
      isDisabled={isInCollection}
    >
      <OfficialGoodsCard
        id={id}
        title={title}
        image={image}
        artist={artist}
        anime={anime}
        price={price}
        releaseDate={releaseDate}
        createdBy={createdBy}
        contentName={contentName}
      />
    </SwipeableCard>
  );
};

export const MemoizedOfficialGoodsCard = memo(OfficialGoodsCardWithSwipe);