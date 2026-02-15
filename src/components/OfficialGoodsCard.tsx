import { Card } from "@/components/ui/card";
import { WishlistModal } from "./WishlistModal";
import { WishlistUsersModal } from "./WishlistUsersModal";
import { TagManageModal } from "./tag/TagManageModal";
import { useOfficialGoodsCard } from "./official-goods/useOfficialGoodsCard";
import { ItemDetailsModal } from "./ItemDetailsModal";
import { useState } from "react";
import { Badge } from "./ui/badge";
import { LazyImage } from "./ui/lazy-image";
import { CardContent, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Heart, Users, Tags, Plus, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OfficialGoodsCardProps {
  title: string;
  image: string;
  id: string;
  artist?: string | null;
  anime?: string | null;
  price?: string;
  releaseDate?: string;
  description?: string | null;
  quantity?: number;
  createdBy?: string | null;
  contentName?: string | null;
}

export function OfficialGoodsCard({ 
  title, 
  image, 
  id,
  artist, 
  anime,
  price,
  releaseDate = new Date().toISOString().split('T')[0],
  description,
  quantity = 1,
  createdBy,
  contentName,
}: OfficialGoodsCardProps) {
  const { user } = useAuth();
  const {
    isInCollection,
    wishlistCount,
    isWishlistModalOpen,
    isTagModalOpen,
    setIsWishlistModalOpen,
    setIsTagModalOpen,
    handleAddToCollection,
  } = useOfficialGoodsCard({ id, title, image });

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isWishlistUsersModalOpen, setIsWishlistUsersModalOpen] = useState(false);

  const { data: ownersCount = 0 } = useQuery({
    queryKey: ["item-owners-count", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("user_id")
        .eq("official_item_id", id);
      if (error) return 0;
      return new Set(data.map(item => item.user_id)).size;
    },
  });

  return (
    <>
      <Card 
        className="group relative overflow-hidden border border-border bg-card cursor-pointer flex flex-col h-full transition-shadow duration-300 hover:shadow-lg"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          setIsDetailsModalOpen(true);
        }}
      >
        {/* 画像エリア */}
        <div className="aspect-square relative overflow-hidden">
          <LazyImage
            src={image}
            alt={title}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            skeletonClassName="aspect-square"
          />
          
          {quantity > 1 && (
            <Badge className="absolute top-1.5 right-1.5 z-10 bg-primary/90 text-primary-foreground text-[10px] px-1.5">
              ×{quantity}
            </Badge>
          )}

          {/* ホバーオーバーレイ（デスクトップ） */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 hidden sm:flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={isInCollection ? "secondary" : "default"}
                className="h-8 text-xs gap-1 shadow-md"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCollection();
                }}
                disabled={isInCollection}
              >
                {isInCollection ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {isInCollection ? "追加済み" : "追加"}
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 shadow-md"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsWishlistUsersModalOpen(true);
                }}
              >
                <Heart className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <CardContent className="p-2 sm:p-3 flex-1 flex flex-col">
          <CardTitle className="text-[11px] sm:text-sm font-medium line-clamp-2 text-card-foreground leading-snug min-h-[2.2em]">
            {title}
          </CardTitle>
          
          {/* 統計アイコン行 */}
          <div className="flex items-center gap-2 mt-auto pt-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsWishlistUsersModalOpen(true);
              }}
              className="flex items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="text-[10px] sm:text-xs">{wishlistCount}</span>
            </button>
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="text-[10px] sm:text-xs">{ownersCount}</span>
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsTagModalOpen(true);
              }}
              className="flex items-center text-muted-foreground hover:text-primary transition-colors ml-auto"
            >
              <Tags className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </CardContent>

        {/* モバイル用追加ボタン */}
        <div className="sm:hidden px-1.5 pb-1.5">
          <Button
            size="sm"
            variant={isInCollection ? "secondary" : "default"}
            className={`w-full h-6 text-[10px] gap-0.5 px-1 ${isInCollection ? 'text-muted-foreground' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCollection();
            }}
            disabled={isInCollection}
          >
            {isInCollection ? <Check className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}
            <span className="truncate">{isInCollection ? "追加済み" : "追加"}</span>
          </Button>
        </div>
      </Card>

      {isDetailsModalOpen && (
        <ItemDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title={title}
          image={image}
          price={price}
          releaseDate={releaseDate}
          description={description}
          itemId={id}
          quantity={quantity}
          createdBy={createdBy}
          contentName={contentName}
        />
      )}

      <WishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        itemId={id}
        itemTitle={title}
      />
      <WishlistUsersModal
        isOpen={isWishlistUsersModalOpen}
        onClose={() => setIsWishlistUsersModalOpen(false)}
        itemId={id}
        itemTitle={title}
      />
      <TagManageModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        itemIds={[id]}
        itemTitle={title}
      />
    </>
  );
}
