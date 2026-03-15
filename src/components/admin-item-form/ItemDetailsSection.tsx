

import React from 'react';
import { TitleSection } from './sections/TitleSection';
import { ContentSection } from './sections/ContentSection';
import { ItemTypeSection } from './sections/ItemTypeSection';
import { TagsSection } from './sections/TagsSection';
import { TagInput } from '@/components/TagInput';

interface ItemFormData {
  title: string;
  description: string;
  category: string;
  content_name: string | null;
  characterTag?: string | null;
  typeTag?: string | null;
  seriesTag?: string | null;
  price: string;
  [key: string]: any;
}

interface ItemDetailsSectionProps {
  formData: ItemFormData;
  onUpdate: (updates: Partial<ItemFormData>) => void;
  selectedTags?: string[];
  onTagsChange?: (tags: string[]) => void;
}

export function ItemDetailsSection({ formData, onUpdate, selectedTags = [], onTagsChange }: ItemDetailsSectionProps) {
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
      {onTagsChange && (
        <div className="pt-2 border-t border-border">
          <TagInput
            selectedTags={selectedTags}
            onTagsChange={onTagsChange}
          />
        </div>
      )}
    </div>
  );
}
