
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

export interface TagManageModalContentProps {
  item: any;
  pendingTags: Tag[];
  currentTags: Tag[];
  selectedTags: string[];
  contentNames: string[];
  selectedContent: string;
  popularTags: Tag[];
  previousTags: Tag[];
  officialTags: Tag[];
  onSelectTag: (tagId: string) => void;
  onUnselectTag: (tagId: string) => void;
  onSelectContent: (content: string) => void;
  onAddTagToCurrentList: (tagId: string, name: string, category?: string) => void;
  onRemoveTagFromCurrentList: (tagId: string) => void;
  onAddTagToPendingList: (tagId: string, name: string, category?: string) => void;
  onRemoveTagFromPendingList: (tagId: string) => void;
  onAddNewTag: (tag: string, category?: string) => void;
}

export function TagManageModalContent({
  item,
  pendingTags,
  currentTags,
  selectedTags,
  contentNames,
  selectedContent,
  popularTags,
  previousTags,
  officialTags,
  onSelectTag,
  onUnselectTag,
  onSelectContent,
  onAddTagToCurrentList,
  onRemoveTagFromCurrentList,
  onAddTagToPendingList,
  onRemoveTagFromPendingList,
  onAddNewTag,
}: TagManageModalContentProps) {
  const hasPendingChanges = pendingTags.length > 0;

  return (
    <div className="space-y-6">
      {/* スクロールエリアを追加して内容をスクロール可能にする */}
      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-6 pr-4">
          <ContentNameSection
            contentNames={contentNames}
            selectedContent={selectedContent}
            onSelectContent={onSelectContent}
          />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">現在のタグ</h3>
            <CurrentTagsList
              currentTags={currentTags}
              onRemoveTag={onRemoveTagFromCurrentList}
            />
          </div>

          {hasPendingChanges && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">追加するタグ</h3>
              <PendingTagsList
                pendingTags={pendingTags}
                onRemoveTag={onRemoveTagFromPendingList}
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
                onSelectTag={onAddTagToPendingList}
                onAddNewTag={onAddNewTag}
              />
            </TabsContent>

            <TabsContent value="search">
              <CategoryTagSearch
                onSelectTag={onAddTagToPendingList}
                onAddNewTag={onAddNewTag}
              />
            </TabsContent>

            <TabsContent value="official">
              <OfficialTagsSection
                officialTags={officialTags}
                selectedTags={selectedTags}
                onSelectTag={onSelectTag}
                onUnselectTag={onUnselectTag}
              />
            </TabsContent>
          </Tabs>

          <PreviousTags
            previousTags={previousTags}
            onSelectTag={onAddTagToPendingList}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
