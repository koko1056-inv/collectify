
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { isItemInUserCollection } from "@/utils/tag/tag-queries";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { DialogContent } from "@/components/ui/dialog";
import { ModalHeader } from "./ModalHeader";
import { ItemDetailsContent } from "./ItemDetailsContent";
import { ItemDetailsActions } from "./ItemDetailsActions";

interface ItemDetailsModalContentProps {
  title: string;
  image: string;
  itemId: string;
  price?: string;
  releaseDate?: string;
  description?: string;
  isUserItem?: boolean;
  quantity?: number;
  userId?: string;
  createdBy?: string | null;
  contentName?: string | null;
  onClose: () => void;
  setIsDeleteConfirmOpen: (open: boolean) => void;
  setIsTagModalOpen: (open: boolean) => void;
}

export function ItemDetailsModalContent({
  title,
  image,
  itemId,
  price,
  releaseDate = new Date().toISOString().split('T')[0],
  description,
  isUserItem = false,
  quantity = 1,
  userId,
  createdBy,
  contentName,
  onClose,
  setIsDeleteConfirmOpen,
  setIsTagModalOpen,
}: ItemDetailsModalContentProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState({
    image,
    title,
    price,
    description,
    quantity,
    note: "",
    content_name: contentName ?? null,
  });

  // 編集データの初期化（ユーザーアイテムデータを含む）
  useEffect(() => {
    if (isUserItem && userId === user?.id) {
      const fetchUserItemDetails = async () => {
        const { data, error } = await supabase
          .from("user_items")
          .select("note")
          .eq("id", itemId)
          .single();

        if (error) {
          console.error("Error fetching user item details:", error);
          return;
        }

        setEditedData({
          image,
          title,
          price,
          description,
          quantity,
          note: data?.note ?? "",
          content_name: contentName ?? null
        });
      };

      fetchUserItemDetails();
    }
  }, [image, title, price, description, quantity, isUserItem, userId, user?.id, itemId, contentName]);

  const handleSaveUserItem = async () => {
    if (!isUserItem || !itemId) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("user_items")
        .update({
          quantity: editedData.quantity,
          note: editedData.note ?? null,
          content_name: editedData.content_name ?? null,
        })
        .eq("id", itemId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["user-items"] });
      toast({
        title: "保存完了",
        description: "アイテム情報を保存しました。",
      });
      setIsEditing(false);
      onClose();
    } catch (error) {
      toast({
        title: "エラー",
        description: "保存に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px] h-[90vh] flex flex-col p-0 overflow-hidden">
      <ModalHeader onClose={onClose} />
      <ItemDetailsContent
        image={image}
        title={title}
        isUserItem={isUserItem}
        isEditing={isEditing}
        editedData={editedData}
        setEditedData={setEditedData}
        contentName={editedData.content_name ?? contentName}
        releaseDate={releaseDate}
        createdBy={createdBy}
        description={description}
        price={price}
      />
      
      {isUserItem && (
        <ItemDetailsActions
          isEditing={isEditing}
          isSaving={isSaving}
          onSave={handleSaveUserItem}
          onEdit={() => setIsEditing(true)}
          onCancel={() => setIsEditing(false)}
          onTag={() => setIsTagModalOpen(true)}
          onDelete={() => setIsDeleteConfirmOpen(true)}
        />
      )}
    </DialogContent>
  );
}
