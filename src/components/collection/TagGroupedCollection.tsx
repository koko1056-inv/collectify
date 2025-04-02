
import { useEffect, useState } from "react";
import { getItemsGroupedByTag } from "@/utils/tag/tag-groups";
import { TagGroupedItems } from "@/utils/tag/types";
import { useAuth } from "@/contexts/AuthContext";
import { CollectionGrid } from "./CollectionGrid";

interface TagGroupedCollectionProps {
  tag: string;
}

export function TagGroupedCollection({ tag }: TagGroupedCollectionProps) {
  const [groupedItems, setGroupedItems] = useState<TagGroupedItems>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchGroupedItems() {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // 第2引数としてtagを渡す
        const items = await getItemsGroupedByTag(user.id, tag);
        setGroupedItems(items);
      } catch (error) {
        console.error("Error fetching grouped items:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGroupedItems();
  }, [tag, user?.id]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const items = groupedItems[tag] || [];
  
  return (
    <div>
      <CollectionGrid 
        items={items}
        isCompact={false}
        isSelectionMode={false}
        selectedItems={[]}
        onSelectItem={() => {}}
        onDragEnd={() => {}}
      />
    </div>
  );
}
