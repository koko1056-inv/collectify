import React, { memo, useMemo } from "react";
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { MemoizedMyCollectionGoodsCard } from "./MyCollectionGoodsCard";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollectionGridProps {
  items: any[];
  isCompact: boolean;
  isSelectionMode: boolean;
  selectedItems: string[];
  onSelectItem: (itemId: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  batchMemories?: Record<string, any[]>;
}

const CollectionGrid = memo(function CollectionGrid({
  items,
  isCompact,
  isSelectionMode,
  selectedItems,
  onSelectItem,
  onDragEnd,
  batchMemories = {},
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

  const gridClass = useMemo(
    () =>
      isCompact
        ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2"
        : "grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-4",
    [isCompact]
  );

  const grid = (
    <div className={gridClass}>
      {items.map((item) => {
        const isSelected = selectedItems.includes(item.id);
        return (
          <div
            key={item.id}
            className={cn(
              "relative rounded-lg transition-all",
              isSelectionMode && "cursor-pointer",
              isSelectionMode && isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background"
            )}
            onClick={
              isSelectionMode
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectItem(item.id);
                  }
                : undefined
            }
          >
            {isSelectionMode && (
              <>
                {/* 選択中オーバーレイ */}
                {isSelected && (
                  <div className="absolute inset-0 z-10 rounded-lg bg-primary/10 pointer-events-none" />
                )}
                {/* チェックマーク */}
                <div
                  className={cn(
                    "absolute top-2 left-2 z-20 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-background/80 backdrop-blur border-2 border-muted-foreground/40"
                  )}
                >
                  {isSelected && <Check className="w-4 h-4" />}
                </div>
                {/* カードのリンクや内部クリックを抑止 */}
                <div className="absolute inset-0 z-[15]" />
              </>
            )}
            <MemoizedMyCollectionGoodsCard
              id={item.id}
              title={item.title}
              image={item.image}
              quantity={item.quantity}
              isCompact={isCompact}
              memories={batchMemories[item.id] || []}
              ownerId={item.user_id}
            />
          </div>
        );
      })}
    </div>
  );

  // 選択モード中は DnD を無効化
  if (isSelectionMode) {
    return grid;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        {grid}
      </SortableContext>
    </DndContext>
  );
});

export { CollectionGrid };
