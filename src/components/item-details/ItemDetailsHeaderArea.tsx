
import { ItemImageEditor } from "./ItemImageEditor";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ItemDetailsHeaderAreaProps {
  image: string;
  title: string;
  isEditing: boolean;
  editedData: any;
  setEditedData: (data: any) => void;
}

export function ItemDetailsHeaderArea({
  image,
  title,
  isEditing,
  editedData,
  setEditedData,
}: ItemDetailsHeaderAreaProps) {
  const handleImageUpdate = (newImageUrl: string) => {
    setEditedData({ ...editedData, image: newImageUrl });
  };

  return (
    <div className="flex flex-col items-center pt-4 pb-2">
      <ItemImageEditor
        image={isEditing ? editedData.image : image}
        title={title}
        isEditing={isEditing}
        onImageUpdate={handleImageUpdate}
      />
      <DialogHeader>
        <DialogTitle className="text-xl font-bold mt-2">{title}</DialogTitle>
      </DialogHeader>
    </div>
  );
}
