
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

  // 編集状態と編集中データ
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

  // ユーザーアイテムの詳細（note, user_item_tags, memories）取得
  const { data: userItemDetails } = useQuery({
    queryKey: ["user-item-details", itemId],
    queryFn: async () => {
      if (!isUserItem || !itemId) return null;
      try {
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
          
        if (error) {
          console.error("Error fetching user item details:", error);
          // エラー時は型を満たす空データ返却
          return {
            note: "",
            content_name: null,
            quantity: 1,
            user_item_tags: [],
          };
        }
        return data || {
          note: "",
          content_name: null,
          quantity: 1,
          user_item_tags: [],
        };
      } catch (error) {
        console.error("Exception in user item details query:", error);
        return {
          note: "",
          content_name: null,
          quantity: 1,
          user_item_tags: [],
        };
      }
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

  // 編集データの同期
  useEffect(() => {
    if (userItemDetails && isUserItem) {
      setEditedData((prev) => ({
        ...prev,
        note: userItemDetails.note || "",
        content_name: userItemDetails.content_name,
        quantity: userItemDetails.quantity || 1,
      }));
    }
  }, [userItemDetails, isUserItem]);

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

  // 削除・タグ管理などその他ボタンロジックはそのまま

  // いいねの数を取得
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
  const { data: ownersCount = 0, refetch: refetchOwnersCount } = useQuery({
    queryKey: ["item-owners-count", itemId],
    queryFn: async () => {
      if (!isUserItem) {
        const { data, error } = await supabase
          .from("user_items")
          .select("user_id")
          .eq("official_item_id", itemId);
        
        if (error) throw error;
        // ユニークなユーザーIDの数を計算
        const uniqueUserIds = new Set(data.map(item => item.user_id));
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
        // 公式アイテムに関連する全てのユーザーアイテムを取得
        const { data: userItems, error: userItemsError } = await supabase
          .from("user_items")
          .select("id")
          .eq("official_item_id", itemId);
        
        if (userItemsError) throw userItemsError;
        
        if (!userItems || userItems.length === 0) return 0;
        
        // これらのユーザーアイテムIDを使用して、関連するトレードをカウント
        const userItemIds = userItems.map(item => item.id);
        
        const { count, error } = await supabase
          .from("trade_requests")
          .select("id", { count: 'exact', head: true })
          .or(`offered_item_id.in.(${userItemIds.join(',')}),requested_item_id.in.(${userItemIds.join(',')})`);
          
        if (error) throw error;
        return count || 0;
      } else {
        // ユーザーアイテムの場合、直接そのアイテムが関係するトレードをカウント
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
  const { data: isInCollection = false, refetch: refetchIsInCollection } = useQuery({
    queryKey: ["is-in-collection", itemId, user?.id],
    queryFn: async () => {
      if (!user || isUserItem) return isUserItem;
      return await isItemInUserCollection(itemId, user.id);
    },
    enabled: !isUserItem && !!user && !!itemId,
  });

  // タグ用データ
  // userItemDetailsがnullの場合は空配列を使用
  const userTags = userItemDetails?.user_item_tags || [];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] h-[90vh] flex flex-col p-0 overflow-hidden">

          <ModalHeader onClose={onClose} />

          {/* ヘッダー（画像＋タイトル） */}
          <ItemDetailsHeaderArea
            image={image}
            title={title}
            isEditing={isEditing}
            editedData={editedData}
            setEditedData={setEditedData}
          />

          {/* 情報メイン（タグ・メモ・思い出） */}
          <ItemDetailsMainInfo
            tags={isUserItem ? userTags : officialTags}
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
              onSave={handleSaveUserItem}
              onEdit={() => setIsEditing(true)}
              onCancel={() => setIsEditing(false)}
              onTag={() => setIsTagModalOpen(true)}
              onDelete={() => setIsDeleteConfirmOpen(true)}
            />
          )}

          {/* 統計/詳細手前部分 */}
          <ItemStatisticsDetail
            likesCount={likesCount}
            ownersCount={ownersCount}
            tradesCount={tradesCount}
            tags={isUserItem ? userTags : officialTags}
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
        </DialogContent>
      </Dialog>

      {/* 削除ダイアログ */}
      {isDeleteConfirmOpen && (
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <h2 className="text-lg font-bold mb-2">アイテムの削除</h2>
            <p className="mb-4">「{title}」をコレクションから削除しますか？</p>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                キャンセル
              </Button>
              <Button 
                variant="destructive"
                onClick={async () => {
                  if (!isUserItem || !itemId) return;
    
                  try {
                    const { error, officialItemId } = await deleteUserItem(itemId);
                    if (error) throw error;

                    // Invalidate user items query
                    queryClient.invalidateQueries({ queryKey: ["user-items"] });
                    
                    // Invalidate specific official item query if we have the ID
                    if (officialItemId) {
                      queryClient.invalidateQueries({ 
                        queryKey: ["user-item-exists", officialItemId, user?.id] 
                      });
                      queryClient.invalidateQueries({ 
                        queryKey: ["item-owners-count", officialItemId] 
                      });
                    }
                    
                    toast({
                      title: "アイテムを削除しました",
                      description: "コレクションからアイテムを削除しました。",
                    });
                    
                    onClose(); // モーダルを閉じる
                  } catch (error) {
                    console.error("Error deleting item:", error);
                    toast({
                      title: "エラー",
                      description: "アイテムの削除に失敗しました。",
                      variant: "destructive",
                    });
                  }
                }}
              >
                削除する
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* タグ管理モーダル */}
      <TagManageModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        itemIds={[itemId]}
        itemTitle={title}
        isUserItem={isUserItem}
      />
    </>
  );
}
