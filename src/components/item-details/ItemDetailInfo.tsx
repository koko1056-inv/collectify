
import { ItemLabelValue } from "./ItemLabelValue";
import { SimpleItemTag } from "@/utils/tag/types";

interface ItemDetailInfoProps {
  tags: SimpleItemTag[];
}

export function ItemDetailInfo({ tags }: ItemDetailInfoProps) {
  // アイテムタイプのタグを取得
  const typeTag = tags.find(tag => tag.tags?.category === 'type')?.tags?.name || '';
  
  return (
    <div className="space-y-3 py-3 border-b border-gray-100">
      {typeTag && (
        <ItemLabelValue 
          icon="tag" 
          label="カテゴリー" 
          value={typeTag} 
        />
      )}
    </div>
  );
}
