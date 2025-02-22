
import { CategoryTagSelect } from "./CategoryTagSelect";
import { CurrentTagsList } from "./CurrentTagsList";
import { PendingTagsList } from "./PendingTagsList";
import { ItemTag } from "@/utils/tag-operations";

interface TagUpdate {
  category: string;
  value: string | null;
}

interface TagManageModalContentProps {
  currentTags: ItemTag[];
  pendingUpdates: TagUpdate[];
  onTagChange: (category: string) => (value: string | null) => void;
}

export function TagManageModalContent({
  currentTags,
  pendingUpdates,
  onTagChange
}: TagManageModalContentProps) {
  return (
    <div className="space-y-4 sm:space-y-6 py-4">
      <CurrentTagsList currentTags={currentTags} />
      
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
