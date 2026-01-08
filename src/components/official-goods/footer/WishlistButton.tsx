
import { Button } from "@/components/ui/button";
import { ShoppingBasket } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

interface WishlistButtonProps {
  itemId: string;
  onWishlistClick: (e: React.MouseEvent) => void;
  initialWishlistCount: number;
}

export function WishlistButton({
  itemId,
  onWishlistClick,
  initialWishlistCount,
}: WishlistButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [wishlistCount, setWishlistCount] = useState(initialWishlistCount);

  // 現在のユーザーがこのアイテムをウィッシュリストに入れているか確認
  const { data: isInWishlist, refetch: refetchIsInWishlist } = useQuery({
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

  // ウィッシュリストの変更をグローバルに監視するため、wishlist-countsのキャッシュを監視
  useEffect(() => {
    // isInWishlistが変わったらカウントも同期
    if (isInWishlist !== undefined) {
      fetchWishlistCount();
    }
  }, [isInWishlist]);

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
      
      setWishlistCount(count || 0);
    } catch (error) {
      console.error("Error fetching wishlist count:", error);
    }
  };

  // コンポーネントマウント時に最新の値を取得
  useEffect(() => {
    fetchWishlistCount();
  }, [itemId]);

  // リアルタイム更新をセットアップ
  useEffect(() => {
    if (!user) return;

    const wishlistChannel = supabase
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
          // 変更があったらすぐにカウントを再取得
          fetchWishlistCount();
          // 関連するクエリを無効化して再取得を促す
          queryClient.invalidateQueries({ queryKey: ["wishlist"] });
          queryClient.invalidateQueries({ queryKey: ["wishlist-count"] });
          queryClient.invalidateQueries({ queryKey: ["wishlist-counts"] });
          queryClient.invalidateQueries({ queryKey: ["is-in-wishlist", itemId, user?.id] });
        }
      )
      .on(
        'broadcast',
        { event: 'wishlist-changed' },
        (payload) => {
          // WishlistUsersModalからのブロードキャストを受信
          if (payload.itemId === itemId) {
            // 即座にカウントを更新
            fetchWishlistCount();
            // 必要最小限のクエリのみ無効化
            queryClient.invalidateQueries({ queryKey: ["is-in-wishlist", itemId, user?.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(wishlistChannel);
    };
  }, [itemId, user, queryClient]);

  return (
    <div className="flex flex-col items-center">
      <Button 
        variant={isInWishlist ? "secondary" : "outline"}
        size="icon"
        onClick={onWishlistClick}
        className={`border-gray-200 hover:bg-gray-50 h-7 w-7 sm:h-9 sm:w-9 ${isInWishlist ? 'bg-gray-100' : ''}`}
      >
        <ShoppingBasket className="h-3 w-3 sm:h-4 sm:w-4 text-foreground" />
      </Button>
      <span className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">{wishlistCount}</span>
    </div>
  );
}
