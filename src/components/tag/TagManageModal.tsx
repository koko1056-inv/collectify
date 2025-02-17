
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagInput } from "@/components/TagInput";
import { useQuery } from "@tanstack/react-query";
import { getTagsForItem } from "@/utils/tag-operations";
import { ItemTag, TagCategory } from "@/types/tag";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  itemTitle?: string;
  isUserItem?: boolean;
  isCategory?: boolean;
}

const TAG_CATEGORIES = {
  character: "キャラクター・人物名",
  type: "グッズタイプ",
  series: "グッズシリーズ"
} as const;

export function TagManageModal({ 
  isOpen, 
  onClose, 
  itemIds = [],
  itemTitle,
  isUserItem = false,
  isCategory = false 
}: TagManageModalProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<keyof typeof TAG_CATEGORIES>("character");
  
  const title = itemIds.length === 1 
    ? `${isCategory ? "カテゴリの管理" : "タグの管理"}${itemTitle ? `: ${itemTitle}` : ''}`
    : `${itemIds.length}個のアイテムのタグを管理`;

  const { data: currentTags = [] } = useQuery<ItemTag[]>({
    queryKey: ["current-tags", itemIds, isUserItem],
    queryFn: () => {
      if (!itemIds.length) return Promise.resolve([]);
      return getTagsForItem(itemIds[0], isUserItem);
    },
  });

  const tagNames = currentTags
    .map(tag => tag.tags?.name)
    .filter((name): name is string => name !== undefined);

  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {title}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh]">
          <div className="space-y-6 p-4">
            <Tabs defaultValue="character" value={activeCategory} onValueChange={(value) => setActiveCategory(value as keyof typeof TAG_CATEGORIES)}>
              <TabsList className="grid w-full grid-cols-3">
                {Object.entries(TAG_CATEGORIES).map(([key, label]) => (
                  <TabsTrigger key={key} value={key}>
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.keys(TAG_CATEGORIES).map((category) => (
                <TabsContent key={category} value={category} className="mt-4">
                  <TagInput 
                    selectedTags={tagNames}
                    onTagsChange={handleTagsChange}
                    itemIds={itemIds}
                    onClose={onClose}
                    category={category}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
