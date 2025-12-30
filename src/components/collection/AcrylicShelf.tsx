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
          transform: "translateZ(6px)",
        }}
      >
        {items.map((item, itemIndex) => (
          <div 
            key={item.id} 
            className="relative"
            style={{
              transformStyle: "preserve-3d",
              transform: "translateZ(2px)",
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
              className="relative group transition-transform duration-300 hover:scale-105"
              style={{
                transformStyle: "preserve-3d",
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))",
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
                className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none rounded-lg opacity-60"
                style={{ transform: "translateZ(1px)" }}
              />
            </div>
          </div>
        ))}
        
        {/* 空のスロットを埋める（3列維持） */}
        {items.length < 3 && Array.from({ length: 3 - items.length }).map((_, i) => (
          <div 
            key={`empty-${i}`} 
            className="aspect-[3/4] rounded-lg border-2 border-dashed border-white/30 bg-white/10"
            style={{ transform: "translateZ(2px)" }}
          />
        ))}
      </div>
      
      {/* 立体的なガラス棚板 */}
      {!isLastShelf && (
        <div 
          className="relative h-4 mx-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* 棚板の上面 - 光沢 */}
          <div 
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-white/40 via-white/80 to-white/40 rounded-t"
            style={{ transform: "translateZ(4px)" }}
          />
          
          {/* 棚板本体 - ガラス */}
          <div 
            className="absolute inset-x-0 top-1 h-2 bg-gradient-to-b from-slate-200/70 via-slate-100/50 to-slate-200/70"
            style={{ 
              transform: "translateZ(3px)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.5)",
            }}
          >
            {/* ガラス内の反射ライン */}
            <div className="absolute inset-x-6 top-0.5 h-px bg-white/60 rounded-full" />
          </div>
          
          {/* 棚板の厚み（前面） */}
          <div 
            className="absolute inset-x-0 top-3 h-1 bg-gradient-to-b from-slate-300/80 to-slate-400/60"
            style={{ transform: "translateZ(2px) rotateX(-45deg)" }}
          />
          
          {/* 棚板から落ちる影 */}
          <div 
            className="absolute inset-x-2 bottom-0 h-3 bg-gradient-to-b from-slate-400/30 to-transparent blur-sm"
            style={{ transform: "translateZ(0px)" }}
          />
        </div>
      )}
    </div>
  );
});

export { AcrylicShelf };
