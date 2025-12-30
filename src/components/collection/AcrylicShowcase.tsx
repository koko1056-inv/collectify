import React, { memo, useMemo } from "react";
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
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
          className="relative mx-auto w-full"
          style={{ 
            perspective: "1200px",
            perspectiveOrigin: "50% 20%",
          }}
        >
          {/* ショーケース本体 - 3D回転 */}
          <div
            className="relative"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateX(5deg)",
            }}
          >
            {/* ガラスケース全体 */}
            <div 
              className="relative mx-1 sm:mx-2 rounded-xl overflow-hidden"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* 天板 */}
              <div 
                className="h-4 sm:h-6 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200 border-b border-slate-400/50"
                style={{
                  transform: "translateZ(4px)",
                  boxShadow: "inset 0 2px 4px rgba(255,255,255,0.8), 0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                {/* 天板の光沢ライン */}
                <div className="absolute inset-x-4 top-1 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent rounded-full" />
              </div>

              {/* メインケース本体 */}
              <div 
                className="relative bg-gradient-to-b from-slate-100/80 via-slate-50/60 to-slate-100/80 border-x-4 border-slate-300/80"
                style={{
                  transformStyle: "preserve-3d",
                  boxShadow: "inset 0 0 40px rgba(255,255,255,0.5), inset 0 0 20px rgba(100,116,139,0.1)",
                  minHeight: "200px",
                }}
              >
                {/* 左側ガラスパネルの反射 */}
                <div 
                  className="absolute left-0 inset-y-0 w-4 bg-gradient-to-r from-white/50 via-white/20 to-transparent pointer-events-none"
                  style={{ transform: "translateZ(2px)" }}
                />
                
                {/* 右側ガラスパネルの反射 */}
                <div 
                  className="absolute right-0 inset-y-0 w-4 bg-gradient-to-l from-white/40 via-white/15 to-transparent pointer-events-none"
                  style={{ transform: "translateZ(2px)" }}
                />

                {/* 上部からのライティング */}
                <div 
                  className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/60 to-transparent pointer-events-none"
                  style={{ transform: "translateZ(1px)" }}
                />

                {/* 棚コンテンツ */}
                <div className="px-2 sm:px-3 py-3 space-y-0">
                  {shelves.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                      <div className="text-4xl mb-2">📦</div>
                      <p>アイテムがありません</p>
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
                className="h-6 sm:h-8 bg-gradient-to-b from-slate-400 via-slate-500 to-slate-600 border-t border-slate-300"
                style={{
                  transform: "translateZ(-2px)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)",
                }}
              >
                {/* 台座の上面光沢 */}
                <div className="h-1.5 bg-gradient-to-b from-white/30 to-transparent" />
              </div>
            </div>
          </div>

          {/* ケースの影 */}
          <div 
            className="mx-4 mt-2 h-4 bg-slate-900/15 blur-lg rounded-full"
          />
        </div>
      </SortableContext>
    </DndContext>
  );
});

export { AcrylicShowcase };
