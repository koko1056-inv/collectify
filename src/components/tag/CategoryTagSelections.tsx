
import { CategoryTagSelect } from "./CategoryTagSelect";
import { TagUpdate } from "@/types/tag";
import { SimpleItemTag } from "@/utils/tag/types";
import { useEffect } from "react";

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
    if (pendingUpdate !== undefined) {
      console.log(`Pending update for ${category}:`, pendingUpdate.value);
      return pendingUpdate.value;
    }
    
    // 保留中の更新がなければ現在のタグから探す
    const currentTag = currentTags.find(tag => tag.tags?.category === category);
    if (currentTag && currentTag.tags) {
      console.log(`Current tag for ${category}:`, currentTag.tags.name);
      return currentTag.tags.name;
    }
    
    console.log(`No tag found for ${category}`);
    return null;
  };

  // デバッグ: 起動時に現在のタグ情報をログ出力
  useEffect(() => {
    console.log('CategoryTagSelections - Current tags:', currentTags);
    const characterTag = currentTags.find(tag => tag.tags?.category === 'character');
    const typeTag = currentTags.find(tag => tag.tags?.category === 'type');
    const seriesTag = currentTags.find(tag => tag.tags?.category === 'series');
    
    console.log('Character tag:', characterTag?.tags?.name);
    console.log('Type tag:', typeTag?.tags?.name);
    console.log('Series tag:', seriesTag?.tags?.name);
  }, [currentTags]);

  const characterValue = getCurrentTagValue("character");
  const typeValue = getCurrentTagValue("type");
  const seriesValue = getCurrentTagValue("series");
  
  console.log('CategoryTagSelections - Current values:', {
    character: characterValue,
    type: typeValue,
    series: seriesValue
  });

  return (
    <div className="space-y-3 sm:space-y-4">
      <CategoryTagSelect
        category="character"
        label="キャラ・人物名"
        value={characterValue}
        onChange={onTagChange("character")}
      />
      <CategoryTagSelect
        category="type"
        label="グッズタイプ"
        value={typeValue}
        onChange={onTagChange("type")}
      />
      <CategoryTagSelect
        category="series"
        label="グッズシリーズ"
        value={seriesValue}
        onChange={onTagChange("series")}
      />
    </div>
  );
}
