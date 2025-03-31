
import { useEffect, useState } from "react";
import { getItemsGroupedByTag } from "@/utils/tag-operations";
import { TagGroupedItems } from "@/utils/tag/types";
import { CollectionGrid } from "./CollectionGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupShowcase } from "./GroupShowcase";
import { useAuth } from "@/contexts/AuthContext";

interface TagGroupedCollectionProps {
  userId?: string | null;
  selectedTags: string[];
}

export function TagGroupedCollection({ userId, selectedTags }: TagGroupedCollectionProps) {
  const [groupedItems, setGroupedItems] = useState<TagGroupedItems>({});
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  useEffect(() => {
    if (effectiveUserId) {
      const fetchGroupedItems = async () => {
        setIsLoading(true);
        try {
          const items = await getItemsGroupedByTag(effectiveUserId, selectedTags);
          setGroupedItems(items);
        } catch (error) {
          console.error("Error fetching grouped items:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchGroupedItems();
    }
  }, [effectiveUserId, selectedTags]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="space-y-3">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // すべてのグループを表示
  return (
    <div className="space-y-12">
      {/* グループショーケースを表示 */}
      <GroupShowcase userId={effectiveUserId} />
      
      {/* タグでグループ化された項目を表示 */}
      {Object.keys(groupedItems).length === 0 ? (
        selectedTags.length > 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">選択したタグにマッチするアイテムがありません。</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">コレクションにはまだアイテムがありません。</p>
          </div>
        )
      ) : (
        Object.entries(groupedItems).map(([tagName, items]) => (
          <div key={tagName} className="space-y-4">
            <h2 className="text-lg font-medium text-gray-800">{tagName}</h2>
            <CollectionGrid
              items={items}
              isCompact={false}
              isSelectionMode={false}
              selectedItems={[]}
              onSelectItem={() => {}}
              onDragEnd={() => {}}
            />
          </div>
        ))
      )}
    </div>
  );
}
