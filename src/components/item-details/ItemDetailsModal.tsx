
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { isItemInUserCollection } from "@/utils/tag/tag-queries";
import { ModalHeader } from "./ModalHeader";
import { ItemStatistics } from "./ItemStatistics";
import { ItemDetailInfo } from "./ItemDetailInfo";
import { ItemButtons } from "./ItemButtons";
import { Button } from "@/components/ui/button";
import { Tag, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TagManageModal } from "../tag/TagManageModal";
import { deleteUserItem } from "@/utils/tag/user-item-operations";
import { ItemDetailsContent } from "./ItemDetailsContent";
import { useItemDetailsForm } from "./useItemDetailsForm";

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

  // 初期データをセットアップ
  const initialData = {
    image,
    title,
    price,
    description,
    quantity,
    note: null,
    content_name: contentName ?? null,
  };

  // 詳細フォームのカスタムフックを使用
  const {
    isEditing,
    setIsEditing,
    editedData,
    setEditedData,
    isSaving,
    handleSaveUserItem
  } = useItemDetailsForm(itemId, isUserItem, initialData, onClose);

  // タグの取得
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

  // ユーザーアイテムのメモとタグを取得
  const { data: userItemDetails, isLoading: isLoadingUserItemDetails } = useQuery({
    queryKey: ["user-item-details", itemId],
    queryFn: async () => {
      if (!isUserItem || !itemId) return null;
      
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
        .single();
        
      if (error) {
        console.error("Error fetching user item details:", error);
        return null;
      }
      
      return data;
    },
    enabled: isUserItem && !!itemId,
  });

  // メモリー（思い出）を取得
  const { data: memories = [] } = useQuery({
    queryKey: ["item-memories", [itemId]],
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

  // ユーザー情報を編集データに設定
  useEffect(() => {
    if (userItemDetails && isUserItem) {
      setEditedData(prev => ({
        ...prev,
        note: userItemDetails.note,
        content_name: userItemDetails.content_name,
        quantity: userItemDetails.quantity || 1,
      }));
    }
  }, [userItemDetails, isUserItem, setEditedData]);

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

  // 所有者の数を取得
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

  // トレードの数を取得
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

  // アイテムがユーザーのコレクションに既に存在するかをチェック
  const { data: isInCollection = false, refetch: refetchIsInCollection } = useQuery({
    queryKey: ["is-in-collection", itemId, user?.id],
    queryFn: async () => {
      if (!user || isUserItem) return isUserItem;
      return await isItemInUserCollection(itemId, user.id);
    },
    enabled: !isUserItem && !!user && !!itemId,
  });

  // アイテム削除ハンドラ
  const handleDeleteItem = async () => {
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
  };

  // ユーザータグの取得
  const userTags = userItemDetails?.user_item_tags || [];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <ModalHeader onClose={onClose} />

          {/* メインコンテンツ */}
          <ItemDetailsContent
            image={image}
            title={title}
            tags={isUserItem ? userTags : officialTags}
            memories={memories}
            isUserItem={isUserItem}
            isEditing={isEditing}
            editedData={editedData}
            setEditedData={setEditedData}
            contentName={editedData.content_name}
            releaseDate={releaseDate}
            createdBy={createdBy}
            description={description}
          />

          {/* 下部固定エリア */}
          <div className="p-4 border-t border-gray-100">
            {/* ユーザーアイテム：編集／保存UI */}
            {isUserItem && (
              <div className="flex gap-2 mb-2">
                {!isEditing && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                      onClick={() => setIsTagModalOpen(true)}
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      タグを管理
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-gray-300 hover:bg-gray-50"
                      onClick={() => setIsEditing(true)}
                    >
                      編集
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-500"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      削除
                    </Button>
                  </>
                )}
                {isEditing && (
                  <>
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={handleSaveUserItem}
                      disabled={isSaving}
                    >
                      {isSaving ? "保存中..." : "保存"}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                    >
                      キャンセル
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* 統計・説明等 */}
            <ItemStatistics
              likesCount={likesCount}
              ownersCount={ownersCount}
              tradesCount={tradesCount}
            />

            <ItemDetailInfo
              tags={isUserItem ? userTags : officialTags}
              price={price}
              description={description}
              contentName={editedData.content_name || contentName}
            />

            {/* 下部アクション：公式アイテム */}
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
          </div>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
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
                onClick={handleDeleteItem}
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
