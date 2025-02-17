
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ItemImageEditor } from "./ItemImageEditor";
import { ContentNameSection } from "./ContentNameSection";
import { CreatorSection } from "./CreatorSection";
import { TagsSection } from "./TagsSection";
import { MemoriesSection } from "./MemoriesSection";
import { CategoryTagSelect } from "../tag/CategoryTagSelect";
import { useEffect } from "react";

interface ItemDetailsContentProps {
  image: string;
  title: string;
  tags?: Array<{ tags: { id: string; name: string; category?: string; } | null; }>;
  memories?: any[];
  isUserItem?: boolean;
  isEditing: boolean;
  editedData: any;
  setEditedData: (data: any) => void;
  contentName?: string | null;
  releaseDate?: string;
  createdBy?: string | null;
}

export function ItemDetailsContent({
  image,
  title,
  tags = [],
  memories = [],
  isUserItem = false,
  isEditing,
  editedData,
  setEditedData,
  contentName,
  releaseDate,
  createdBy,
}: ItemDetailsContentProps) {
  const handleImageUpdate = (newImageUrl: string) => {
    setEditedData({ ...editedData, image: newImageUrl });
  };

  // タグの初期値をセット
  useEffect(() => {
    if (tags.length > 0) {
      const typeTag = tags.find(tag => tag.tags?.category === 'type')?.tags?.name;
      const characterTag = tags.find(tag => tag.tags?.category === 'character')?.tags?.name;
      const seriesTag = tags.find(tag => tag.tags?.category === 'series')?.tags?.name;

      setEditedData(prev => ({
        ...prev,
        typeTag,
        characterTag,
        seriesTag,
      }));
    }
  }, [tags, setEditedData]);

  return (
    <ScrollArea className="flex-1 px-6">
      <div className="space-y-4 bg-white">
        <ItemImageEditor
          image={isEditing ? editedData.image : image}
          title={title}
          isEditing={isEditing}
          onImageUpdate={handleImageUpdate}
        />

        {!isUserItem && (
          <div className="space-y-2">
            <ContentNameSection
              isEditing={isEditing}
              editedData={editedData}
              setEditedData={setEditedData}
              contentName={contentName}
            />
            
            {isEditing && (
              <div className="space-y-4 mt-4">
                <CategoryTagSelect
                  category="character"
                  label="キャラクター・人物名"
                  value={editedData.characterTag}
                  onChange={(value) => setEditedData({ ...editedData, characterTag: value })}
                />
                <CategoryTagSelect
                  category="type"
                  label="グッズタイプ"
                  value={editedData.typeTag}
                  onChange={(value) => setEditedData({ ...editedData, typeTag: value })}
                />
                <CategoryTagSelect
                  category="series"
                  label="グッズシリーズ"
                  value={editedData.seriesTag}
                  onChange={(value) => setEditedData({ ...editedData, seriesTag: value })}
                />
              </div>
            )}
            
            <CreatorSection
              isEditing={isEditing}
              createdBy={createdBy}
            />

            {!isEditing && releaseDate && (
              <div className="text-sm">
                <span className="font-medium">登録日: </span>
                <span>{format(new Date(releaseDate), 'yyyy/MM/dd')}</span>
              </div>
            )}
          </div>
        )}

        {!isEditing && (
          <TagsSection
            isEditing={isEditing}
            tags={tags}
            editedData={editedData}
            setEditedData={setEditedData}
          />
        )}

        {!isUserItem && isEditing && (
          <TagsSection
            isEditing={isEditing}
            tags={tags}
            editedData={editedData}
            setEditedData={setEditedData}
          />
        )}

        {isUserItem && (
          <MemoriesSection memories={memories} />
        )}
      </div>
    </ScrollArea>
  );
}
