
import { ScrollArea } from "@/components/ui/scroll-area";
import { SimpleItemTag } from "@/utils/tag/types";
import { ItemImageEditor } from "./ItemImageEditor";
import { ContentNameSection } from "./ContentNameSection";
import { CreatorSection } from "./CreatorSection";
import { MemoriesSection } from "./MemoriesSection";
import { ItemNoteField } from "./ItemNoteField";
import { ItemQuantityField } from "./ItemQuantityField";

interface ItemDetailsContentProps {
  image: string;
  title: string;
  tags?: SimpleItemTag[];
  memories?: any[];
  isUserItem?: boolean;
  isEditing: boolean;
  editedData: any;
  setEditedData: (data: any) => void;
  contentName?: string | null;
  releaseDate?: string;
  createdBy?: string | null;
  description?: string;
  price?: string;
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
  description,
  price
}: ItemDetailsContentProps) {
  return (
    <ScrollArea className="flex-1 h-[calc(100vh-250px)]">
      <div className="space-y-4 bg-white pb-6 pt-2 px-6">
        <div className="w-full aspect-square relative overflow-hidden rounded-lg bg-white">
          <ItemImageEditor
            image={isEditing ? editedData.image : image}
            title={title}
            isEditing={isEditing}
            onImageUpdate={(url) => setEditedData({ ...editedData, image: url })}
          />
        </div>

        {isUserItem && (
          <div className="space-y-4">
            <ItemQuantityField
              isEditing={isEditing}
              quantity={editedData.quantity}
              onChange={(value) => setEditedData({ ...editedData, quantity: value })}
            />
            
            <ItemNoteField
              isEditing={isEditing}
              note={editedData.note}
              onChange={(value) => setEditedData({ ...editedData, note: value })}
              memories={memories}
            />
          </div>
        )}

        <MemoriesSection memories={memories} />

        {isUserItem && isEditing && (
          <ContentNameSection
            isEditing={isEditing}
            editedData={editedData}
            setEditedData={setEditedData}
            contentName={editedData.content_name ?? contentName}
          />
        )}
      </div>
    </ScrollArea>
  );
}
