
import { useEffect, useState } from "react";
import { getItemsGroupedByTag } from "@/utils/tag/tag-groups";
import { TagGroupedItems } from "@/utils/tag/types";
import { CollectionGrid } from "./CollectionGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupShowcase } from "./GroupShowcase";
import { useAuth } from "@/contexts/AuthContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AddToGroupButton } from "./AddToGroupButton";

interface TagGroupedCollectionProps {
  userId?: string | null;
}

export function TagGroupedCollection({ userId }: TagGroupedCollectionProps) {
  const [groupedItems, setGroupedItems] = useState<TagGroupedItems>({});
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  useEffect(() => {
    if (effectiveUserId) {
      const fetchGroupedItems = async () => {
        setIsLoading(true);
        try {
          const items = await getItemsGroupedByTag(effectiveUserId);
          setGroupedItems(items);
        } catch (error) {
          console.error("Error fetching grouped items:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchGroupedItems();
    }
  }, [effectiveUserId]);

  // アイテムコンポーネントに追加するグループ選択ボタン
  const renderAddToGroupButton = (item) => (
    <AddToGroupButton itemId={item.id} />
  );

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
      
      {/* タグでグループ化された項目をアコーディオン形式で表示 */}
      {Object.keys(groupedItems).length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">コレクションにはまだアイテムがありません。</p>
        </div>
      ) : (
        <Accordion type="multiple" className="w-full space-y-4">
          {Object.entries(groupedItems).map(([tagName, items]) => (
            <AccordionItem key={tagName} value={tagName} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                <h2 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                  {tagName}
                  <span className="text-sm text-gray-500 font-normal">
                    ({items.length}点)
                  </span>
                </h2>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-4 bg-white">
                <CollectionGrid
                  items={items}
                  isCompact={false}
                  isSelectionMode={false}
                  selectedItems={[]}
                  onSelectItem={() => {}}
                  onDragEnd={() => {}}
                  additionalItemComponent={renderAddToGroupButton}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
