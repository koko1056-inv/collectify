import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollectionGrid } from "./CollectionGrid";
import { AcrylicShowcase } from "./AcrylicShowcase";
import { DragEndEvent } from "@dnd-kit/core";
import { CollectionWishlist } from "./CollectionWishlist";
import { Grid3X3, Box } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CollectionViewToggleProps {
  userId: string;
  items: any[];
  isCompact: boolean;
  handleDragEnd: (event: DragEndEvent) => void;
  batchMemories?: Record<string, any[]>;
}

export function CollectionViewToggle({
  userId,
  items,
  isCompact,
  handleDragEnd,
  batchMemories = {},
}: CollectionViewToggleProps) {
  const [viewMode, setViewMode] = useState<"grid" | "showcase">("showcase");

  return (
    <Tabs defaultValue="grid" className="w-full">
      <div className="flex items-center justify-between mb-4">
        <TabsList className="grid max-w-[280px] grid-cols-2 bg-white border border-gray-200 rounded-full">
          <TabsTrigger
            value="grid"
            className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full"
          >
            コレクション
          </TabsTrigger>
          <TabsTrigger
            value="wishlist"
            className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full"
          >
            欲しい物
          </TabsTrigger>
        </TabsList>

        {/* 表示モード切替ボタン */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("grid")}
            className={`rounded-full h-8 w-8 p-0 ${
              viewMode === "grid" 
                ? "bg-gray-900 text-white hover:bg-gray-800" 
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("showcase")}
            className={`rounded-full h-8 w-8 p-0 ${
              viewMode === "showcase" 
                ? "bg-gray-900 text-white hover:bg-gray-800" 
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Box className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <TabsContent value="grid" className="mt-2">
        {viewMode === "showcase" ? (
          <AcrylicShowcase
            items={items}
            isCompact={isCompact}
            isSelectionMode={false}
            selectedItems={[]}
            onSelectItem={() => {}}
            onDragEnd={handleDragEnd}
            batchMemories={batchMemories}
          />
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
      </TabsContent>

      <TabsContent value="wishlist" className="mt-2">
        <CollectionWishlist userId={userId} />
      </TabsContent>
    </Tabs>
  );
}
