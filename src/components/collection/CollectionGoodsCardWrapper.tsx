import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CardHeader } from "./CardHeader";
import { CollectionGoodsCardContent } from "./CollectionGoodsCardContent";
import { CardFooter as UICardFooter } from "@/components/ui/card";
import { CardActions } from "./CardActions";
import { CardModals } from "./CardModals";
import { useCardEventHandlers } from "./CardEventHandlers";
import { useAuth } from "@/contexts/AuthContext";
import { CardImage } from "./CardImage";
import { TradeRequestModal } from "../trade/TradeRequestModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface CollectionGoodsCardWrapperProps {
  title: string;
  image: string;
  id: string;
  userId?: string;
  releaseDate?: string;
  prize?: string;
  quantity?: number;
  isCompact?: boolean;
}

export function CollectionGoodsCardWrapper({
  title,
  image,
  id,
  userId,
  releaseDate,
  prize,
  quantity = 1,
  isCompact = false,
}: CollectionGoodsCardWrapperProps) {
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [isTagManageModalOpen, setIsTagManageModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  const { handleDelete } = useCardEventHandlers(id);
  const { user } = useAuth();
  const isOwner = !userId || (user && user.id === userId);

  const { data: isLiked = false } = useQuery({
    queryKey: ["user-item-likes", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_item_likes")
        .select("id")
        .eq("user_item_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id,
  });

  const handleLikeToggle = async () => {
    if (!user) return;
    
    try {
      if (isLiked) {
        await supabase
          .from("user_item_likes")
          .delete()
          .eq("user_item_id", id)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("user_item_likes")
          .insert({
            user_item_id: id,
            user_id: user.id,
          });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  if (isCompact) {
    return (
      <Card 
        className="hover-scale card-shadow bg-white border border-gray-200 cursor-pointer relative overflow-hidden"
        onClick={() => setIsDetailsModalOpen(true)}
      >
        {quantity > 1 && (
          <Badge 
            className="absolute top-2 right-2 z-10 bg-purple-500 hover:bg-purple-500"
          >
            ×{quantity}
          </Badge>
        )}
        <CardImage 
          title={title} 
          image={image} 
          itemId={id}
          isEditable={isOwner}
        />
        <CardModals
          itemId={id}
          itemTitle={title}
          userId={userId}
          image={image}
          releaseDate={releaseDate}
          prize={prize}
          quantity={quantity}
          isMemoriesModalOpen={isMemoriesModalOpen}
          isTagManageModalOpen={isTagManageModalOpen}
          isDeleteDialogOpen={isDeleteDialogOpen}
          isDetailsModalOpen={isDetailsModalOpen}
          onMemoriesClose={() => setIsMemoriesModalOpen(false)}
          onTagManageClose={() => setIsTagManageModalOpen(false)}
          onDeleteClose={setIsDeleteDialogOpen}
          onDetailsClose={() => setIsDetailsModalOpen(false)}
          onDeleteConfirm={handleDelete}
        />
      </Card>
    );
  }

  return (
    <Card className="hover-scale card-shadow bg-white border border-gray-200 relative overflow-hidden">
      {quantity > 1 && (
        <Badge 
          className="absolute top-2 right-2 z-10 bg-purple-500 hover:bg-purple-500"
        >
          ×{quantity}
        </Badge>
      )}
      <CardHeader
        title={title}
        image={image}
        onClick={() => setIsDetailsModalOpen(true)}
        itemId={id}
        isEditable={isOwner}
      />
      <CollectionGoodsCardContent
        id={id}
        isOwner={isOwner}
        onMemoriesClick={() => setIsMemoriesModalOpen(true)}
      />
      {(isOwner || canTrade) && (
        <UICardFooter className="px-2 py-1">
          <CardActions
            hasMemories={false}
            hasTags={false}
            onMemoriesClick={() => setIsMemoriesModalOpen(true)}
            onTagManageClick={() => setIsTagManageModalOpen(true)}
            onDeleteClick={() => setIsDeleteDialogOpen(true)}
            onTradeClick={() => setIsTradeModalOpen(true)}
            onLikeClick={handleLikeToggle}
            showTradeButton={canTrade}
            isOtherUserCollection={isOtherUserCollection}
            isLiked={isLiked}
          />
        </UICardFooter>
      )}
      <CardModals
        itemId={id}
        itemTitle={title}
        userId={userId}
        image={image}
        releaseDate={releaseDate}
        prize={prize}
        quantity={quantity}
        isMemoriesModalOpen={isMemoriesModalOpen}
        isTagManageModalOpen={isTagManageModalOpen}
        isDeleteDialogOpen={isDeleteDialogOpen}
        isDetailsModalOpen={isDetailsModalOpen}
        onMemoriesClose={() => setIsMemoriesModalOpen(false)}
        onTagManageClose={() => setIsTagManageModalOpen(false)}
        onDeleteClose={setIsDeleteDialogOpen}
        onDetailsClose={() => setIsDetailsModalOpen(false)}
        onDeleteConfirm={handleDelete}
      />
      {canTrade && (
        <TradeRequestModal
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          requestedItemId={id}
          requestedItemTitle={title}
          receiverId={userId!}
        />
      )}
    </Card>
  );
}
