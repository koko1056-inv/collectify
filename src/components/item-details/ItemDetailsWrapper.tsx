
import { useQuery, QueryObserverResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ModalHeader } from "./ModalHeader";
import { ItemDetailsMainInfo } from "./ItemDetailsMainInfo";
import { ItemDetailsActions } from "./ItemDetailsActions";
import { ItemStatisticsDetail } from "./ItemStatisticsDetail";
import { useEffect, useState } from "react";
import { SimpleItemTag } from "@/utils/tag/types";
import { Button } from "@/components/ui/button";
import { QuantityInput } from "./QuantityInput";
import { ItemNoteField } from "./ItemNoteField";

type UserItemDetails = {
  note: string | null;
  content_name: string | null;
  quantity: number;
  user_item_tags: SimpleItemTag[];
};

const EMPTY_USER_ITEM_DETAILS: UserItemDetails = {
  note: "",
  content_name: null,
  quantity: 1,
  user_item_tags: [],
};

interface ItemDetailsWrapperProps {
  itemId: string;
  isUserItem?: boolean;
  onClose: () => void;
  title: string;
  image: string;
  userId?: string;
  editedData: any;
  setEditedData: (data: any) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  onSaveUserItem: () => void;
  isSaving: boolean;
  onTag: () => void;
  onDelete: () => void;
}

export function ItemDetailsWrapper({
  itemId,
  isUserItem = false,
  onClose,
  title,
  image,
  userId,
  editedData,
  setEditedData,
  isEditing,
  setIsEditing,
  onSaveUserItem,
  isSaving,
  onTag,
  onDelete
}: ItemDetailsWrapperProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isQuantityEditing, setIsQuantityEditing] = useState(false);

  // ユーザーアイテム詳細の取得
  const { data: userItemDetails = EMPTY_USER_ITEM_DETAILS } = useQuery<UserItemDetails>({
    queryKey: ["user-item-details", itemId],
    queryFn: async () => {
      if (!isUserItem || !itemId) return EMPTY_USER_ITEM_DETAILS;
      
      const { data, error } = await supabase
        .from("user_items")
        .select(`
          note,
          content_name,
          quantity,
          user_item_tags (
            tag_id,
            tags (
              id,
              name,
              category,
              created_at
            )
          )
        `)
        .eq("id", itemId)
        .maybeSingle();

      if (error || !data) {
        console.error("Error fetching user item details:", error);
        return EMPTY_USER_ITEM_DETAILS;
      }

      return {
        note: data.note,
        content_name: data.content_name,
        quantity: data.quantity || 1,
        user_item_tags: data.user_item_tags || [],
      };
    },
    enabled: isUserItem && !!itemId,
  });

  // メモリーの取得
  const { data: memories = [] } = useQuery({
    queryKey: ["item-memories", itemId],
    queryFn: async () => {
      if (!isUserItem || !itemId) return [];
      
      const { data, error } = await supabase
        .from("item_memories")
        .select("*")
        .eq("user_item_id", itemId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching memories:", error);
        return [];
      }
      
      return data || [];
    },
    enabled: isUserItem && !!itemId,
  });

  // 編集データの初期化
  useEffect(() => {
    if (userItemDetails && isUserItem) {
      setEditedData((prev: any) => ({
        ...prev,
        note: userItemDetails.note || "",
        content_name: userItemDetails.content_name,
        quantity: userItemDetails.quantity || 1,
      }));
    }
  }, [userItemDetails, isUserItem, setEditedData]);

  return (
    <div className="flex flex-col h-full">
      <ModalHeader onClose={onClose} />

      <div className="flex-1 overflow-y-auto">
        {/* メインのコンテンツエリア */}
        <ItemDetailsMainInfo
          tags={userItemDetails.user_item_tags}
          isUserItem={isUserItem}
          isEditing={isEditing}
          editedData={editedData}
          setEditedData={setEditedData}
          memories={memories}
        />

        {/* ユーザーアイテムの場合のみ：数量＋メモ編集UI */}
        {isUserItem && (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium">所有個数</label>
              <QuantityInput
                value={editedData.quantity}
                onChange={val => setEditedData((prev: any) => ({
                  ...prev,
                  quantity: val
                }))}
                min={1}
                max={999}
                className="mt-2"
              />
            </div>
            <ItemNoteField
              isEditing={isEditing}
              note={editedData.note}
              onChange={v => setEditedData((prev: any) => ({
                ...prev,
                note: v
              }))}
              memories={memories}
            />
          </div>
        )}
      </div>

      {/* アクション（編集/保存/削除/タグ） */}
      {isUserItem && (
        <div className="p-4 border-t border-gray-100">
          <ItemDetailsActions
            isEditing={isEditing}
            isSaving={isSaving}
            onSave={onSaveUserItem}
            onEdit={() => setIsEditing(true)}
            onCancel={() => setIsEditing(false)}
            onTag={onTag}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
}
