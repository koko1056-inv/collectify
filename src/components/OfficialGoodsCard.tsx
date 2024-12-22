import { Card } from "@/components/ui/card";
import { WishlistModal } from "./WishlistModal";
import { TagManageModal } from "./tag/TagManageModal";
import { OfficialGoodsCardHeader } from "./official-goods/OfficialGoodsCardHeader";
import { OfficialGoodsCardContent } from "./official-goods/OfficialGoodsCardContent";
import { OfficialGoodsCardFooter } from "./official-goods/OfficialGoodsCardFooter";
import { useOfficialGoodsCard } from "./official-goods/useOfficialGoodsCard";
import { ItemDetailsModal } from "./ItemDetailsModal";
import { useState } from "react";

interface OfficialGoodsCardProps {
  title: string;
  image: string;
  id: string;
  artist?: string | null;
  anime?: string | null;
  price?: string;
  releaseDate?: string;
  description?: string | null;
}

export function OfficialGoodsCard({ 
  title, 
  image, 
  id,
  artist, 
  anime,
  price,
  releaseDate,
  description
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
        className="hover-scale card-shadow bg-white border border-gray-200 cursor-pointer"
        onClick={() => setIsDetailsModalOpen(true)}
      >
        <OfficialGoodsCardHeader image={image} title={title} />
        <OfficialGoodsCardContent
          title={title}
          artist={artist}
          anime={anime}
          itemId={id}
        />
        <OfficialGoodsCardFooter
          isInCollection={isInCollection}
          wishlistCount={wishlistCount}
          onAddToCollection={handleAddToCollection}
          onTagManageClick={() => setIsTagModalOpen(true)}
          onWishlistClick={() => setIsWishlistModalOpen(true)}
          itemId={id}
          itemTitle={title}
        />
      </Card>

      <ItemDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={title}
        image={image}
        artist={artist}
        anime={anime}
        price={price}
        releaseDate={releaseDate}
        description={description}
        itemId={id}
      />

      <WishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        itemId={id}
        itemTitle={title}
      />
      <TagManageModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        itemId={id}
        itemTitle={title}
      />
    </>
  );
}