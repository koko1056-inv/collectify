import React, { useState } from "react";
import { CollectionGrid } from "./CollectionGrid";
import { DragEndEvent } from "@dnd-kit/core";
import { CollectionWishlist } from "./CollectionWishlist";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { usePersonalTags } from "@/hooks/usePersonalTags";

type ViewMode = "grid" | "wishlist" | string; // string = personal tag name

interface CollectionViewToggleProps {
  userId: string;
  items: any[];
  isCompact: boolean;
  handleDragEnd: (event: DragEndEvent) => void;
  batchMemories?: Record<string, any[]>;
  selectedPersonalTag?: string;
  onPersonalTagChange?: (tag: string) => void;
}

export function CollectionViewToggle({
  userId,
  items,
  isCompact,
  handleDragEnd,
  batchMemories = {},
  selectedPersonalTag = "",
  onPersonalTagChange,
}: CollectionViewToggleProps) {
  const { allUserTags } = usePersonalTags();
  // "grid" | "wishlist" | personal tag name
  const [activeView, setActiveView] = useState<ViewMode>(
    selectedPersonalTag ? selectedPersonalTag : "grid"
  );

  // 同期：外部からマイタグが変更された場合
  React.useEffect(() => {
    if (selectedPersonalTag) {
      setActiveView(selectedPersonalTag);
    } else if (activeView !== "grid" && activeView !== "wishlist") {
      // マイタグがクリアされたら通常表示に戻す
      setActiveView("grid");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersonalTag]);

  const handleSelect = (view: ViewMode) => {
    setActiveView(view);
    if (view === "grid" || view === "wishlist") {
      onPersonalTagChange?.("");
    } else {
      onPersonalTagChange?.(view);
    }
  };

  const tabs: { value: ViewMode; label: string }[] = [
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
                  onClick={() => handleSelect(tab.value)}
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
      ) : (
        <CollectionGrid
          items={items}
          isCompact={isCompact}
          isSelectionMode={false}
          selectedItems={[]}
          onSelectItem={() => {}}
          onDragEnd={handleDragEnd}
          batchMemories={batchMemories}
        />
      )}
    </div>
  );
}
