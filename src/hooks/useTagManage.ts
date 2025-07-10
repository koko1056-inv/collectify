import { useCallback } from "react";
import { TagUpdate } from "@/types/tag";
import { useCurrentTags } from "./tag-manage/useCurrentTags";
import { useOfficialTags } from "./tag-manage/useOfficialTags";
import { useContentName } from "./tag-manage/useContentName";
import { useTagUpdates } from "./tag-manage/useTagUpdates";
import { useTagSubmit } from "./tag-manage/useTagSubmit";

export function useTagManage(
  isOpen: boolean,
  itemIds: string[],
  isUserItem: boolean,
  onClose: () => void,
  onSubmit?: (updates: TagUpdate[]) => Promise<void>
) {
  const { currentTags, isLoading } = useCurrentTags(isOpen, itemIds, isUserItem);
  const { officialTags } = useOfficialTags(isOpen, itemIds, isUserItem);
  const { contentName, setContentName } = useContentName(isOpen, itemIds, isUserItem);
  const { pendingUpdates, handleTagChange } = useTagUpdates(isOpen);
  const { handleSubmit: handleTagSubmit } = useTagSubmit(itemIds, isUserItem, onClose, onSubmit);

  // コンテンツ名変更ハンドラ
  const handleContentChange = useCallback((newContentName: string | null) => {
    console.log(`Setting content name to: ${newContentName}`);
    setContentName(newContentName);
  }, [setContentName]);

  // 保存ハンドラ
  const handleSubmit = useCallback(async () => {
    console.log('[useTagManage] handleSubmit called with pendingUpdates:', pendingUpdates);
    console.log('[useTagManage] handleSubmit called with contentName:', contentName);
    console.log('[useTagManage] handleSubmit called with currentTags:', currentTags);
    await handleTagSubmit(pendingUpdates, contentName, currentTags);
  }, [handleTagSubmit]); // pendingUpdatesを依存配列から除去

  return {
    currentTags,
    pendingUpdates,
    contentName,
    officialTags,
    isLoading,
    handleTagChange,
    handleContentChange,
    handleSubmit
  };
}