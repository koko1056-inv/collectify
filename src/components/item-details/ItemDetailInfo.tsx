
import { ItemLabelValue } from "./ItemLabelValue";
import { format } from "date-fns";
import { SimpleItemTag } from "@/utils/tag/types";

interface ItemDetailInfoProps {
  releaseDate: string;
  tags: SimpleItemTag[];
}

export function ItemDetailInfo({ releaseDate, tags }: ItemDetailInfoProps) {
  // アイテムタイプのタグを取得
  const typeTag = tags.find(tag => tag.tags?.category === 'type')?.tags?.name || '';
  
  return (
    <div className="space-y-3 py-3 border-b border-gray-100">
      <ItemLabelValue 
        icon="calendar" 
        label="発売日" 
        value={format(new Date(releaseDate), 'yyyy-MM-dd')} 
      />
      
      {typeTag && (
        <ItemLabelValue 
          icon="tag" 
          label="カテゴリー" 
          value={typeTag} 
        />
      )}
      
      {tags.some(tag => tag.tags?.category === 'character') && (
        <ItemLabelValue 
          icon="star" 
          label="レア度" 
          value="一般" 
        />
      )}
    </div>
  );
}
