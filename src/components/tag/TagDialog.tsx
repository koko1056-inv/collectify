
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { TagInput } from "../TagInput";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TagCategory } from "@/types/tag";

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  isUserItem?: boolean;
}

const TAG_CATEGORIES = {
  character: "キャラクター・人物名",
  type: "グッズタイプ",
  series: "グッズシリーズ"
} as const;

export function TagDialog({ isOpen, onClose, itemId, isUserItem = false }: TagDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<TagCategory>("character");

  const { data: currentTags = [] } = useQuery({
    queryKey: ["item-tags", itemId, isUserItem],
    queryFn: async () => {
      if (!itemId) return [];
      
      const { data, error } = await supabase
        .from(isUserItem ? "user_item_tags" : "item_tags")
        .select(`
          tag_id,
          tags (
            id,
            name,
            category
          )
        `)
        .eq(isUserItem ? "user_item_id" : "official_item_id", itemId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!itemId, // itemIdが存在する場合のみクエリを実行
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>タグの追加</DialogTitle>
        </DialogHeader>
        <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as TagCategory)}>
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(TAG_CATEGORIES).map(([key, label]) => (
              <TabsTrigger key={key} value={key}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.keys(TAG_CATEGORIES).map((category) => (
            <TabsContent key={category} value={category}>
              <TagInput
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                itemIds={itemId ? [itemId] : []}
                onClose={onClose}
                category={category as TagCategory}
              />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
