
import React from 'react';
import { TitleSection } from './sections/TitleSection';
import { ContentSection } from './sections/ContentSection';
import { ItemTypeSection } from './sections/ItemTypeSection';
import { TagsSection } from './sections/TagsSection';

interface ItemFormData {
  title: string;
  description: string;
  category: string;
  content_name: string | null;
  characterTag?: string | null;
  typeTag?: string | null;
  seriesTag?: string | null;
  price: string;
  [key: string]: any; // 追加のプロパティに対応するため
}

interface ItemDetailsSectionProps {
  formData: ItemFormData;
  onUpdate: (updates: Partial<ItemFormData>) => void;
}

export function ItemDetailsSection({ formData, onUpdate }: ItemDetailsSectionProps) {
  return (
    <div className="space-y-6">
      <TitleSection 
        title={formData.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
      />
      <ContentSection 
        contentName={formData.content_name}
        onChange={(e) => onUpdate({ content_name: e.target.value })}
      />
      <ItemTypeSection 
        itemType={formData.item_type || ''}
        onChange={(e) => onUpdate({ item_type: e.target.value })}
      />
      <TagsSection 
        characterTag={formData.characterTag}
        typeTag={formData.typeTag}
        seriesTag={formData.seriesTag}
        contentName={formData.content_name}
        onTagChange={(category, value) => {
          const update = {};
          update[`${category}Tag`] = value;
          onUpdate(update);
        }}
      />
    </div>
  );
}
