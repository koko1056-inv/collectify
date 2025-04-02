
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TagManageModalContent } from "./TagManageModalContent";
import { TagManageDialogHeader } from "./TagManageDialogHeader";
import { TagManageDialogFooter } from "./TagManageDialogFooter";
import { useTagManage } from "./useTagManage";
import { TagUpdate } from "@/types/tag";
import { useEffect } from "react";

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

  // 依存配列にisOpenを追加して、modalが開かれた時だけ取得する
  useEffect(() => {
    // コンポーネントがマウントされたときに何かしたい場合はここに記述
  }, [isOpen, itemIds]);

  const modalTitle = itemTitle ? `${title}: ${itemTitle}` : title;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <TagManageDialogHeader title={modalTitle} />
        
        {isLoading ? (
          <div className="py-4 text-center">読み込み中...</div>
        ) : (
          <>
            <TagManageModalContent
              currentTags={currentTags || []}
              pendingUpdates={pendingUpdates || []}
              onTagChange={handleTagChange}
              itemIds={itemIds}
              isUserItem={isUserItem}
              contentName={contentName}
              onContentChange={handleContentChange}
              officialTags={officialTags || []}
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
