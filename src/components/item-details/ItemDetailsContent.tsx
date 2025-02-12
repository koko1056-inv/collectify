import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ItemImageEditor } from "./ItemImageEditor";
import { ContentNameSection } from "./ContentNameSection";
import { CreatorSection } from "./CreatorSection";
import { TagsSection } from "./TagsSection";
import { MemoriesSection } from "./MemoriesSection";

interface ItemDetailsContentProps {
  image: string;
  title: string;
  tags?: Array<{ tags: { id: string; name: string; } | null; }>;
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

            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">アイテム情報</div>
                  <div className="text-gray-600">
                    このアイテムは
                    {createdBy && (
                      <span className="font-medium"> コミュニティメンバー </span>
                    )}
                    {!createdBy && (
                      <span className="font-medium"> 不明なユーザー </span>
                    )}
                    によって登録されました。
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isUserItem && isEditing && (
          <div className="space-y-4">
            <ContentNameSection
              isEditing={isEditing}
              editedData={editedData}
              setEditedData={setEditedData}
              contentName={contentName}
            />

            <TagsSection
              isEditing={isEditing}
              tags={tags}
              editedData={editedData}
              setEditedData={setEditedData}
            />
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

        {isUserItem && (
          <MemoriesSection memories={memories} />
        )}
      </div>
    </ScrollArea>
  );
}
