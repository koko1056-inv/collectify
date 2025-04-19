
import React from 'react';
import { TitleSection } from './sections/TitleSection';
import { ContentSection } from './sections/ContentSection';
import { ItemTypeSection } from './sections/ItemTypeSection';
import { TagsSection } from './sections/TagsSection';
import type { ItemFormData } from '@/types';

interface ItemDetailsSectionProps {
  formData: ItemFormData;
  onUpdate: (updates: Partial<ItemFormData>) => void;
}

export function ItemDetailsSection({ formData, onUpdate }: ItemDetailsSectionProps) {
  return (
    <div className="space-y-6">
      <TitleSection 
        title={formData.title}
        onUpdate={onUpdate}
      />
      <ContentSection 
        content={formData.content_name}
        onUpdate={onUpdate}
      />
      <ItemTypeSection 
        itemType={formData.item_type}
        onUpdate={onUpdate}
      />
      <TagsSection 
        tags={formData.tags}
        onUpdate={onUpdate}
      />
    </div>
  );
}
