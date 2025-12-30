import React, { memo } from "react";
import { MemoizedMyCollectionGoodsCard } from "./MyCollectionGoodsCard";

interface AcrylicShelfProps {
  items: any[];
  shelfIndex: number;
  isCompact: boolean;
  isSelectionMode: boolean;
  selectedItems: string[];
  onSelectItem: (itemId: string) => void;
  batchMemories: Record<string, any[]>;
  isLastShelf: boolean;
}

const AcrylicShelf = memo(function AcrylicShelf({
  items,
  shelfIndex,
  isCompact,
  isSelectionMode,
  selectedItems,
  onSelectItem,
  batchMemories,
  isLastShelf,
}: AcrylicShelfProps) {
  return (
    <div 
      className="relative"
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* アイテムグリッド */}
      <div 
        className="grid grid-cols-3 gap-2 px-1 py-2"
        style={{ 
          transformStyle: "preserve-3d",
          transform: "translateZ(8px)",
        }}
      >
        {items.map((item) => (
          <div 
            key={item.id} 
            className="relative"
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            {isSelectionMode && (
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => onSelectItem(item.id)}
                  className="w-4 h-4 accent-blue-500"
                />
              </div>
            )}
            {/* アイテムカード - 浮いている効果 */}
            <div 
              className="relative transition-all duration-300 hover:scale-105 hover:-translate-y-1"
              style={{
                filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.15))",
              }}
            >
              <MemoizedMyCollectionGoodsCard
                id={item.id}
                title={item.title}
                image={item.image}
                quantity={item.quantity}
                isCompact={isCompact}
                memories={batchMemories[item.id] || []}
              />
              {/* カードの光沢オーバーレイ */}
              <div 
                className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent pointer-events-none rounded-lg"
              />
            </div>
          </div>
        ))}
        
        {/* 空のスロットを埋める（3列維持） */}
        {items.length < 3 && Array.from({ length: 3 - items.length }).map((_, i) => (
          <div 
            key={`empty-${i}`} 
            className="aspect-[3/4] rounded-lg border-2 border-dashed border-slate-300/50 bg-slate-100/30"
          />
        ))}
      </div>
      
      {/* 立体的なガラス棚板 */}
      {!isLastShelf && (
        <div 
          className="relative h-3 mx-1"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* 棚板の上面 - 光沢 */}
          <div 
            className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-slate-300/60 via-white/90 to-slate-300/60 rounded-sm"
            style={{ transform: "translateZ(4px)" }}
          />
          
          {/* 棚板本体 - ガラス */}
          <div 
            className="absolute inset-x-0 top-[3px] h-[6px] bg-gradient-to-b from-slate-300/80 via-slate-200/60 to-slate-300/80 rounded-sm"
            style={{ 
              transform: "translateZ(3px)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.6)",
            }}
          >
            {/* ガラス内の反射ライン */}
            <div className="absolute inset-x-8 top-1 h-[1px] bg-white/70 rounded-full" />
          </div>
          
          {/* 棚板から落ちる影 */}
          <div 
            className="absolute inset-x-4 top-[9px] h-2 bg-gradient-to-b from-slate-500/25 to-transparent blur-[2px]"
          />
        </div>
      )}
    </div>
  );
});

export { AcrylicShelf };
