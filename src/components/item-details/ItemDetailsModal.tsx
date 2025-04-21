import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { isItemInUserCollection } from "@/utils/tag/tag-queries";
import { ModalHeader } from "./ModalHeader";
import { ItemButtons } from "./ItemButtons";
import { useToast } from "@/hooks/use-toast";
import { TagManageModal } from "../tag/TagManageModal";
import { deleteUserItem } from "@/utils/tag/user-item-operations";
import { SimpleItemTag } from "@/utils/tag/types";
import { ItemDetailsHeaderArea } from "./ItemDetailsHeaderArea";
import { ItemDetailsMainInfo } from "./ItemDetailsMainInfo";
import { ItemDetailsActions } from "./ItemDetailsActions";
import { ItemStatisticsDetail } from "./ItemStatisticsDetail";
import { Button } from "@/components/ui/button";
// 分割した子コンポーネント
import { ItemDetailsWrapper } from "./ItemDetailsWrapper";
import { ItemDetailsDeleteDialog } from "./ItemDetailsDeleteDialog";
import { ItemDetailsTagManageSection } from "./ItemDetailsTagManageSection";

// UserItemDetails型を型安全に定義
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
  contentName?: string | null;
}

interface UserItemDetails {
  note: string | null;
  content_name: string | null;
  quantity: number;
  user_item_tags: SimpleItemTag[];
}

// 型安全な空データを用意
const EMPTY_USER_ITEM_DETAILS: UserItemDetails = {
  note: "",
  content_name: null,
  quantity: 1,
  user_item_tags: [],
};

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
  contentName,
}: ItemDetailsModalProps) {

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    image,
    title,
    price,
    description,
    quantity,
    note: "",
    content_name: contentName ?? null,
  });
  const [isSaving, setIsSaving] = useState(false);

  // 保存ハンドラ
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <ItemDetailsWrapper
            image={image}
            title={title}
            price={price}
            releaseDate={releaseDate}
            description={description}
            itemId={itemId}
            isUserItem={isUserItem}
            quantity={quantity}
            userId={userId}
            createdBy={createdBy}
            contentName={contentName}
            editedData={editedData}
            setEditedData={setEditedData}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onSaveUserItem={handleSaveUserItem}
            isSaving={isSaving}
            onTag={() => setIsTagModalOpen(true)}
            onDelete={() => setIsDeleteConfirmOpen(true)}
            setIsTagModalOpen={setIsTagModalOpen}
          />
        </DialogContent>
      </Dialog>
      {/* 削除ダイアログ */}
      <ItemDetailsDeleteDialog
        open={isDeleteConfirmOpen}
        setOpen={setIsDeleteConfirmOpen}
        title={title}
        itemId={itemId}
        isUserItem={!!isUserItem}
        onCloseModal={onClose}
        userId={userId}
        user={user}
      />
        {/* タグ管理モーダル */}
      <ItemDetailsTagManageSection
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        itemId={itemId}
        itemTitle={title}
        isUserItem={!!isUserItem}
      />
    </>
  );
}
