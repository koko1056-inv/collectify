
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TagManageModalContent } from "./TagManageModalContent";
import { TagManageDialogHeader } from "./TagManageDialogHeader";
import { TagManageDialogFooter } from "./TagManageDialogFooter";
import { useTagManage } from "@/hooks/useTagManage";
import { TagUpdate } from "@/types/tag";

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  title?: string;
  itemTitle?: string;
  isUserItem?: boolean;
  onSubmit?: (updates: TagUpdate[]) => Promise<void>;
}

export function TagManageModal({
  isOpen,
  onClose,
  itemIds,
  title = "タグ管理",
  itemTitle,
  isUserItem = false,
  onSubmit,
}: TagManageModalProps) {
  const {
    currentTags,
    pendingUpdates,
    contentName,
    officialTags,
    isLoading,
    handleTagChange,
    handleContentChange,
    handleSubmit
  } = useTagManage(isOpen, itemIds, isUserItem, onClose, onSubmit);

  // 複数アイテムの場合はカウントを表示、単一アイテムの場合はタイトルを表示
  const modalTitle = itemIds.length > 1 
    ? `${title} (${itemIds.length}件のアイテム)` 
    : itemTitle ? `${title}: ${itemTitle}` : title;

  console.log('[TagManageModal] =====RENDER START=====');
  console.log('[TagManageModal] Modal state:', {
    isOpen,
    itemIds: itemIds.length,
    currentTags: currentTags?.length,
    pendingUpdates: pendingUpdates?.length,
    contentName,
    onSubmit: !!onSubmit
  });
  console.log('[TagManageModal] Current tags detail:', currentTags);
  console.log('[TagManageModal] Pending updates detail:', pendingUpdates);
  console.log('[TagManageModal] =====RENDER END=====');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <TagManageDialogHeader title={modalTitle} />
        
        {isLoading ? (
          <div className="py-4 text-center">読み込み中...</div>
        ) : (
          <>
            <TagManageModalContent
              currentTags={currentTags}
              pendingUpdates={pendingUpdates}
              onTagChange={handleTagChange}
              itemIds={itemIds}
              isUserItem={isUserItem}
              contentName={contentName}
              onContentChange={handleContentChange}
              officialTags={isUserItem ? officialTags : []}
            />
            
            <TagManageDialogFooter 
              onCancel={onClose}
              onSubmit={handleSubmit}
              itemCount={itemIds.length}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
