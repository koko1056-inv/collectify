import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookMarked, Link2, Share } from "lucide-react";
import { TagList } from "@/components/collection/TagList";
import { ItemPostsSection } from "@/components/item-posts/ItemPostsSection";
import { Item3DPreview } from "../Item3DPreview";
import type { SimpleItemTag } from "@/utils/tag/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemInfoTabProps {
  itemDetails: any;
  itemTags: SimpleItemTag[];
  itemCreator: any;
  ownersCount: number;
  itemArtist?: string | null;
  itemAnime?: string | null;
  itemLink?: string | null;
  model3dUrl?: string | null;
  onAddToWishlist: () => void;
  onAddToCollection: () => void;
  onShare: () => void;
}

export function ItemInfoTab({
  itemDetails,
  itemTags,
  itemCreator,
  ownersCount,
  itemArtist,
  itemAnime,
  itemLink,
  model3dUrl,
  onAddToWishlist,
  onAddToCollection,
  onShare,
}: ItemInfoTabProps) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      {ownersCount > 0 && <Badge>{t("itemDetails.info.ownersCount", { count: ownersCount })}</Badge>}

      <div className="space-y-3">
        <img
          src={itemDetails.image}
          alt={itemDetails.title}
          className="w-full rounded-md aspect-square object-cover"
        />
        {model3dUrl && <Item3DPreview modelUrl={model3dUrl} title={itemDetails.title} />}
      </div>

      {itemDetails.description && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {itemDetails.description}
        </p>
      )}

      <div className="space-y-1 text-sm text-muted-foreground">
        {itemArtist && <p>{t("itemDetails.info.artist")} {itemArtist}</p>}
        {itemAnime && <p>{t("itemDetails.info.anime")} {itemAnime}</p>}
        {itemDetails.release_date && <p>{t("itemDetails.info.releaseDate")} {itemDetails.release_date}</p>}
        {itemDetails.price && <p>{t("itemDetails.info.price")} {itemDetails.price}</p>}
        {itemLink && (
          <Link
            to={itemLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:underline"
          >
            <Link2 className="h-4 w-4" />
            {t("itemDetails.info.officialSite")}
          </Link>
        )}
        {itemCreator && (
          <p>
            {t("itemDetails.info.creator")}{" "}
            <Link to={`/profile/${itemCreator.id}`} className="hover:underline">
              {itemCreator.username}
            </Link>
          </p>
        )}
      </div>

      <TagList tags={itemTags} />

      <div className="flex items-center flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onAddToWishlist}>
          <BookMarked className="h-4 w-4 mr-2" />
          {t("itemDetails.info.addToWishlist")}
        </Button>
        <Button size="sm" onClick={onAddToCollection}>
          {t("itemDetails.info.addToCollection")}
        </Button>
        <Button size="sm" variant="outline" onClick={onShare}>
          <Share className="h-4 w-4 mr-2" />
          {t("itemDetails.info.share")}
        </Button>
      </div>

      {/* みんなの投稿 */}
      <div className="pt-4 border-t border-border">
        <ItemPostsSection
          target={{ type: "official", id: itemDetails.id }}
          itemTitle={itemDetails.title}
          itemImage={itemDetails.image}
        />
      </div>
    </div>
  );
}
