
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { ShoppingBasket, Users } from "lucide-react";
import { TagButton } from "./buttons/TagButton";
import { useState, useEffect } from "react";
import { ItemOwnersModal } from "@/components/ItemOwnersModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OfficialGoodsCardFooterProps {
  isInCollection: boolean;
  wishlistCount: number;
  onAddToCollection: (e: React.MouseEvent) => void;
  onTagManageClick: (e: React.MouseEvent) => void;
  onWishlistClick: (e: React.MouseEvent) => void;
  itemId: string;
  itemTitle: string;
  itemImage: string;
}

export function OfficialGoodsCardFooter({
  isInCollection,
  wishlistCount,
  onAddToCollection,
  onTagManageClick,
  onWishlistClick,
  itemId,
  itemTitle,
  itemImage,
}: OfficialGoodsCardFooterProps) {
  const [isOwnersModalOpen, setIsOwnersModalOpen] = useState(false);
  const [realtimeWishlistCount, setRealtimeWishlistCount] = useState(wishlistCount);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ownersCount = 0 } = useQuery({
    queryKey: ["item-owners-count", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("user_id")
        .eq("official_item_id", itemId);
      
      if (error) {
        console.error("Error getting owners count:", error);
        return 0;
      }

      // ユニークなユーザーIDの数を計算
      const uniqueUserIds = new Set(data.map(item => item.user_id));
      return uniqueUserIds.size;
    },
  });

  const { data: tagCount = 0 } = useQuery({
    queryKey: ["item-tags-count", itemId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("item_tags")
        .select("*", { count: 'exact', head: true })
        .eq("official_item_id", itemId);
      
      if (error) {
        console.error("Error getting tag count:", error);
        return 0;
      }
      
      return count || 0;
    },
  });

  // ウィッシュリストのカウントをリアルタイムで更新
  const fetchWishlistCount = async () => {
    try {
      const { count, error } = await supabase
        .from("wishlists")
        .select("*", { count: 'exact', head: true })
        .eq("official_item_id", itemId);
      
      if (error) {
        console.error("Error getting wishlist count:", error);
        return;
      }
      
      setRealtimeWishlistCount(count || 0);
    } catch (error) {
      console.error("Error fetching wishlist count:", error);
    }
  };

  // 初期値と親コンポーネントからの値を同期
  useEffect(() => {
    setRealtimeWishlistCount(wishlistCount);
  }, [wishlistCount]);

  // コンポーネントマウント時に最新の値を取得
  useEffect(() => {
    fetchWishlistCount();
  }, [itemId]);

  // リアルタイム更新をセットアップ
  useEffect(() => {
    const channel = supabase
      .channel('wishlist-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wishlists',
          filter: `official_item_id=eq.${itemId}`
        },
        () => {
          // 変更があったらカウントを再取得
          fetchWishlistCount();
          // 関連するクエリを無効化して再取得を促す
          queryClient.invalidateQueries({ queryKey: ["wishlist"] });
          queryClient.invalidateQueries({ queryKey: ["wishlist-count"] });
          queryClient.invalidateQueries({ queryKey: ["wishlist-counts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, queryClient]);

  // 現在のユーザーがこのアイテムをウィッシュリストに入れているか確認
  const { data: isInWishlist } = useQuery({
    queryKey: ["is-in-wishlist", itemId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from("wishlists")
        .select("id")
        .eq("official_item_id", itemId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking wishlist:", error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user,
  });

  return (
    <>
      <CardFooter className="p-1 sm:p-4 pt-0 flex flex-col gap-1 sm:gap-2">
        <div className="flex justify-end gap-1 sm:gap-2">
          <TagButton onClick={onTagManageClick} tagCount={tagCount} itemId={itemId} />
          <div className="flex flex-col items-center">
            <Button 
              variant="outline" 
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setIsOwnersModalOpen(true);
              }}
              className="border-gray-200 hover:bg-gray-50 h-7 w-7 sm:h-9 sm:w-9"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <span className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">{ownersCount}</span>
          </div>
          <div className="flex flex-col items-center">
            <Button 
              variant={isInWishlist ? "secondary" : "outline"}
              size="icon"
              onClick={onWishlistClick}
              className={`border-gray-200 hover:bg-gray-50 h-7 w-7 sm:h-9 sm:w-9 ${isInWishlist ? 'bg-gray-100' : ''}`}
            >
              <ShoppingBasket className="h-3 w-3 sm:h-4 sm:w-4 text-foreground" />
            </Button>
            <span className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">{realtimeWishlistCount}</span>
          </div>
        </div>
        <Button 
          variant={isInCollection ? "secondary" : "default"}
          className={`w-full text-[10px] sm:text-sm h-7 sm:h-9 ${isInCollection ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-900 hover:bg-gray-800'}`}
          onClick={onAddToCollection}
          disabled={isInCollection}
        >
          {isInCollection ? "追加済み" : "コレクションに追加"}
        </Button>
      </CardFooter>

      <ItemOwnersModal
        isOpen={isOwnersModalOpen}
        onClose={() => setIsOwnersModalOpen(false)}
        itemTitle={itemTitle}
        itemImage={itemImage}
      />
    </>
  );
}
