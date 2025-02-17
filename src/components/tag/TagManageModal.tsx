
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTagsForItem } from "@/utils/tag-operations";
import { ItemTag } from "@/types/tag";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CategoryTagSelect } from "./CategoryTagSelect";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  itemTitle?: string;
  isUserItem?: boolean;
  isCategory?: boolean;
}

export function TagManageModal({ 
  isOpen, 
  onClose, 
  itemIds = [],
  itemTitle,
  isUserItem = false,
  isCategory = false 
}: TagManageModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
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

  const handleTagChange = async (category: string) => async (value: string | null) => {
    if (!value || !itemIds.length) return;

    try {
      // 同じカテゴリの古いタグを削除
      const oldTag = currentTags.find(tag => tag.tags?.category === category);
      if (oldTag) {
        await supabase
          .from(isUserItem ? "user_item_tags" : "item_tags")
          .delete()
          .eq("tag_id", oldTag.tag_id)
          .eq(isUserItem ? "user_item_id" : "official_item_id", itemIds[0]);
      }

      // 新しいタグを追加
      await supabase
        .from(isUserItem ? "user_item_tags" : "item_tags")
        .insert({
          [isUserItem ? "user_item_id" : "official_item_id"]: itemIds[0],
          tag_id: value
        });

      await queryClient.invalidateQueries({ 
        queryKey: ["current-tags", itemIds]
      });

      toast({
        title: "タグを更新しました",
        description: "アイテムのタグが正常に更新されました。",
      });
    } catch (error) {
      console.error("Failed to update tag:", error);
      toast({
        title: "エラー",
        description: "タグの更新中にエラーが発生しました。",
        variant: "destructive",
      });
    }
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
            <div className="space-y-4">
              <CategoryTagSelect
                category="character"
                label="キャラクター・人物名"
                value={currentTags.find(tag => tag.tags?.category === 'character')?.tags?.id || null}
                onChange={handleTagChange("character")}
              />
              <CategoryTagSelect
                category="type"
                label="グッズタイプ"
                value={currentTags.find(tag => tag.tags?.category === 'type')?.tags?.id || null}
                onChange={handleTagChange("type")}
              />
              <CategoryTagSelect
                category="series"
                label="グッズシリーズ"
                value={currentTags.find(tag => tag.tags?.category === 'series')?.tags?.id || null}
                onChange={handleTagChange("series")}
              />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
