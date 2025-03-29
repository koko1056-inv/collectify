
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { isItemInUserCollection } from "@/utils/tag/tag-queries";
import { ModalHeader } from "./item-details/ModalHeader";
import { ItemStatistics } from "./item-details/ItemStatistics";
import { ItemDetailInfo } from "./item-details/ItemDetailInfo";
import { ItemButtons } from "./item-details/ItemButtons";

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

  // タグの取得
  const { data: officialTags = [] } = useQuery({
    queryKey: ["item-tags", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_tags")
        .select(`
          tag_id,
          tags (
            id,
            name,
            category
          )
        `)
        .eq("official_item_id", itemId);
      if (error) throw error;
      return data;
    },
    enabled: !isUserItem,
  });

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
    enabled: isUserItem,
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
    enabled: !isUserItem,
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
        
        // offered_item_idまたはrequested_item_idのいずれかにマッチするトレードをカウント
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
    enabled: true,
  });

  // アイテムがユーザーのコレクションに既に存在するかをチェック
  const { data: isInCollection = false, refetch: refetchIsInCollection } = useQuery({
    queryKey: ["is-in-collection", itemId, user?.id],
    queryFn: async () => {
      if (!user || isUserItem) return isUserItem;
      return await isItemInUserCollection(itemId, user.id);
    },
    enabled: !isUserItem && !!user,
  });

  // リアルタイム更新のために購読を設定
  useEffect(() => {
    if (!user || isUserItem) return;

    const channel = supabase
      .channel('user-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_items',
          filter: `user_id=eq.${user.id} and official_item_id=eq.${itemId}`
        },
        async () => {
          await refetchIsInCollection();
          await refetchOwnersCount();
          await queryClient.invalidateQueries({ queryKey: ["user-items", user.id] });
          await queryClient.invalidateQueries({ queryKey: ["item-owners-count", itemId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, user?.id, isUserItem, queryClient, refetchIsInCollection, refetchOwnersCount]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] h-[90vh] flex flex-col p-0 overflow-hidden">
        <ModalHeader onClose={onClose} />
        
        {/* メインコンテンツ */}
        <div className="flex-1 overflow-auto">
          {/* アイテム画像 */}
          <div className="aspect-square w-full">
            <img 
              src={image} 
              alt={title} 
              className="w-full h-full object-contain bg-gray-50"
            />
          </div>
          
          {/* アイテム情報 */}
          <div className="p-4">
            <h3 className="text-lg font-bold mb-2">{title}</h3>
            
            {/* 統計情報 */}
            <ItemStatistics 
              likesCount={likesCount} 
              ownersCount={ownersCount} 
              tradesCount={tradesCount} 
            />
            
            {/* アイテム詳細情報 */}
            <ItemDetailInfo 
              releaseDate={releaseDate} 
              tags={officialTags} 
            />
            
            {/* 下部アクションボタン */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
