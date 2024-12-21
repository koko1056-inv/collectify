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
  item_tags?: Array<{
    tags: {
      id: string;
      name: string;
    } | null;
  }>;
  artist?: string | null;
  anime?: string | null;
  onArtistSelect?: (artist: string | null) => void;
  onAnimeSelect?: (anime: string | null) => void;
}

export function OfficialGoodsCard({ 
  title, 
  image, 
  id, 
  item_tags = [],
  artist,
  anime,
  onArtistSelect,
  onAnimeSelect,
}: OfficialGoodsCardProps) {
  const {
    isInCollection,
    wishlistCount,
    isWishlistModalOpen,
    isTagModalOpen,
    isCategoryModalOpen,
    setIsWishlistModalOpen,
    setIsTagModalOpen,
    setIsCategoryModalOpen,
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
          item_tags={item_tags}
        />
        <OfficialGoodsCardFooter
          isInCollection={isInCollection}
          wishlistCount={wishlistCount}
          onAddToCollection={handleAddToCollection}
          onTagManageClick={() => setIsTagModalOpen(true)}
          onCategoryManageClick={() => setIsCategoryModalOpen(true)}
          onWishlistClick={() => setIsWishlistModalOpen(true)}
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

      <TagManageModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        itemId={id}
        itemTitle={title}
        isCategory={true}
        onArtistSelect={onArtistSelect}
        onAnimeSelect={onAnimeSelect}
      />
    </>
  );
}