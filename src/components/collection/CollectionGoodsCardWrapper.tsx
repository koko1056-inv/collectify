
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
import { Pencil } from "lucide-react";
import { QuantityEditModal } from "./QuantityEditModal";

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
  const [isQuantityEditModalOpen, setIsQuantityEditModalOpen] = useState(false);

  const { handleDelete } = useCardEventHandlers(id);
  const { user } = useAuth();
  const isOwner = !userId || (user && user.id === userId);
  const canTrade = !isOwner && user !== null;
  const isOtherUserCollection = !isOwner && userId !== undefined;

  if (isOtherUserCollection || isCompact) {
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
        <div className="space-y-2">
          <CardImage 
            title={title} 
            image={image} 
            itemId={id}
            isEditable={false}
          />
          <div className="p-2">
            <h3 className="text-sm font-medium text-gray-900 truncate">{title}</h3>
          </div>
        </div>
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
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {isOwner && (
          <Badge 
            className="bg-blue-500 hover:bg-blue-600 cursor-pointer flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              setIsQuantityEditModalOpen(true);
            }}
          >
            <Pencil size={12} />
            ×{quantity}
          </Badge>
        )}
        {!isOwner && quantity > 1 && (
          <Badge className="bg-purple-500 hover:bg-purple-500">
            ×{quantity}
          </Badge>
        )}
      </div>
      <CardHeader
        title={title}
        image={image}
        onClick={() => setIsDetailsModalOpen(true)}
        itemId={id}
        isEditable={isOwner}
      />
      <div className="px-3 py-2">
        <h3 className="text-sm font-medium text-gray-900 truncate">{title}</h3>
      </div>
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
            onLikeClick={() => {}}
            showTradeButton={canTrade}
            isOtherUserCollection={isOtherUserCollection}
            isLiked={false}
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
      {isOwner && (
        <QuantityEditModal
          isOpen={isQuantityEditModalOpen}
          onClose={() => setIsQuantityEditModalOpen(false)}
          itemId={id}
          initialQuantity={quantity}
          itemTitle={title}
        />
      )}
    </Card>
  );
}
