
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContentSection } from "./sections/ContentSection";
import { ItemTypeSection } from "./sections/ItemTypeSection";
import { TitleSection } from "./sections/TitleSection";
import { TagsSection } from "./sections/TagsSection";
import { useState } from "react";

interface FormData {
  title: string;
  description: string;
  content_name?: string | null;
  item_type?: string;
  characterTag?: string | null;
  typeTag?: string | null;
  seriesTag?: string | null;
}

interface ItemDetailsSectionProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}

export function ItemDetailsSection({
  formData,
  setFormData,
  selectedTags,
  setSelectedTags,
}: ItemDetailsSectionProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleTagChange = (category: string, value: string | null) => {
    setFormData({ 
      ...formData, 
      [`${category}Tag`]: value
    });
    console.log(`Updated ${category}Tag to:`, value);
  };

  return (
    <div className="space-y-4">
      <TitleSection
        title={formData.title}
        onChange={handleChange}
      />

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          placeholder="アイテムの詳細な説明を入力してください"
        />
      </div>

      <ContentSection
        contentName={formData.content_name || ""}
        onChange={handleChange}
      />

      <ItemTypeSection
        itemType={formData.item_type || ""}
        onChange={handleChange}
      />

      <TagsSection
        characterTag={formData.characterTag}
        typeTag={formData.typeTag}
        seriesTag={formData.seriesTag}
        onTagChange={handleTagChange}
      />
    </div>
  );
}
