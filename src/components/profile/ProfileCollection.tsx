import { CollectionGoodsCard } from "@/components/CollectionGoodsCard";
import { FilterBar } from "@/components/FilterBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Grid, List, Heart } from "lucide-react";
import { Tag, UserItem } from "@/types";
import { useState } from "react";
import { WishlistViewModal } from "@/components/WishlistViewModal";

interface ProfileCollectionProps {
  isLoading: boolean;
  items: UserItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tags: Tag[];
}

export function ProfileCollection({
  isLoading,
  items,
  searchQuery,
  onSearchChange,
  selectedTags,
  onTagsChange,
  tags,
}: ProfileCollectionProps) {
  const [isCompact, setIsCompact] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {Array(12)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-40 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
      </div>
    );
  }

  const gridClass = isCompact
    ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2"
    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          selectedTags={selectedTags}
          onTagsChange={onTagsChange}
          tags={tags}
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsWishlistModalOpen(true)}
            className="gap-2"
          >
            <Heart className="h-4 w-4" />
            <span>ウィッシュリスト</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCompact(!isCompact)}
            className="gap-2"
          >
            {isCompact ? (
              <>
                <Grid className="h-4 w-4" />
                <span>通常表示</span>
              </>
            ) : (
              <>
                <List className="h-4 w-4" />
                <span>一覧表示</span>
              </>
            )}
          </Button>
        </div>
      </div>
      <div className={gridClass}>
        {items.map((item) => (
          <CollectionGoodsCard
            key={item.id}
            id={item.id}
            title={item.title}
            image={item.image}
            isShared={item.is_shared}
            userId={item.user_id}
            isCompact={isCompact}
          />
        ))}
      </div>
      <WishlistViewModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
      />
    </div>
  );
}