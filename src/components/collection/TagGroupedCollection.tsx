
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { getItemsGroupedByTag } from "@/utils/tag/tag-groups";
import { CollectionGrid } from "./CollectionGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { DragEndEvent } from "@dnd-kit/core";
import { Tag } from "lucide-react";

interface TagGroupedCollectionProps {
  userId: string;
}

export function TagGroupedCollection({ userId }: TagGroupedCollectionProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  
  const { data: itemsByTag = {}, isLoading } = useQuery({
    queryKey: ["items-by-tag", userId],
    queryFn: async () => {
      return getItemsGroupedByTag(userId);
    },
    enabled: !!userId,
  });

  // タグのリストを取得
  const tagNames = Object.keys(itemsByTag).sort();
  
  // 初回レンダリング時に最初のタグをアクティブにする
  useEffect(() => {
    if (tagNames.length > 0 && !activeTag) {
      setActiveTag(tagNames[0]);
    }
  }, [tagNames, activeTag]);

  const handleDragEnd = (event: DragEndEvent) => {
    // ドラッグ&ドロップの実装はここに入れることができます
    // 現在は何もしません
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-[120px] w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (Object.keys(itemsByTag).length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">コレクションに追加されたアイテムがありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm">
        <Tag className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium">テーマで表示：</span>
      </div>
      
      <ScrollArea className="w-full">
        <div className="flex space-x-2 pb-2">
          {tagNames.map((tagName) => (
            <Button
              key={tagName}
              variant={activeTag === tagName ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setActiveTag(tagName)}
            >
              {tagName} ({itemsByTag[tagName].length})
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="mt-4">
        {activeTag && itemsByTag[activeTag] && (
          <>
            <h3 className="text-lg font-semibold mb-3">
              {activeTag} <span className="text-sm text-gray-500">({itemsByTag[activeTag].length}アイテム)</span>
            </h3>
            <CollectionGrid
              items={itemsByTag[activeTag]}
              isCompact={isCompact}
              isSelectionMode={false}
              selectedItems={[]}
              onSelectItem={() => {}}
              onDragEnd={handleDragEnd}
            />
          </>
        )}
      </div>
    </div>
  );
}
