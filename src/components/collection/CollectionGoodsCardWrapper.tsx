
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
import { Pencil, Heart, BookMarked, PlusCircle } from "lucide-react";
import { QuantityEditModal } from "./QuantityEditModal";
import { Button } from "../ui/button";
import { LikeButton } from "./LikeButton";
import { ItemMemoriesModal } from "../ItemMemoriesModal";

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
  isCompact = false
}: CollectionGoodsCardWrapperProps) {
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [isTagManageModalOpen, setIsTagManageModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isQuantityEditModalOpen, setIsQuantityEditModalOpen] = useState(false);
  const {
    handleDelete
  } = useCardEventHandlers(id);
  const {
    user
  } = useAuth();
  const isOwner = !userId || user && user.id === userId;
  const canTrade = !isOwner && user !== null;
  const isOtherUserCollection = !isOwner && userId !== undefined;
  const {
    data: itemMemories = []
  } = useQuery({
    queryKey: ["item-memories", id],
    queryFn: async () => {
      if (!id) return [];
      const {
        data,
        error
      } = await supabase.from("item_memories").select("*").eq("user_item_id", id).order("created_at", {
        ascending: false
      });
      if (error) {
        console.error("Error fetching memories:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!id,
    refetchOnWindowFocus: true,
    staleTime: 0,
    refetchInterval: 2000
  });

  if (isOtherUserCollection || isCompact) {
    return <Card className="hover-scale card-shadow bg-white border border-gray-200 cursor-pointer relative overflow-hidden" onClick={() => setIsDetailsModalOpen(true)}>
        <div className="space-y-2">
          <div className="relative">
            <CardImage title={title} image={image} itemId={id} isEditable={false} />
            <Badge className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-500 rounded-full">
              ×{quantity}
            </Badge>
          </div>
          <div className="p-2 pb-3 relative">
            <h3 className="text-[10px] font-medium text-gray-900 line-clamp-2">{title}</h3>
            <div className="flex items-center justify-between mt-1">
              <LikeButton itemId={id} />
              {itemMemories.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMemoriesModalOpen(true);
                  }}
                  className="flex items-center gap-1"
                >
                  <BookMarked className="h-3 w-3 text-gray-400" />
                  <span className="text-[10px] text-gray-500">{itemMemories.length}</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <CardModals itemId={id} itemTitle={title} userId={userId} image={image} releaseDate={releaseDate} prize={prize} quantity={quantity} isMemoriesModalOpen={isMemoriesModalOpen} isTagManageModalOpen={isTagManageModalOpen} isDeleteDialogOpen={isDeleteDialogOpen} isDetailsModalOpen={isDetailsModalOpen} onMemoriesClose={() => setIsMemoriesModalOpen(false)} onTagManageClose={() => setIsTagManageModalOpen(false)} onDeleteClose={setIsDeleteDialogOpen} onDetailsClose={() => setIsDetailsModalOpen(false)} onDeleteConfirm={handleDelete} />
      </Card>;
  }

  return <Card className="hover-scale card-shadow bg-white border border-gray-200 relative overflow-hidden">
      <div className="relative">
        <CardImage title={title} image={image} itemId={id} isEditable={isOwner} />
        <Badge className={`absolute top-2 right-2 ${isOwner ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer flex items-center gap-1' : 'bg-blue-500'} rounded-full`} onClick={isOwner ? e => {
        e.stopPropagation();
        setIsQuantityEditModalOpen(true);
      } : undefined}>
          {isOwner && <Pencil size={10} className="mr-0.5" />}
          ×{quantity}
        </Badge>
      </div>

      <div onClick={() => setIsDetailsModalOpen(true)} className="cursor-pointer">
        <div className="px-3 py-2 relative">
          <h3 className="text-[10px] font-medium text-gray-900 line-clamp-2">{title}</h3>
          <div className="flex items-center justify-between mt-1">
            <LikeButton itemId={id} />
            {itemMemories.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMemoriesModalOpen(true);
                }}
                className="flex items-center gap-1"
              >
                <BookMarked className="h-3 w-3 text-gray-400" />
                <span className="text-[10px] text-gray-500">{itemMemories.length}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <UICardFooter className="p-0">
        <Button onClick={e => {
        e.stopPropagation();
        setIsMemoriesModalOpen(true);
      }} className="w-full rounded-none bg-black hover:bg-gray-800 text-white text-xs flex items-center justify-center gap-1 py-0 my-0">
          <PlusCircle className="h-3.5 w-3.5" />
          記録を追加
        </Button>
      </UICardFooter>

      <CardModals itemId={id} itemTitle={title} userId={userId} image={image} releaseDate={releaseDate} prize={prize} quantity={quantity} isMemoriesModalOpen={isMemoriesModalOpen} isTagManageModalOpen={isTagManageModalOpen} isDeleteDialogOpen={isDeleteDialogOpen} isDetailsModalOpen={isDetailsModalOpen} onMemoriesClose={() => setIsMemoriesModalOpen(false)} onTagManageClose={() => setIsTagManageModalOpen(false)} onDeleteClose={setIsDeleteDialogOpen} onDetailsClose={() => setIsDetailsModalOpen(false)} onDeleteConfirm={handleDelete} />
      {canTrade && <TradeRequestModal isOpen={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} requestedItemId={id} requestedItemTitle={title} receiverId={userId!} />}
      {isOwner && <QuantityEditModal isOpen={isQuantityEditModalOpen} onClose={() => setIsQuantityEditModalOpen(false)} itemId={id} initialQuantity={quantity} itemTitle={title} />}
      <ItemMemoriesModal 
        isOpen={isMemoriesModalOpen} 
        onClose={() => setIsMemoriesModalOpen(false)} 
        itemIds={[id]} 
        itemTitles={[title]}
        userId={userId}
      />
    </Card>;
}
