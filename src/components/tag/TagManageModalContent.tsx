
import { CategoryTagSelect } from "./CategoryTagSelect";
import { CurrentTagsList } from "./CurrentTagsList";
import { PendingTagsList } from "./PendingTagsList";
import { ItemTag, removeTagFromItem } from "@/utils/tag-operations";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface TagUpdate {
  category: string;
  value: string | null;
}

interface TagManageModalContentProps {
  currentTags: ItemTag[];
  pendingUpdates: TagUpdate[];
  onTagChange: (category: string) => (value: string | null) => void;
  itemIds: string[];
  isUserItem?: boolean;
}

export function TagManageModalContent({
  currentTags,
  pendingUpdates,
  onTagChange,
  itemIds,
  isUserItem = false
}: TagManageModalContentProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleRemoveTag = async (tagId: string) => {
    try {
      for (const itemId of itemIds) {
        await removeTagFromItem(tagId, itemId, isUserItem);
      }

      await queryClient.invalidateQueries({ queryKey: ["current-tags", itemIds] });
      
      toast({
        title: "タグを削除しました",
        description: "タグが正常に削除されました。",
      });
    } catch (error) {
      console.error("Error removing tag:", error);
      toast({
        title: "エラー",
        description: "タグの削除中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 py-4">
      <CurrentTagsList 
        currentTags={currentTags} 
        onRemoveTag={handleRemoveTag}
      />
      
      <div className="space-y-3 sm:space-y-4">
        <CategoryTagSelect
          category="character"
          label="キャラクター・人物名"
          value={
            pendingUpdates.find(u => u.category === 'character')?.value ||
            currentTags.find(tag => tag.tags?.category === 'character')?.tags?.name ||
            null
          }
          onChange={onTagChange("character")}
        />
        <CategoryTagSelect
          category="type"
          label="グッズタイプ"
          value={
            pendingUpdates.find(u => u.category === 'type')?.value ||
            currentTags.find(tag => tag.tags?.category === 'type')?.tags?.name ||
            null
          }
          onChange={onTagChange("type")}
        />
        <CategoryTagSelect
          category="series"
          label="グッズシリーズ"
          value={
            pendingUpdates.find(u => u.category === 'series')?.value ||
            currentTags.find(tag => tag.tags?.category === 'series')?.tags?.name ||
            null
          }
          onChange={onTagChange("series")}
        />

        <PendingTagsList pendingUpdates={pendingUpdates} />
      </div>
    </div>
  );
}
