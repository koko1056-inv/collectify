import { Card } from "@/components/ui/card";
import { WishlistModal } from "./WishlistModal";
import { TagManageModal } from "./tag/TagManageModal";
import { OfficialGoodsCardHeader } from "./official-goods/OfficialGoodsCardHeader";
import { OfficialGoodsCardContent } from "./official-goods/OfficialGoodsCardContent";
import { OfficialGoodsCardFooter } from "./official-goods/OfficialGoodsCardFooter";
import { useOfficialGoodsCard } from "./official-goods/useOfficialGoodsCard";
import { ItemDetailsModal } from "./ItemDetailsModal";
import { useState } from "react";
import { Badge } from "./ui/badge";
import { playSound } from "@/utils/sound";

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

  return (
    <>
      <Card 
        className="hover-scale card-shadow bg-white border border-gray-200 cursor-pointer relative overflow-hidden flex flex-col h-full"
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName === 'BUTTON') {
            e.stopPropagation();
            return;
          }
          playSound('click', 0.3);  // クリック時に軽い音を再生
          setIsDetailsModalOpen(true);
        }}
      >
        {quantity > 1 && (
          <Badge 
            className="absolute top-2 right-2 z-10 bg-purple-500 hover:bg-purple-500"
          >
            ×{quantity}
          </Badge>
        )}
        <OfficialGoodsCardHeader image={image} title={title} />
        <OfficialGoodsCardContent
          title={title}
          artist={artist}
          itemId={id}
        />
        <div className="mt-auto">
          <OfficialGoodsCardFooter
            isInCollection={isInCollection}
            wishlistCount={wishlistCount}
            onAddToCollection={(e) => {
              e.stopPropagation();
              handleAddToCollection();
            }}
            onTagManageClick={(e) => {
              e.stopPropagation();
              playSound('click', 0.3);  // クリック時に軽い音を再生
              setIsTagModalOpen(true);
            }}
            onWishlistClick={(e) => {
              e.stopPropagation();
              playSound('click', 0.3);  // クリック時に軽い音を再生
              setIsWishlistModalOpen(true);
            }}
            itemId={id}
            itemTitle={title}
            itemImage={image}
          />
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
      <TagManageModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        itemIds={[id]}
        itemTitle={title}
      />
    </>
  );
}
