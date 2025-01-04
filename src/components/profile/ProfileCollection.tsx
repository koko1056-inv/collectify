import { CollectionGoodsCard } from "@/components/CollectionGoodsCard";
import { FilterBar } from "@/components/FilterBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Grid, List } from "lucide-react";
import { Tag, UserItem } from "@/types";
import { useState } from "react";

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

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-gray-500">共有されているアイテムはありません</p>
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCompact(!isCompact)}
          className="gap-2 ml-4"
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
    </div>
  );
}