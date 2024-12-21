import { useState } from "react";
import { Card } from "@/components/ui/card";
import { OfficialGoodsCardHeader } from "./official-goods/OfficialGoodsCardHeader";
import { OfficialGoodsCardContent } from "./official-goods/OfficialGoodsCardContent";
import { OfficialGoodsCardFooter } from "./official-goods/OfficialGoodsCardFooter";
import { TagManageModal } from "./tag/TagManageModal";
import { WishlistModal } from "./WishlistModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface OfficialGoodsCardProps {
  id: string;
  title: string;
  description?: string | null;
  image: string;
  price: string;
  releaseDate: string;
  isInCollection?: boolean;
  wishlistCount: number;
  onAnimeSelect?: (anime: string | null) => void;
  onArtistSelect?: (artist: string | null) => void;
}

export function OfficialGoodsCard({
  id,
  title,
  description,
  image,
  price,
  releaseDate,
  isInCollection = false,
  wishlistCount,
  onAnimeSelect,
  onArtistSelect,
}: OfficialGoodsCardProps) {
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
        release_date: releaseDate,
        prize: price,
        user_id: user.id,
        is_shared: false,
        official_link: id,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-items", user.id] });
      queryClient.invalidateQueries({ queryKey: ["user-item-exists", id, user.id] });

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

  return (
    <>
      <Card className="overflow-hidden bg-white border-gray-200 hover:border-gray-300 transition-colors">
        <OfficialGoodsCardHeader image={image} title={title} />
        <OfficialGoodsCardContent
          title={title}
          description={description}
          price={price}
          releaseDate={releaseDate}
        />
        <OfficialGoodsCardFooter
          isInCollection={isInCollection}
          wishlistCount={wishlistCount}
          onAddToCollection={handleAddToCollection}
          onTagManageClick={() => setIsTagModalOpen(true)}
          onWishlistClick={() => setIsWishlistModalOpen(true)}
          itemId={id}
          itemTitle={title}
          onAnimeSelect={onAnimeSelect}
          onArtistSelect={onArtistSelect}
        />
      </Card>

      <TagManageModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        itemId={id}
        itemTitle={title}
      />

      <WishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        itemId={id}
        itemTitle={title}
      />
    </>
  );
}