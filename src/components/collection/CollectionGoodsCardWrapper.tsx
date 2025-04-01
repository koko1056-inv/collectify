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
import { Pencil, BookMarked, PlusCircle } from "lucide-react";
import { QuantityEditModal } from "./QuantityEditModal";
import { Button } from "@/components/ui/button";
import { LikeButton } from "./LikeButton";

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
          <CardImage title={title} image={image} itemId={id} isEditable={false} />
          <div className="p-2 h-14 relative flex flex-col justify-center">
            <h3 className="text-[10px] font-medium text-gray-900 line-clamp-2">{title}</h3>
            {quantity > 1 && <Badge className="absolute bottom-2 right-2 bg-purple-500 hover:bg-purple-500">
                ×{quantity}
              </Badge>}
          </div>
        </div>
        <CardModals itemId={id} itemTitle={title} userId={userId} image={image} releaseDate={releaseDate} prize={prize} quantity={quantity} isMemoriesModalOpen={isMemoriesModalOpen} isTagManageModalOpen={isTagManageModalOpen} isDeleteDialogOpen={isDeleteDialogOpen} isDetailsModalOpen={isDetailsModalOpen} onMemoriesClose={() => setIsMemoriesModalOpen(false)} onTagManageClose={() => setIsTagManageModalOpen(false)} onDeleteClose={setIsDeleteDialogOpen} onDetailsClose={() => setIsDetailsModalOpen(false)} onDeleteConfirm={handleDelete} />
      </Card>;
  }

  return <Card className="hover-scale card-shadow bg-white border border-gray-200 relative overflow-hidden">
      <CardHeader title={title} image={image} onClick={() => setIsDetailsModalOpen(true)} itemId={id} isEditable={isOwner} />
      <div className="px-3 py-2 h-14 relative flex flex-col justify-center">
        <h3 className="text-[10px] font-medium text-gray-900 line-clamp-2">{title}</h3>
        {isOwner && quantity > 1 && <Badge className="absolute bottom-2 right-2 bg-blue-500 hover:bg-blue-600 cursor-pointer flex items-center gap-1" onClick={e => {
        e.stopPropagation();
        setIsQuantityEditModalOpen(true);
      }}>
            <Pencil size={12} />
            ×{quantity}
          </Badge>}
        {!isOwner && quantity > 1 && <Badge className="absolute bottom-2 right-2 bg-purple-500 hover:bg-purple-500">
            ×{quantity}
          </Badge>}
      </div>
      
      {/* いいねボタン部分 */}
      <UICardFooter className="flex justify-center items-center py-0 px-[12px]">
        <div className="flex items-center gap-4 w-full justify-center">
          <LikeButton itemId={id} />
          <button onClick={e => {
          e.stopPropagation();
          setIsMemoriesModalOpen(true);
        }} className="flex flex-col items-center gap-0.5" aria-label={`思い出: ${itemMemories.length}件`}>
            <div className={`h-7 w-7 p-1.5 ${itemMemories.length > 0 ? 'text-green-500' : 'text-gray-400'}`}>
              <BookMarked className="h-full w-full" />
            </div>
            <span className="text-[10px] -mt-1 text-gray-500">{itemMemories.length}</span>
          </button>
        </div>
      </UICardFooter>
      
      {/* 記録を追加ボタンを復活させる - 横幅を大きくしました */}
      <UICardFooter className="px-3 flex justify-center items-center py-0">
        <Button variant="outline" size="sm" onClick={e => {
        e.stopPropagation();
        setIsMemoriesModalOpen(true);
      }} className="w-[98%] flex items-center justify-center gap-2 mx-auto font-normal text-xs px-[52px] my-0 py-[8px] bg-slate-950 hover:bg-slate-800 text-gray-50">
          <PlusCircle className="h-4 w-4" />
          <span>記録を追加</span>
        </Button>
      </UICardFooter>
      
      {/* トレードボタンのみ表示 */}
      {canTrade && <UICardFooter className="px-2 py-1">
          <CardActions hasMemories={false} hasTags={false} onMemoriesClick={() => setIsMemoriesModalOpen(true)} onTagManageClick={() => setIsTagManageModalOpen(true)} onDeleteClick={() => setIsDeleteDialogOpen(true)} onTradeClick={() => setIsTradeModalOpen(true)} showTradeButton={canTrade} isOtherUserCollection={isOtherUserCollection} />
        </UICardFooter>}
      <CardModals itemId={id} itemTitle={title} userId={userId} image={image} releaseDate={releaseDate} prize={prize} quantity={quantity} isMemoriesModalOpen={isMemoriesModalOpen} isTagManageModalOpen={isTagManageModalOpen} isDeleteDialogOpen={isDeleteDialogOpen} isDetailsModalOpen={isDetailsModalOpen} onMemoriesClose={() => setIsMemoriesModalOpen(false)} onTagManageClose={() => setIsTagManageModalOpen(false)} onDeleteClose={setIsDeleteDialogOpen} onDetailsClose={() => setIsDetailsModalOpen(false)} onDeleteConfirm={handleDelete} />
      {canTrade && <TradeRequestModal isOpen={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} requestedItemId={id} requestedItemTitle={title} receiverId={userId!} />}
      {isOwner && <QuantityEditModal isOpen={isQuantityEditModalOpen} onClose={() => setIsQuantityEditModalOpen(false)} itemId={id} initialQuantity={quantity} itemTitle={title} />}
    </Card>;
}
