
import { ItemLabelValue } from "./ItemLabelValue";
import { SimpleItemTag } from "@/utils/tag/types";

interface ItemDetailInfoProps {
  tags: SimpleItemTag[];
  price?: string;
  description?: string;
}

export function ItemDetailInfo({ tags, price, description }: ItemDetailInfoProps) {
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
      
      {price && (
        <ItemLabelValue 
          icon="price" 
          label="価格" 
          value={`¥${price}`} 
        />
      )}

      {description && (
        <div className="space-y-1">
          <span className="text-xs text-gray-500">説明</span>
          <p className="text-sm whitespace-pre-wrap">{description}</p>
        </div>
      )}
    </div>
  );
}
