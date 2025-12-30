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
    <div className="relative">
      {/* アイテムグリッド */}
      <div className="grid grid-cols-3 gap-2 px-1 py-2">
        {items.map((item) => (
          <div key={item.id} className="relative">
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
            {/* アイテムカードに反射エフェクト */}
            <div className="relative group">
              <MemoizedMyCollectionGoodsCard
                id={item.id}
                title={item.title}
                image={item.image}
                quantity={item.quantity}
                isCompact={isCompact}
                memories={batchMemories[item.id] || []}
              />
              {/* カードの光沢オーバーレイ */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        ))}
        
        {/* 空のスロットを埋める（3列維持） */}
        {items.length < 3 && Array.from({ length: 3 - items.length }).map((_, i) => (
          <div 
            key={`empty-${i}`} 
            className="aspect-[3/4] rounded-lg border-2 border-dashed border-slate-200/50 bg-slate-50/30"
          />
        ))}
      </div>
      
      {/* 立体的なガラス棚板 */}
      {!isLastShelf && (
        <div className="relative h-3 mx-1">
          {/* 棚板の上面（光が当たる部分） */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          
          {/* 棚板のガラス本体 */}
          <div className="absolute inset-x-0 top-[2px] h-[6px] bg-gradient-to-b from-slate-200/60 via-slate-300/40 to-slate-200/60 backdrop-blur-sm">
            {/* ガラスの内部反射 */}
            <div className="absolute inset-x-4 top-1 h-[2px] bg-white/40 rounded-full" />
          </div>
          
          {/* 棚板の影（アイテムに落ちる影） */}
          <div className="absolute inset-x-2 bottom-0 h-2 bg-gradient-to-b from-slate-400/20 to-transparent blur-sm" />
          
          {/* 棚板の厚み（下面） */}
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-slate-400/40 to-transparent" />
        </div>
      )}
    </div>
  );
});

export { AcrylicShelf };
