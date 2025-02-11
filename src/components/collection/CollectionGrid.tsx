
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { MemoizedMyCollectionGoodsCard } from "./MyCollectionGoodsCard";
import { cn } from "@/lib/utils";

interface CollectionGridProps {
  items: any[];
  isCompact: boolean;
  isSelectionMode: boolean;
  selectedItems: string[];
  onSelectItem: (itemId: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
}

export function CollectionGrid({
  items,
  isCompact,
  isSelectionMode,
  selectedItems,
  onSelectItem,
  onDragEnd,
}: CollectionGridProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  const gridClass = isCompact
    ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2"
    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className={gridClass}>
          {items.map((item) => (
            <div 
              key={item.id} 
              className={cn(
                "relative group cursor-pointer",
                isSelectionMode && selectedItems.includes(item.id) && "ring-2 ring-primary ring-offset-2"
              )}
              onClick={() => isSelectionMode && onSelectItem(item.id)}
            >
              {isSelectionMode && (
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      onSelectItem(item.id);
                    }}
                    className="w-4 h-4"
                  />
                </div>
              )}
              <MemoizedMyCollectionGoodsCard
                id={item.id}
                title={item.title}
                image={item.image}
                quantity={item.quantity}
                isCompact={isCompact}
              />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
