
import { useEffect, useState } from "react";
import { CollectionGrid } from "./CollectionGrid";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getGroupItems } from "@/utils/tag/user-groups";
import { GroupInfo } from "@/utils/tag/types";
import { Skeleton } from "@/components/ui/skeleton";

interface GroupItemsProps {
  group: GroupInfo;
  onAddItems: () => void;
  onDragEnd: (event: any) => void;
}

export function GroupItems({ group, onAddItems, onDragEnd }: GroupItemsProps) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (group?.id) {
      const fetchItems = async () => {
        setIsLoading(true);
        try {
          const items = await getGroupItems(group.id);
          setItems(items);
        } catch (error) {
          console.error("Error fetching group items:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchItems();
    }
  }, [group?.id]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">
          {group.name} ({items.length}アイテム)
        </h2>
        <Button
          onClick={onAddItems}
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          アイテムを追加
        </Button>
      </div>
      
      {items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">このグループにはまだアイテムがありません</p>
          <Button onClick={onAddItems} variant="default" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            アイテムを追加
          </Button>
        </div>
      ) : (
        <CollectionGrid
          items={items}
          isCompact={false}
          isSelectionMode={false}
          selectedItems={[]}
          onSelectItem={() => {}}
          onDragEnd={onDragEnd}
        />
      )}
    </div>
  );
}
