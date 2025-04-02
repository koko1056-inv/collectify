
import React from "react";
import { CollectionGoodsCard } from "../CollectionGoodsCard";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { SortableItem } from "./SortableItem";
import { Checkbox } from "../ui/checkbox";

interface CollectionGridProps {
  items: any[];
  isCompact?: boolean;
  isSelectionMode?: boolean;
  selectedItems: string[];
  onSelectItem: (itemId: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  additionalItemComponent?: (item: any) => React.ReactNode;
}

export function CollectionGrid({
  items,
  isCompact = false,
  isSelectionMode = false,
  selectedItems,
  onSelectItem,
  onDragEnd,
  additionalItemComponent
}: CollectionGridProps) {
  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map(item => item.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {items.map((item) => (
            <div key={item.id} className="relative">
              {isSelectionMode && (
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => onSelectItem(item.id)}
                  />
                </div>
              )}
              <SortableItem id={item.id}>
                <div className="relative">
                  <CollectionGoodsCard
                    id={item.id}
                    title={item.title}
                    image={item.image}
                    quantity={item.quantity}
                    userId={item.user_id}
                    releaseDate={item.release_date}
                    prize={item.prize}
                    isCompact={isCompact}
                  />
                  {additionalItemComponent && additionalItemComponent(item)}
                </div>
              </SortableItem>
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
