
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

  const modalTitle = itemTitle ? `${title}: ${itemTitle}` : title;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
