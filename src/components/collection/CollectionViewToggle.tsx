import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollectionGrid } from "./CollectionGrid";
import { TagGroupedCollection } from "./TagGroupedCollection";
import { DragEndEvent } from "@dnd-kit/core";
interface CollectionViewToggleProps {
  userId: string;
  items: any[];
  isCompact: boolean;
  handleDragEnd: (event: DragEndEvent) => void;
}
export function CollectionViewToggle({
  userId,
  items,
  isCompact,
  handleDragEnd
}: CollectionViewToggleProps) {
  return <Tabs defaultValue="grid" className="w-full">
      <TabsList className="grid w-full max-w-[280px] mx-auto grid-cols-2 bg-white border border-gray-200 rounded-full mb-4">
        <TabsTrigger value="grid" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full">
          通常表示
        </TabsTrigger>
        <TabsTrigger value="byTag" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full">ショーケース</TabsTrigger>
      </TabsList>

      <TabsContent value="grid" className="mt-2">
        <CollectionGrid items={items} isCompact={isCompact} isSelectionMode={false} selectedItems={[]} onSelectItem={() => {}} onDragEnd={handleDragEnd} />
      </TabsContent>

      <TabsContent value="byTag" className="mt-2">
        <TagGroupedCollection userId={userId} />
      </TabsContent>
    </Tabs>;
}