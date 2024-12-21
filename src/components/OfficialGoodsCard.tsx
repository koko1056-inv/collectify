import { Card } from "@/components/ui/card";
import { WishlistModal } from "./WishlistModal";
import { TagManageModal } from "./tag/TagManageModal";
import { OfficialGoodsCardHeader } from "./official-goods/OfficialGoodsCardHeader";
import { OfficialGoodsCardContent } from "./official-goods/OfficialGoodsCardContent";
import { OfficialGoodsCardFooter } from "./official-goods/OfficialGoodsCardFooter";
import { useOfficialGoodsCard } from "./official-goods/useOfficialGoodsCard";

interface OfficialGoodsCardProps {
  title: string;
  image: string;
  id: string;
  artist?: string | null;
  anime?: string | null;
}

export function OfficialGoodsCard({ 
  title, 
  image, 
  id,
  artist, 
  anime 
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

  return (
    <>
      <Card className="hover-scale card-shadow bg-white border border-gray-200">
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