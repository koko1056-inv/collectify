
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { TagInput } from "../TagInput";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { TagCategory, ItemTag } from "@/types/tag";

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  isUserItem?: boolean;
  onTagsSelect?: (tags: string[]) => void;
}

const TAG_CATEGORIES = {
  character: "キャラ・人物名",
  type: "グッズタイプ",
  series: "グッズシリーズ"
} as const;

export function TagDialog({ isOpen, onClose, itemId, isUserItem = false, onTagsSelect }: TagDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<TagCategory>("character");
  const { toast } = useToast();

  const { data: currentTags = [] } = useQuery<ItemTag[]>({
    queryKey: ["item-tags", itemId, isUserItem],
    queryFn: async () => {
      if (!itemId) return [];
      
      const { data, error } = await supabase
        .from(isUserItem ? "user_item_tags" : "item_tags")
        .select(`
          id,
          tag_id,
          tags:tags (
            id,
            name,
            category,
            created_at
          )
        `)
        .eq(isUserItem ? "user_item_id" : "official_item_id", itemId);
      
      if (error) throw error;
      return (data || []) as ItemTag[];
    },
    enabled: !!itemId,
  });

  const handleAddTags = () => {
    if (selectedTags.length === 0) {
      toast({
        title: "タグを選択してください",
        description: "フィルタリングするタグを1つ以上選択してください。",
        variant: "default",
      });
      return;
    }

    if (onTagsSelect) {
      onTagsSelect(selectedTags);
    }
    
    toast({
      title: "タグを追加しました",
      description: "選択したタグをフィルターに追加しました。",
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>タグの追加</DialogTitle>
        </DialogHeader>
        <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as TagCategory)}>
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(TAG_CATEGORIES).map(([key, label]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className="data-[state=active]:bg-black data-[state=active]:text-white font-medium text-sm"
              >
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
        <div className="mt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleAddTags}>
            追加する
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
