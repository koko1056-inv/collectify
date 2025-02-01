import { ScrollArea } from "@/components/ui/scroll-area";
import { CardImage } from "../collection/CardImage";
import { TagList } from "../collection/TagList";
import { MemoriesList } from "../collection/MemoriesList";
import { QuantityInput } from "./QuantityInput";
import { ItemDetailsForm } from "./ItemDetailsForm";

interface ItemDetailsContentProps {
  image: string;
  title: string;
  tags: any[];
  memories: any[];
  isUserItem: boolean;
  isEditing: boolean;
  editedData: any;
  setEditedData: (data: any) => void;
}

export function ItemDetailsContent({
  image,
  title,
  tags,
  memories,
  isUserItem,
  isEditing,
  editedData,
  setEditedData,
}: ItemDetailsContentProps) {
  return (
    <ScrollArea className="flex-1 px-1">
      <div className="space-y-4">
        <div className="w-full aspect-square relative">
          <CardImage image={image} title={title} />
        </div>

        {isUserItem && tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">タグ</h3>
            <TagList tags={tags} />
          </div>
        )}

        <div className="space-y-2">
          {isUserItem && (
            <QuantityInput
              isEditing={isEditing}
              quantity={editedData.quantity}
              onChange={(value) => setEditedData({ ...editedData, quantity: value })}
            />
          )}
          <ItemDetailsForm
            isEditing={isEditing}
            editedData={editedData}
            setEditedData={setEditedData}
            isUserItem={isUserItem}
          />
        </div>

        {isUserItem && memories.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">思い出</h3>
            <MemoriesList memories={memories} />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}