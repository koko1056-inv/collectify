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
  const canTrade = !isOwner && !!user;

  if (isCompact) {
    return (
      <Card 
        className="hover-scale card-shadow bg-white border border-gray-200 cursor-pointer"
        onClick={() => setIsDetailsModalOpen(true)}
      >
        <CardImage title={title} image={image} />
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
    <Card className="hover-scale card-shadow bg-white border border-gray-200">
      <CardHeader
        title={title}
        image={image}
        onClick={() => setIsDetailsModalOpen(true)}
      />
      <CollectionGoodsCardContent
        id={id}
        isOwner={isOwner}
        quantity={quantity}
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
            showTradeButton={canTrade}
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