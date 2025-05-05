
import { CategoryTagSelections } from "./CategoryTagSelections";
import { CurrentTagsList } from "./CurrentTagsList";
import { PendingTagsList } from "./PendingTagsList";
import { ContentNameSection } from "./ContentNameSection";
import { OfficialTagsSection } from "./OfficialTagsSection";
import { TagUpdate } from "@/types/tag";
import { removeTagFromItem } from "@/utils/tag/tag-mutations";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { SimpleItemTag } from "@/utils/tag/types";

interface TagManageModalContentProps {
  currentTags: SimpleItemTag[];
  pendingUpdates: TagUpdate[];
  onTagChange: (category: string) => (value: string | null) => void;
  itemIds: string[];
  isUserItem?: boolean;
  contentName?: string | null;
  onContentChange?: (contentName: string | null) => void;
  officialTags?: SimpleItemTag[];
}

export function TagManageModalContent({
  currentTags,
  pendingUpdates,
  onTagChange,
  itemIds,
  isUserItem = false,
  contentName,
  onContentChange,
  officialTags = []
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
      
      {isUserItem && officialTags && officialTags.length > 0 && (
        <OfficialTagsSection officialTags={officialTags} />
      )}
      
      {onContentChange && (
        <ContentNameSection 
          contentName={contentName || null} 
          onContentChange={onContentChange} 
        />
      )}
      
      <CategoryTagSelections 
        currentTags={currentTags}
        pendingUpdates={pendingUpdates}
        onTagChange={onTagChange}
      />

      <PendingTagsList pendingUpdates={pendingUpdates} />
    </div>
  );
}
