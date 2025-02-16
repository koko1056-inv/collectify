
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useItemDetailsForm } from "./item-details/useItemDetailsForm";
import { ItemDetailsHeader } from "./item-details/ItemDetailsHeader";
import { ItemDetailsContent } from "./item-details/ItemDetailsContent";
import { ItemDetailsFooter } from "./item-details/ItemDetailsFooter";
import { useAuth } from "@/contexts/AuthContext";

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
  isOriginalItem?: boolean;
  quantity?: number;
  userId?: string;
  createdBy?: string | null;
  contentName?: string | null;
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
  isOriginalItem = false,
  quantity = 1,
  userId,
  createdBy,
  contentName,
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
    queryKey: ["user-item-tags", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_item_tags")
        .select(`
          tag_id,
          tags (
            id,
            name
          )
        `)
        .eq("user_item_id", itemId);
      if (error) throw error;
      return data;
    },
    enabled: isUserItem,
  });

  const { data: officialTags = [] } = useQuery({
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
    enabled: !isUserItem,
  });

  // アイテムのクリエイター情報を取得
  const { data: itemDetails } = useQuery({
    queryKey: ["item-details", itemId],
    queryFn: async () => {
      if (isUserItem) return null;
      const { data, error } = await supabase
        .from("official_items")
        .select("created_by")
        .eq("id", itemId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isUserItem,
  });

  // 実際のcreatedBy値を使用
  const effectiveCreatedBy = itemDetails?.created_by || createdBy;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] h-[90vh] flex flex-col">
        <ItemDetailsHeader
          isEditing={isEditing}
          title={title}
          editedData={editedData}
          setEditedData={setEditedData}
        />
        
        <ItemDetailsContent
          image={image}
          title={title}
          tags={isUserItem ? tags : officialTags}
          memories={memories}
          isUserItem={isUserItem}
          isEditing={isEditing}
          editedData={editedData}
          setEditedData={setEditedData}
          contentName={isUserItem ? undefined : contentName}
          releaseDate={releaseDate}
          createdBy={effectiveCreatedBy}
        />

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
