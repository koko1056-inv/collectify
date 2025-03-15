
import { TagUpdate } from "@/types/tag";
import { CategoryTagSelect } from "./CategoryTagSelect";
import { SimpleItemTag } from "@/utils/tag/item-tag-operations";

interface TagCategorySelectsProps {
  currentTags: SimpleItemTag[];
  pendingUpdates: TagUpdate[];
  onTagChange: (category: string) => (value: string | null) => void;
}

export function TagCategorySelects({ 
  currentTags, 
  pendingUpdates, 
  onTagChange 
}: TagCategorySelectsProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <CategoryTagSelect
        category="character"
        label="キャラ・人物名"
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
    </div>
  );
}
