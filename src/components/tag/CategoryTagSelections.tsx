
import { CategoryTagSelect } from "./CategoryTagSelect";
import { TagUpdate } from "@/types/tag";
import { SimpleItemTag } from "@/utils/tag/types";

export interface CategoryTagSelectionsProps {
  currentTags: SimpleItemTag[];
  pendingUpdates: TagUpdate[];
  onTagChange: (category: string) => (value: string | null) => void;
}

export function CategoryTagSelections({ 
  currentTags, 
  pendingUpdates, 
  onTagChange 
}: CategoryTagSelectionsProps) {
  // currentTagsからカテゴリー別の現在の値を取得
  const getCurrentTagName = (category: string): string | null => {
    const tag = currentTags.find(tag => tag.tags.category === category);
    return tag ? tag.tags.name : null;
  };
  
  return (
    <div className="space-y-3 sm:space-y-4">
      <CategoryTagSelect
        category="character"
        label="キャラ・人物名"
        value={
          pendingUpdates.find(u => u.category === 'character')?.value ||
          getCurrentTagName('character')
        }
        onChange={onTagChange("character")}
      />
      <CategoryTagSelect
        category="type"
        label="グッズタイプ"
        value={
          pendingUpdates.find(u => u.category === 'type')?.value ||
          getCurrentTagName('type')
        }
        onChange={onTagChange("type")}
      />
      <CategoryTagSelect
        category="series"
        label="グッズシリーズ"
        value={
          pendingUpdates.find(u => u.category === 'series')?.value ||
          getCurrentTagName('series')
        }
        onChange={onTagChange("series")}
      />
    </div>
  );
}
