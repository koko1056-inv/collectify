
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CategoryTagSelections } from "./CategoryTagSelections";
import { CurrentTagsList } from "./CurrentTagsList";
import { PendingTagsList } from "./PendingTagsList";
import { CategoryTagSearch } from "./CategoryTagSearch";
import { PreviousTags } from "./PreviousTags";
import { ContentNameSection } from "./ContentNameSection";
import { OfficialTagsSection } from "./OfficialTagsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tag } from "@/types";
import { SimpleItemTag } from "@/utils/tag/types";
import { TagUpdate } from "@/types/tag";

export interface TagManageModalContentProps {
  currentTags: SimpleItemTag[];
  pendingUpdates: TagUpdate[];
  onTagChange: (category: string) => (value: string | null) => void;
  itemIds: string[];
  isUserItem?: boolean;
  contentName: string | null;
  onContentChange: (contentName: string | null) => void;
  officialTags: SimpleItemTag[];
}

export function TagManageModalContent({
  currentTags,
  pendingUpdates,
  onTagChange,
  itemIds,
  isUserItem = false,
  contentName,
  onContentChange,
  officialTags,
}: TagManageModalContentProps) {
  // pendingUpdatesからpendingTagsを生成
  const pendingTags = pendingUpdates
    .filter(update => update.value) // 空でないvalue値を持つ更新のみ
    .map(update => ({
      id: `pending-${update.category}`,
      name: update.value || "",
      category: update.category
    }));

  const hasPendingChanges = pendingTags.length > 0;

  return (
    <div className="space-y-6">
      {/* スクロールエリアを追加して内容をスクロール可能にする */}
      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-6 pr-4">
          <ContentNameSection
            contentName={contentName}
            onContentChange={onContentChange}
          />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">現在のタグ</h3>
            <CurrentTagsList
              currentTags={currentTags}
              onRemoveTag={(tagId) => {}}
            />
          </div>

          {hasPendingChanges && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">追加するタグ</h3>
              <PendingTagsList
                pendingUpdates={pendingUpdates}
              />
            </div>
          )}

          <Tabs defaultValue="category">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="category">カテゴリ別タグ</TabsTrigger>
              <TabsTrigger value="search">タグ検索</TabsTrigger>
              <TabsTrigger value="official">公式タグ</TabsTrigger>
            </TabsList>

            <TabsContent value="category">
              <CategoryTagSelections
                currentTags={currentTags}
                pendingUpdates={pendingUpdates}
                onTagChange={onTagChange}
              />
            </TabsContent>

            <TabsContent value="search">
              <CategoryTagSearch
                currentTags={currentTags}
                pendingUpdates={pendingUpdates}
                onTagChange={onTagChange}
              />
            </TabsContent>

            <TabsContent value="official">
              <OfficialTagsSection
                officialTags={officialTags}
                selectedTags={[]}
                onSelectTag={() => {}}
                onUnselectTag={() => {}}
              />
            </TabsContent>
          </Tabs>

          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">最近使用したタグ</h3>
            <div className="flex flex-wrap gap-2">
              {/* 最近使用したタグがあればここに表示 */}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
