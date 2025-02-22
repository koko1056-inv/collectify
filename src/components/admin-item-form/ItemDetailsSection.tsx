
import { TitleSection } from "./sections/TitleSection";
import { ContentSection } from "./sections/ContentSection";
import { ItemTypeSection } from "./sections/ItemTypeSection";
import { TagsSection } from "./sections/TagsSection";

interface ItemDetailsSectionProps {
  formData: {
    title: string;
    description: string;
    content_name?: string | null;
    item_type?: string;
    characterTag?: string | null;
    typeTag?: string | null;
    seriesTag?: string | null;
  };
  setFormData: (data: any) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}

export function ItemDetailsSection({
  formData,
  setFormData,
  selectedTags,
  setSelectedTags,
}: ItemDetailsSectionProps) {
  const handleTagChange = (category: string, value: string | null) => {
    const categoryMap = {
      character: 'characterTag',
      type: 'typeTag',
      series: 'seriesTag',
    } as const;

    const fieldName = categoryMap[category as keyof typeof categoryMap];
    setFormData({ 
      ...formData, 
      [fieldName]: value 
    });
    
    if (value) {
      setSelectedTags([...selectedTags, value]);
    }
  };

  return (
    <>
      <TitleSection
        title={formData.title}
        description={formData.description}
        onTitleChange={(title) => setFormData({ ...formData, title })}
        onDescriptionChange={(description) => setFormData({ ...formData, description })}
      />

      <ContentSection
        contentName={formData.content_name}
        onContentChange={(content_name) => setFormData({ ...formData, content_name })}
      />

      <ItemTypeSection
        itemType={formData.item_type}
        onItemTypeChange={(item_type) => setFormData({ ...formData, item_type })}
      />

      <TagsSection
        characterTag={formData.characterTag}
        typeTag={formData.typeTag}
        seriesTag={formData.seriesTag}
        onTagChange={handleTagChange}
      />
    </>
  );
}
