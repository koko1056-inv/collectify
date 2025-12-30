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
        {/* 3D パースペクティブ コンテナ */}
        <div 
          className="relative mx-auto max-w-md"
          style={{ 
            perspective: "1000px",
            perspectiveOrigin: "50% 30%",
          }}
        >
          {/* ショーケース本体 - 3D回転 */}
          <div
            className="relative"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateX(8deg)",
            }}
          >
            {/* ガラスケース - 上部フレーム */}
            <div 
              className="relative mx-2"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* 天板 */}
              <div 
                className="h-6 rounded-t-xl bg-gradient-to-b from-white/90 via-slate-100/80 to-slate-200/60 border-2 border-white/70 shadow-lg"
                style={{
                  transform: "translateZ(4px)",
                  boxShadow: "0 -4px 20px rgba(255,255,255,0.5), inset 0 2px 10px rgba(255,255,255,0.8)",
                }}
              >
                {/* 天板の光沢ライン */}
                <div className="absolute inset-x-4 top-1 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full opacity-80" />
              </div>

              {/* メインケース本体 */}
              <div 
                className="relative bg-gradient-to-b from-slate-50/40 via-white/20 to-slate-100/40 backdrop-blur-sm border-x-2 border-white/50"
                style={{
                  transformStyle: "preserve-3d",
                  boxShadow: "inset 0 0 30px rgba(255,255,255,0.3), 0 10px 40px rgba(0,0,0,0.1)",
                }}
              >
                {/* 左側ガラスパネル */}
                <div 
                  className="absolute left-0 inset-y-0 w-3 bg-gradient-to-r from-white/60 via-white/30 to-transparent"
                  style={{ transform: "translateZ(2px)" }}
                />
                
                {/* 右側ガラスパネル */}
                <div 
                  className="absolute right-0 inset-y-0 w-3 bg-gradient-to-l from-white/50 via-white/20 to-transparent"
                  style={{ transform: "translateZ(2px)" }}
                />

                {/* 上部からのライティング */}
                <div 
                  className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/50 to-transparent pointer-events-none"
                  style={{ transform: "translateZ(1px)" }}
                />

                {/* 棚コンテンツ */}
                <div className="px-3 py-4 space-y-1">
                  {shelves.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      アイテムがありません
                    </div>
                  ) : (
                    shelves.map((shelfItems, shelfIndex) => (
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
                    ))
                  )}
                </div>
              </div>

              {/* 台座 */}
              <div 
                className="h-8 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 rounded-b-xl border-2 border-slate-400/80"
                style={{
                  transform: "translateZ(-2px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.25), inset 0 2px 4px rgba(255,255,255,0.3)",
                }}
              >
                {/* 台座の上面光沢 */}
                <div className="h-2 bg-gradient-to-b from-white/40 to-transparent rounded-t" />
                {/* 台座の前面 */}
                <div className="absolute bottom-0 inset-x-0 h-3 bg-gradient-to-t from-slate-600 to-transparent rounded-b-xl" />
              </div>
            </div>
          </div>

          {/* ケースの影 */}
          <div 
            className="absolute -bottom-4 inset-x-4 h-8 bg-slate-900/20 blur-xl rounded-full"
            style={{ transform: "rotateX(60deg) translateZ(-20px)" }}
          />
        </div>
      </SortableContext>
    </DndContext>
  );
});

export { AcrylicShowcase };
