
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
import { TagList } from "./TagList";
import { getTagsForItem } from "@/utils/tag/tag-queries";

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

  const { data: itemTags = [] } = useQuery({
    queryKey: ["user-item-tags", id],
    queryFn: async () => {
      return getTagsForItem(id, true);
    },
    enabled: !!id
  });

  if (isOtherUserCollection || isCompact) {
    return (
      <Card 
        className="hover-scale card-shadow bg-white border border-gray-200 cursor-pointer relative overflow-hidden"
        onClick={() => setIsDetailsModalOpen(true)}
      >
        <div className="space-y-2">
          <div className="relative">
            <CardImage 
              title={title} 
              image={image} 
              itemId={id}
              isEditable={false}
            />
            {quantity > 1 && (
              <Badge 
                className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-500"
              >
                ×{quantity}
              </Badge>
            )}
          </div>
          <div className="p-2">
            <h3 className="text-[10px] font-medium text-gray-900 line-clamp-2">{title}</h3>
            <div className="mt-1">
              <TagList tags={itemTags} />
            </div>
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
    <Card className="hover-scale card-shadow bg-white border border-gray-200 relative overflow-hidden flex flex-col">
      <div className="relative">
        <CardHeader
          title={title}
          image={image}
          onClick={() => setIsDetailsModalOpen(true)}
          itemId={id}
          isEditable={isOwner}
          className="aspect-square"
        />
        {quantity > 1 && (
          <Badge 
            className={`absolute top-2 right-2 ${isOwner ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer flex items-center gap-1' : 'bg-blue-500'}`}
            onClick={(e) => {
              if (isOwner) {
                e.stopPropagation();
                setIsQuantityEditModalOpen(true);
              }
            }}
          >
            {isOwner && <Pencil size={12} />}
            ×{quantity}
          </Badge>
        )}
      </div>
      
      <div className="p-2">
        <h3 className="text-[10px] font-medium text-gray-900 line-clamp-2">{title}</h3>
        <div className="mt-1">
          <TagList tags={itemTags} />
        </div>
      </div>
      
      <div className="mt-auto">
        <CollectionGoodsCardContent
          id={id}
          isOwner={isOwner}
          onMemoriesClick={() => setIsMemoriesModalOpen(true)}
        />
      </div>
      
      {/* アクションボタン */}
      {(isOwner || canTrade) && (
        <UICardFooter className="px-2 py-1 pt-0">
          <CardActions
            hasMemories={false}
            hasTags={itemTags.length > 0}
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
