
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollectionGrid } from "./CollectionGrid";
import { TagGroupedCollection } from "./TagGroupedCollection";
import { DragEndEvent } from '@dnd-kit/core';

interface CollectionViewToggleProps {
  userId: string | null | undefined;
  items: any[];
  isCompact: boolean;
  selectedTags?: string[];
  handleDragEnd: (event: DragEndEvent) => void;
}

export function CollectionViewToggle({ 
  userId, 
  items, 
  isCompact, 
  selectedTags = [],
  handleDragEnd 
}: CollectionViewToggleProps) {
  const [viewMode, setViewMode] = useState<"grid" | "group">("grid");

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "grid" | "group")}>
          <TabsList>
            <TabsTrigger value="grid">グリッド表示</TabsTrigger>
            <TabsTrigger value="group">グループ表示</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === "grid" ? (
        <CollectionGrid
          items={items}
          isCompact={isCompact}
          isSelectionMode={false}
          selectedItems={[]}
          onSelectItem={() => {}}
          onDragEnd={handleDragEnd}
        />
      ) : (
        <TagGroupedCollection userId={userId} selectedTags={selectedTags} />
      )}
    </div>
  );
}
