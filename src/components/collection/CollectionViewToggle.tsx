import { useState } from "react";
import { CollectionGrid } from "./CollectionGrid";
import { DragEndEvent } from "@dnd-kit/core";
import { CollectionWishlist } from "./CollectionWishlist";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { usePersonalTags } from "@/hooks/usePersonalTags";

interface CollectionViewToggleProps {
  userId: string;
  items: any[];
  isCompact: boolean;
  handleDragEnd: (event: DragEndEvent) => void;
  batchMemories?: Record<string, any[]>;
  selectedPersonalTag?: string;
  onPersonalTagChange?: (tag: string) => void;
  // 選択モード
  isSelectionMode?: boolean;
  selectedItems?: string[];
  onSelectItem?: (itemId: string) => void;
}

export function CollectionViewToggle({
  userId,
  items,
  isCompact,
  handleDragEnd,
  batchMemories = {},
  selectedPersonalTag = "",
  onPersonalTagChange,
  isSelectionMode = false,
  selectedItems = [],
  onSelectItem,
}: CollectionViewToggleProps) {
  const { allUserTags } = usePersonalTags();
  // 「通常表示 / 欲しい物リスト」の切替（マイタグ選択時は無効）
  const [viewType, setViewType] = useState<"grid" | "wishlist">("grid");

  // 現在アクティブなタブ：マイタグ選択中ならそのタグ、なければ viewType
  const activeView: string = selectedPersonalTag || viewType;

  const handleSelectTab = (value: string) => {
    if (value === "grid" || value === "wishlist") {
      setViewType(value as "grid" | "wishlist");
      onPersonalTagChange?.("");
    } else {
      // マイタグ選択時は通常表示に戻す
      setViewType("grid");
      onPersonalTagChange?.(value);
    }
  };

  const tabs: { value: string; label: string }[] = [
    { value: "grid", label: "通常表示" },
    { value: "wishlist", label: "欲しい物リスト" },
    ...allUserTags.map((tag) => ({ value: tag, label: tag })),
  ];

  const showWishlist = activeView === "wishlist";

  return (
    <div className="w-full">
      {/* タブ列：通常表示 / 欲しい物リスト / マイタグ... */}
      <div className="relative mb-4">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-1 px-1 pb-0.5">
            {tabs.map((tab) => {
              const isActive = activeView === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => handleSelectTab(tab.value)}
                  className={cn(
                    "relative shrink-0 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap rounded-full",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-1" />
        </ScrollArea>
      </div>

      {showWishlist ? (
        <CollectionWishlist userId={userId} />
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          {selectedPersonalTag
            ? `「${selectedPersonalTag}」タグが付いたグッズはまだありません`
            : "該当するグッズがありません"}
        </div>
      ) : (
        <CollectionGrid
          items={items}
          isCompact={isCompact}
          isSelectionMode={isSelectionMode}
          selectedItems={selectedItems}
          onSelectItem={onSelectItem ?? (() => {})}
          onDragEnd={handleDragEnd}
          batchMemories={batchMemories}
        />
      )}
    </div>
  );
}
