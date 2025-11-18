
import { CardFooter } from "@/components/ui/card";
import { TagsAndSocialButtons } from "./footer/TagsAndSocialButtons";
import { WishlistButton } from "./footer/WishlistButton";
import { CollectionButton } from "./footer/CollectionButton";

interface OfficialGoodsCardFooterProps {
  isInCollection: boolean;
  wishlistCount: number;
  onAddToCollection: (e: React.MouseEvent) => void;
  onTagManageClick: (e: React.MouseEvent) => void;
  onWishlistClick: (e: React.MouseEvent) => void;
  itemId: string;
  itemTitle: string;
  itemImage: string;
}

export function OfficialGoodsCardFooter({
  isInCollection,
  wishlistCount,
  onAddToCollection,
  onTagManageClick,
  onWishlistClick,
  itemId,
  itemTitle,
  itemImage,
}: OfficialGoodsCardFooterProps) {
  return (
    <CardFooter className="p-2 sm:p-4 pt-0 flex flex-col gap-1 sm:gap-2">
      <div className="flex justify-end gap-1 sm:gap-2">
        <TagsAndSocialButtons
          itemId={itemId}
          itemTitle={itemTitle}
          itemImage={itemImage}
          onTagManageClick={onTagManageClick}
        />
        <WishlistButton
          itemId={itemId}
          onWishlistClick={onWishlistClick}
          initialWishlistCount={wishlistCount}
        />
      </div>
      <CollectionButton
        itemId={itemId}
        isInCollection={isInCollection}
        onAddToCollection={onAddToCollection}
      />
    </CardFooter>
  );
}
