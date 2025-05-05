
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
  // 現在のタグ値を取得する関数
  const getCurrentTagValue = (category: string) => {
    // まず保留中の更新からタグ値を探す
    const pendingUpdate = pendingUpdates.find(u => u.category === category);
    if (pendingUpdate !== undefined) return pendingUpdate.value;
    
    // 保留中の更新がなければ現在のタグから探す
    const currentTag = currentTags.find(tag => tag.tags?.category === category);
    return currentTag?.tags?.name || null;
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <CategoryTagSelect
        category="character"
        label="キャラ・人物名"
        value={getCurrentTagValue("character")}
        onChange={onTagChange("character")}
      />
      <CategoryTagSelect
        category="type"
        label="グッズタイプ"
        value={getCurrentTagValue("type")}
        onChange={onTagChange("type")}
      />
      <CategoryTagSelect
        category="series"
        label="グッズシリーズ"
        value={getCurrentTagValue("series")}
        onChange={onTagChange("series")}
      />
    </div>
  );
}
