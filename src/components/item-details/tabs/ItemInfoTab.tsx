import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookMarked, Link2, Share } from "lucide-react";
import { TagList } from "@/components/collection/TagList";
import { ItemPostsSection } from "@/components/item-posts/ItemPostsSection";
import { Item3DPreview } from "../Item3DPreview";
import type { SimpleItemTag } from "@/utils/tag/types";

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
  return (
    <div className="space-y-4">
      {ownersCount > 0 && <Badge>{ownersCount}人が所持</Badge>}

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
        {itemArtist && <p>アーティスト: {itemArtist}</p>}
        {itemAnime && <p>アニメ: {itemAnime}</p>}
        {itemDetails.release_date && <p>発売日: {itemDetails.release_date}</p>}
        {itemDetails.price && <p>価格: {itemDetails.price}</p>}
        {itemLink && (
          <Link
            to={itemLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:underline"
          >
            <Link2 className="h-4 w-4" />
            公式サイト
          </Link>
        )}
        {itemCreator && (
          <p>
            作成者:{" "}
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
          ウィッシュリストに追加
        </Button>
        <Button size="sm" onClick={onAddToCollection}>
          コレクションに追加
        </Button>
        <Button size="sm" variant="outline" onClick={onShare}>
          <Share className="h-4 w-4 mr-2" />
          シェア
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
