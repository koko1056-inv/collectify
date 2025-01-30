import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useItemDetailsForm } from "./item-details/useItemDetailsForm";
import { ItemDetailsHeader } from "./item-details/ItemDetailsHeader";
import { ItemDetailsContent } from "./item-details/ItemDetailsContent";
import { ItemDetailsFooter } from "./item-details/ItemDetailsFooter";
import { useAuth } from "@/contexts/AuthContext";
import { ContentNameSelect } from "./admin-item-form/ContentNameSelect";
import { Input } from "./ui/input";
import { TagInput } from "./TagInput";

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  image: string;
  price?: string;
  releaseDate?: string;
  description?: string;
  itemId: string;
  isUserItem?: boolean;
  quantity?: number;
  userId?: string;
  createdBy?: string | null;
  content?: string | null;
}

export function ItemDetailsModal({
  isOpen,
  onClose,
  title,
  image,
  price,
  releaseDate = new Date().toISOString().split('T')[0],
  description,
  itemId,
  isUserItem = false,
  quantity = 1,
  userId,
  createdBy,
  content,
}: ItemDetailsModalProps) {
  const { user } = useAuth();
  const isOwner = !userId || (user && user.id === userId);
  const canEdit = !isUserItem && user !== null;

  const {
    isEditing,
    isSaving,
    editedData,
    setIsEditing,
    setEditedData,
    handleSave,
    handleCancel,
  } = useItemDetailsForm({
    title,
    price,
    releaseDate,
    description,
    quantity,
    itemId,
    isUserItem,
    content,
    onEditComplete: () => setIsEditing(false),
  });

  const { data: memories = [] } = useQuery({
    queryKey: ["item-memories", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_memories")
        .select("*")
        .eq("user_item_id", itemId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isUserItem,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["item-tags", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_tags")
        .select(`
          tag_id,
          tags (
            id,
            name
          )
        `)
        .eq("official_item_id", itemId);
      if (error) throw error;
      return data;
    },
  });

  const selectedTags = tags.map(tag => tag.tags?.name || "");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] h-[90vh] flex flex-col">
        <div className="space-y-4 overflow-y-auto flex-1 p-4">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">タイトル</label>
                <Input
                  value={editedData.title}
                  onChange={(e) =>
                    setEditedData({ ...editedData, title: e.target.value })
                  }
                />
              </div>
              
              <div>
                <ContentNameSelect
                  type="content"
                  value={editedData.content || ""}
                  onChange={(value) =>
                    setEditedData({ ...editedData, content: value })
                  }
                  label="コンテンツ"
                />
              </div>

              <TagInput
                selectedTags={selectedTags}
                onTagsChange={(newTags) => {
                  // Handle tag changes here
                  console.log("Tags updated:", newTags);
                }}
              />
            </div>
          ) : (
            <>
              <ItemDetailsHeader
                title={title}
                editedData={editedData}
                setEditedData={setEditedData}
                isEditing={isEditing}
              />
              
              <ItemDetailsContent
                image={image}
                title={title}
                tags={tags}
                memories={memories}
                isUserItem={isUserItem}
                isEditing={isEditing}
                editedData={editedData}
                setEditedData={setEditedData}
                content={content}
              />
            </>
          )}
        </div>

        <ItemDetailsFooter
          isEditing={isEditing}
          isSaving={isSaving}
          onCancel={handleCancel}
          onSave={handleSave}
          onEdit={() => setIsEditing(true)}
          showEditButton={isOwner || canEdit}
        />
      </DialogContent>
    </Dialog>
  );
}