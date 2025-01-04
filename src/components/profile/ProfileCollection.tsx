import { CollectionGoodsCard } from "@/components/CollectionGoodsCard";
import { FilterBar } from "@/components/FilterBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag, UserItem } from "@/types";

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

  return (
    <div className="space-y-6">
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        selectedTags={selectedTags}
        onTagsChange={onTagsChange}
        tags={tags}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {items.map((item) => (
          <CollectionGoodsCard
            key={item.id}
            id={item.id}
            title={item.title}
            image={item.image}
            isShared={item.is_shared}
            userId={item.user_id}
          />
        ))}
      </div>
    </div>
  );
}