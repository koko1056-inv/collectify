import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { MemoizedMyCollectionGoodsCard } from "./MyCollectionGoodsCard";
import { PublicCollectionGoodsCard } from "./PublicCollectionGoodsCard";
import { useAuth } from "@/contexts/AuthContext";

interface CollectionGridProps {
  items: any[];
  isCompact?: boolean;
  isSelectionMode?: boolean;
  selectedItems?: string[];
  onSelectItem?: (itemId: string) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  userId?: string;
}

export function CollectionGrid({
  items,
  isCompact = false,
  isSelectionMode = false,
  selectedItems = [],
  onSelectItem,
  onDragEnd,
  userId
}: CollectionGridProps) {
  const { user } = useAuth();
  const isOwnCollection = !userId || (user && user.id === userId);

  if (isOwnCollection) {
    return (
      <DndContext onDragEnd={onDragEnd}>
        <SortableContext items={items} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {items.map((item) => (
              <MemoizedMyCollectionGoodsCard
                key={item.id}
                id={item.id}
                title={item.title}
                image={item.image}
                quantity={item.quantity}
                isCompact={isCompact}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {items.map((item) => (
        <PublicCollectionGoodsCard
          key={item.id}
          id={item.id}
          title={item.title}
          image={item.image}
          quantity={item.quantity}
        />
      ))}
    </div>
  );
}