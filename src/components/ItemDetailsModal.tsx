
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useItemDetailsForm } from "./item-details/useItemDetailsForm";
import { ItemDetailsHeader } from "./item-details/ItemDetailsHeader";
import { ItemDetailsContent } from "./item-details/ItemDetailsContent";
import { ItemDetailsFooter } from "./item-details/ItemDetailsFooter";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Heart, Share } from "lucide-react";
import { Button } from "./ui/button";
import { format } from "date-fns";
import { Badge } from "./ui/badge";
import { ItemLabelValue } from "./item-details/ItemLabelValue";

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
  const isOwner = !userId || (user && user.id === userId);
  const canEdit = isOwner || (!isUserItem && user !== null);

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
            name,
            category
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
  const { data: ownersCount = 0 } = useQuery({
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

  // トレードの数を取得 (このアイテムが関係するトレードの数)
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

  // アイテムタイプのタグを取得
  const typeTag = officialTags.find(tag => tag.tags?.category === 'type')?.tags?.name || '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center p-4 border-b relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="mr-2 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-medium flex-1 text-center">アイテム詳細</h2>
          <div className="w-8"></div> {/* スペーサー */}
        </div>
        
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
            
            {/* アクションボタン */}
            <div className="flex justify-between items-center py-4 border-b border-gray-100">
              <div className="flex flex-col items-center">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Heart className="h-5 w-5" />
                </Button>
                <span className="text-xs mt-1">{likesCount}いいね</span>
              </div>
              
              <div className="flex flex-col items-center">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <span className="text-sm font-medium">{ownersCount}</span>
                </Button>
                <span className="text-xs mt-1">所有者</span>
              </div>
              
              <div className="flex flex-col items-center">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <span className="text-sm font-medium">{tradesCount}</span>
                </Button>
                <span className="text-xs mt-1">トレード</span>
              </div>
            </div>
            
            {/* アイテム詳細情報 */}
            <div className="space-y-3 py-3 border-b border-gray-100">
              <ItemLabelValue 
                icon="calendar" 
                label="発売日" 
                value={format(new Date(releaseDate), 'yyyy-MM-dd')} 
              />
              
              {typeTag && (
                <ItemLabelValue 
                  icon="tag" 
                  label="カテゴリー" 
                  value={typeTag} 
                />
              )}
              
              {officialTags.some(tag => tag.tags?.category === 'character') && (
                <ItemLabelValue 
                  icon="star" 
                  label="レア度" 
                  value="一般" 
                />
              )}
            </div>
            
            {/* 下部アクションボタン */}
            <div className="pt-4 space-y-3">
              <Button className="w-full bg-green-500 hover:bg-green-600">
                すでにコレクションに追加済みです
              </Button>
              
              <Button variant="outline" className="w-full text-blue-500 border-blue-500">
                ウィッシュリストに追加
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
