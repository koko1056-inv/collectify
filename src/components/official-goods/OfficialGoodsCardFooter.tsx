import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { TagButton } from "./buttons/TagButton";
import { CategoryButton } from "./buttons/CategoryButton";

interface OfficialGoodsCardFooterProps {
  isInCollection: boolean;
  wishlistCount: number;
  onAddToCollection: () => void;
  onTagManageClick: () => void;
  onWishlistClick: () => void;
  itemId: string;
  itemTitle: string;
  currentArtist?: string | null;
  currentAnime?: string | null;
  onAnimeSelect?: (anime: string | null) => void;
  onArtistSelect?: (artist: string | null) => void;
}

export function OfficialGoodsCardFooter({
  isInCollection,
  wishlistCount,
  onAddToCollection,
  onTagManageClick,
  onWishlistClick,
  itemId,
  itemTitle,
  currentArtist,
  currentAnime,
  onAnimeSelect,
  onArtistSelect,
}: OfficialGoodsCardFooterProps) {
  return (
    <CardFooter className="p-4 pt-0 flex justify-between gap-2">
      <Button 
        variant={isInCollection ? "secondary" : "default"}
        className={`flex-1 ${isInCollection ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-900 hover:bg-gray-800'}`}
        onClick={onAddToCollection}
        disabled={isInCollection}
      >
        {isInCollection ? "追加済み" : "コレクションに追加"}
      </Button>
      <div className="flex gap-2">
        <TagButton onClick={onTagManageClick} />
        <CategoryButton 
          itemId={itemId} 
          itemTitle={itemTitle}
          currentArtist={currentArtist}
          currentAnime={currentAnime}
          onAnimeSelect={onAnimeSelect}
          onArtistSelect={onArtistSelect}
        />
        <div className="flex flex-col items-center">
          <Button 
            variant="outline" 
            size="icon"
            onClick={onWishlistClick}
            className="border-gray-200 hover:bg-gray-50"
          >
            <Heart className="h-4 w-4" />
          </Button>
          <span className="text-xs text-gray-500 mt-1">{wishlistCount}</span>
        </div>
      </div>
    </CardFooter>
  );
}