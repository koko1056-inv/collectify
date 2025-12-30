import React, { memo, useMemo } from "react";
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { MemoizedMyCollectionGoodsCard } from "./MyCollectionGoodsCard";
import { AcrylicShelf } from "./AcrylicShelf";

interface AcrylicShowcaseProps {
  items: any[];
  isCompact: boolean;
  isSelectionMode: boolean;
  selectedItems: string[];
  onSelectItem: (itemId: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  batchMemories?: Record<string, any[]>;
}

const AcrylicShowcase = memo(function AcrylicShowcase({
  items,
  isCompact,
  isSelectionMode,
  selectedItems,
  onSelectItem,
  onDragEnd,
  batchMemories = {},
}: AcrylicShowcaseProps) {
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

  // 3列ごとに棚を作成
  const shelves = useMemo(() => {
    const itemsPerShelf = 3;
    const result: any[][] = [];
    for (let i = 0; i < items.length; i += itemsPerShelf) {
      result.push(items.slice(i, i + itemsPerShelf));
    }
    return result;
  }, [items]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        {/* アクリルケース全体 */}
        <div className="relative">
          {/* ケースのフレーム - 上部 */}
          <div className="relative mx-1 sm:mx-2">
            {/* 天板のガラス反射 */}
            <div className="h-3 bg-gradient-to-b from-white/80 via-white/40 to-transparent rounded-t-xl border-x border-t border-white/60" />
            
            {/* ケースの側面フレーム */}
            <div className="relative border-x-2 border-white/30 bg-gradient-to-b from-slate-50/50 to-slate-100/30 backdrop-blur-sm">
              {/* 上部のライティングエフェクト */}
              <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
              
              {/* 棚コンテンツ */}
              <div className="px-2 py-3 space-y-0">
                {shelves.map((shelfItems, shelfIndex) => (
                  <AcrylicShelf
                    key={shelfIndex}
                    items={shelfItems}
                    shelfIndex={shelfIndex}
                    isCompact={isCompact}
                    isSelectionMode={isSelectionMode}
                    selectedItems={selectedItems}
                    onSelectItem={onSelectItem}
                    batchMemories={batchMemories}
                    isLastShelf={shelfIndex === shelves.length - 1}
                  />
                ))}
              </div>
              
              {/* 左右のガラス反射 */}
              <div className="absolute left-0 inset-y-0 w-2 bg-gradient-to-r from-white/30 to-transparent pointer-events-none" />
              <div className="absolute right-0 inset-y-0 w-2 bg-gradient-to-l from-white/20 to-transparent pointer-events-none" />
            </div>
            
            {/* 台座 */}
            <div className="h-4 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 rounded-b-lg border-x-2 border-b-2 border-slate-400/50 shadow-lg">
              {/* 台座の光沢 */}
              <div className="h-1 bg-gradient-to-b from-white/40 to-transparent rounded-t" />
            </div>
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
});

export { AcrylicShowcase };
