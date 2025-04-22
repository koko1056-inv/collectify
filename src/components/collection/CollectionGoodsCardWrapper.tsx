
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { CollectionGoodsCardHeader } from "./CollectionGoodsCardHeader";
import { CollectionGoodsCardContent } from "./CollectionGoodsCardContent";
import { CollectionGoodsCardFooter } from "./CollectionGoodsCardFooter";
import { ItemDetailsModal } from "../item-details/ItemDetailsModal";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ItemDetailsDeleteDialog } from "../item-details/ItemDetailsDeleteDialog";
import { TagManageModal } from "../tag/TagManageModal";

interface CollectionGoodsCardWrapperProps {
  title: string;
  image: string;
  id: string;
  userId?: string;
  releaseDate?: string;
  prize?: string;
  quantity?: number;
  isCompact?: boolean;
}

export function CollectionGoodsCardWrapper({
  title,
  image,
  id,
  userId,
  releaseDate,
  prize,
  quantity = 1,
  isCompact = false,
}: CollectionGoodsCardWrapperProps) {
  const { user } = useAuth();
  const isOwner = !userId || (user && user.id === userId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  const [editedData, setEditedData] = useState({
    quantity,
    note: "",
    content_name: null,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveUserItem = async () => {
    if (!id) return;
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from("user_items")
        .update({
          quantity: editedData.quantity,
          note: editedData.note,
          content_name: editedData.content_name
        })
        .eq("id", id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["user-items"] });
      
      toast({
        title: "保存完了",
        description: "アイテム情報を保存しました。",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving user item:", error);
      toast({
        title: "エラー",
        description: "保存に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    try {
      const { error } = await supabase
        .from("user_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-items"] });
      
      toast({
        title: "削除完了",
        description: "アイテムを削除しました。",
      });
      
      setIsDetailsModalOpen(false);
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "エラー",
        description: "削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card
        className={`group relative overflow-hidden h-full transition-shadow hover:shadow-md ${
          isCompact ? 'w-[160px]' : ''
        }`}
        onClick={() => setIsDetailsModalOpen(true)}
      >
        <CollectionGoodsCardHeader
          title={title}
          image={image}
          isCompact={isCompact}
        />
        <CollectionGoodsCardContent
          id={id}
          isOwner={isOwner}
          onMemoriesClick={() => setIsMemoriesModalOpen(true)}
        />
        <CollectionGoodsCardFooter
          id={id}
          onMemoriesClick={() => setIsMemoriesModalOpen(true)}
          onTagManageClick={() => setIsTagModalOpen(true)}
          onDeleteClick={() => setIsDeleteDialogOpen(true)}
        />
      </Card>

      <ItemDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={title}
        image={image}
        price={prize}
        releaseDate={releaseDate}
        quantity={quantity}
        itemId={id}
        isUserItem={true}
        userId={userId}
        editedData={editedData}
        setEditedData={setEditedData}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        onSaveUserItem={handleSaveUserItem}
        isSaving={isSaving}
        onTag={() => setIsTagModalOpen(true)}
        onDelete={() => setIsDeleteDialogOpen(true)}
      />

      <ItemDetailsDeleteDialog
        open={isDeleteDialogOpen}
        setOpen={setIsDeleteDialogOpen}
        title={title}
        itemId={id}
        isUserItem={true}
        onCloseModal={() => setIsDetailsModalOpen(false)}
        userId={userId}
        user={user}
        onConfirm={handleDeleteItem}
      />

      <TagManageModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        itemIds={[id]}
        itemTitle={title}
        isUserItem={true}
      />
    </>
  );
}
