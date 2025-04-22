import { ModalHeader } from "./ModalHeader";
import { ItemDetailsHeaderArea } from "./ItemDetailsHeaderArea";
import { ItemDetailsMainInfo } from "./ItemDetailsMainInfo";
import { ItemDetailsActions } from "./ItemDetailsActions";
import { ItemStatisticsDetail } from "./ItemStatisticsDetail";
import { ItemButtons } from "./ItemButtons";
import { useQuery, QueryObserverResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { isItemInUserCollection } from "@/utils/tag/tag-queries";
import { SimpleItemTag } from "@/utils/tag/types";

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
  image: string;
  title: string;
  price?: string;
  releaseDate?: string;
  description?: string;
  itemId: string;
  isUserItem?: boolean;
  quantity?: number;
  userId?: string;
  createdBy?: string | null;
  contentName?: string | null;
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
  image, title, price, releaseDate, description, itemId, isUserItem = false,
  quantity = 1, userId, createdBy, contentName,
  editedData, setEditedData, isEditing, setIsEditing, onSaveUserItem, isSaving,
  onTag, onDelete
}: ItemDetailsWrapperProps) {
  const { user } = useAuth();

  // タグ取得
  const { data: officialTags = [] } = useQuery({
    queryKey: ["item-tags", itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const { data, error } = await supabase
        .from("item_tags")
        .select(`
          tag_id,
          tags (
            id,
            name,
            category,
            created_at
          )
        `)
        .eq("official_item_id", itemId);
      if (error) throw error;
      return data || [];
    },
    enabled: !isUserItem && !!itemId,
  });

  // ユーザーアイテム詳細
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
        return EMPTY_USER_ITEM_DETAILS;
      }

      return {
        note: (data as any).note ?? "",
        content_name: (data as any).content_name ?? null,
        quantity: (data as any).quantity ?? 1,
        user_item_tags: (data as any).user_item_tags ?? [],
      };
    },
    enabled: isUserItem && !!itemId,
  });

  const { data: memories = [] } = useQuery({
    queryKey: ["item-memories", [itemId]],
    queryFn: async () => {
      if (!isUserItem || !itemId) return [];
      const { data, error } = await supabase
        .from("item_memories")
        .select("*")
        .eq("user_item_id", itemId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: isUserItem && !!itemId,
  });

  // いいね・owner・trades 等
  const { data: likesCount = 0 } = useQuery({
    queryKey: ["item-likes-count", itemId],
    queryFn: async () => {
      if (isUserItem) {
        const { count, error } = await supabase
          .from("user_item_likes")
          .select("*", { count: 'exact', head: true })
          .eq("user_item_id", itemId);
        if (error) throw error;
        return count || 0;
      }
      return 0;
    },
    enabled: isUserItem && !!itemId,
  });

  const { data: ownersCount = 0 } = useQuery({
    queryKey: ["item-owners-count", itemId],
    queryFn: async () => {
      if (!isUserItem) {
        const { data, error } = await supabase
          .from("user_items")
          .select("user_id")
          .eq("official_item_id", itemId);

        if (error) throw error;
        const uniqueUserIds = new Set(data.map((item: any) => item.user_id));
        return uniqueUserIds.size;
      }
      return 0;
    },
    enabled: !isUserItem && !!itemId,
  });

  const { data: tradesCount = 0 } = useQuery({
    queryKey: ["item-trades-count", itemId],
    queryFn: async () => {
      if (!isUserItem) {
        const { data: userItems, error: userItemsError } = await supabase
          .from("user_items")
          .select("id")
          .eq("official_item_id", itemId);

        if (userItemsError) throw userItemsError;

        if (!userItems || userItems.length === 0) return 0;

        const userItemIds = userItems.map((item: any) => item.id);

        const { count, error } = await supabase
          .from("trade_requests")
          .select("id", { count: 'exact', head: true })
          .or(`offered_item_id.in.(${userItemIds.join(',')}),requested_item_id.in.(${userItemIds.join(',')})`);

        if (error) throw error;
        return count || 0;
      } else {
        const { count, error } = await supabase
          .from("trade_requests")
          .select("id", { count: 'exact', head: true })
          .or(`offered_item_id.eq.${itemId},requested_item_id.eq.${itemId}`);

        if (error) throw error;
        return count || 0;
      }
    },
    enabled: !!itemId,
  });

  const { data: isInCollection = false } = useQuery({
    queryKey: ["is-in-collection", itemId, user?.id],
    queryFn: async () => {
      if (!user || isUserItem) return isUserItem;
      return await isItemInUserCollection(itemId, user.id);
    },
    enabled: !isUserItem && !!user && !!itemId,
  });

  const userTags = userItemDetails?.user_item_tags || [];

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

  // Ensure all tag arrays are properly typed and processed
  const processedOfficialTags: SimpleItemTag[] = Array.isArray(officialTags) ? 
    officialTags.map(tag => ({
      id: tag.id || tag.tag_id || "",
      tag_id: tag.tag_id || "",
      tags: tag.tags
    })) : [];

  const processedUserTags: SimpleItemTag[] = Array.isArray(userTags) ? 
    userTags.map(tag => ({
      id: tag.id || tag.tag_id || "",
      tag_id: tag.tag_id || "",
      tags: tag.tags
    })) : [];

  return (
    <>
      <ModalHeader onClose={onDelete} />

      {/* ヘッダー */}
      <ItemDetailsHeaderArea
        image={image}
        title={title}
        isEditing={isEditing}
        editedData={editedData}
        setEditedData={setEditedData}
      />

      {/* 情報メイン（タグ・メモ・思い出） */}
      <ItemDetailsMainInfo
        tags={isUserItem ? processedUserTags : processedOfficialTags}
        isUserItem={isUserItem}
        isEditing={isEditing}
        editedData={editedData}
        setEditedData={setEditedData}
        memories={memories}
        note={userItemDetails?.note}
      />

      {/* アクション（編集/保存/削除/タグ） */}
      {isUserItem && (
        <ItemDetailsActions
          isEditing={isEditing}
          isSaving={isSaving}
          onSave={onSaveUserItem}
          onEdit={() => setIsEditing(true)}
          onCancel={() => setIsEditing(false)}
          onTag={onTag}
          onDelete={onDelete}
        />
      )}

      {/* 統計/詳細手前部分 */}
      <ItemStatisticsDetail
        likesCount={likesCount}
        ownersCount={ownersCount}
        tradesCount={tradesCount}
        tags={isUserItem ? processedUserTags : processedOfficialTags}
        price={price}
        description={description}
        contentName={editedData.content_name || contentName}
      />

      {/* 下部公式アイテム用アクション */}
      {!isUserItem && (
        <ItemButtons
          isInCollection={isInCollection}
          itemId={itemId}
          title={title}
          image={image}
          releaseDate={releaseDate}
          price={price}
          refetchIsInCollection={refetchIsInCollection}
          refetchOwnersCount={refetchOwnersCount}
        />
      )}
    </>
  );
}
