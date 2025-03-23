
import { CategoryTagSelect } from "./CategoryTagSelect";
import { TagUpdate } from "@/types/tag";
import { SimpleItemTag } from "@/utils/tag/types";

interface CategoryTagSelectionsProps {
  currentTags: SimpleItemTag[];
  pendingUpdates: TagUpdate[];
  onTagChange: (category: string) => (value: string | null) => void;
}

export function CategoryTagSelections({ 
  currentTags, 
  pendingUpdates, 
  onTagChange 
}: CategoryTagSelectionsProps) {
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
