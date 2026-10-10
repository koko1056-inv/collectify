import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Trash2, Search, ShoppingBasket } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { invalidateCollectionChanged } from "@/utils/collection-cache";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { PriceSearchModal } from "@/components/wishlist/PriceSearchModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";

interface WishlistGridProps {
  userId: string;
  enableActions?: boolean;
}

export function WishlistGrid({ userId, enableActions = false }: WishlistGridProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Price search modal state
  const [priceSearchItem, setPriceSearchItem] = useState<{
    title: string;
    image?: string;
  } | null>(null);

  const { data: wishlistItems = [], isLoading, error, refetch } = useQuery({
    queryKey: ["wishlist", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select(`
          *,
          official_items (
            id,
            title,
            image,
            price,
            release_date,
            description
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const handleAddToCollection = async (officialItem: any, wishlistId: string) => {
    if (!user) {
      toast.error(t("collectionScreen.common.error"), {
        description: t("collectionScreen.wishlist.loginRequiredDesc"),
      });
      return;
    }

    try {
      const { error: insertError } = await supabase.from("user_items").insert({
        title: officialItem.title,
        image: officialItem.image,
        release_date: officialItem.release_date || new Date().toISOString().split("T")[0],
        user_id: user.id,
        prize: officialItem.price || "0",
        official_item_id: officialItem.id,
      });

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from("wishlists")
        .delete()
        .eq("id", wishlistId);

      if (deleteError) throw deleteError;

      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      // コンプ進捗・登録数など、コレクションから計算している数字をまとめて引き直す（以前は進捗が漏れていた）
      await invalidateCollectionChanged(queryClient, { userId: user.id, officialItemId: officialItem.id });

      toast.success(t("collectionScreen.common.success"), {
        description: t("collectionScreen.wishlist.addedToCollection"),
      });
    } catch (error) {
      console.error("Error adding to collection:", error);
      toast.error(t("collectionScreen.common.error"), {
        description: t("collectionScreen.wishlist.addFailed"),
      });
    }
  };

  const handleRemoveFromWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase.from("wishlists").delete().eq("id", wishlistId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success(t("collectionScreen.common.success"), {
        description: t("collectionScreen.wishlist.removed"),
      });
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error(t("collectionScreen.common.error"), {
        description: t("collectionScreen.wishlist.removeFailed"),
      });
    }
  };

  const handlePriceSearch = (item: any) => {
    setPriceSearchItem({
      title: item.official_items?.title || '',
      image: item.official_items?.image,
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <QueryErrorState
        title={t("collectionScreen.common.error")}
        onRetry={() => refetch()}
      />
    );
  }

  if (!wishlistItems || wishlistItems.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBasket}
        title={t("collectionScreen.wishlist.empty")}
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {wishlistItems.map((item: any) => (
          <div
            key={item.id}
            className="bg-card border rounded-lg p-3 flex flex-col items-center shadow-sm relative group"
          >
            {/* 写真と名前を押すとグッズの詳細ページを開く。以前は押し先がなく、
                他の人のほしいものリストから詳細が見られなかった。 */}
            <button
              type="button"
              disabled={!item.official_items?.id}
              onClick={() => item.official_items?.id && navigate(`/item/${item.official_items.id}`)}
              className="flex w-full flex-col items-center text-center"
            >
            <img
              src={getOptimizedImageUrl(item.official_items?.image, { width: 300 })} onError={fallbackToOriginal(item.official_items?.image)} loading="lazy" decoding="async"
              alt={item.official_items?.title}
              className="h-24 w-24 object-contain rounded mb-2 bg-muted/30"
            />
            <div className="text-center w-full">
              <h3 className="font-medium text-sm line-clamp-2">{item.official_items?.title}</h3>
              {item.note && <p className="text-xs text-muted-foreground mt-1">{t("collectionScreen.wishlist.notePrefix")}{item.note}</p>}
              <p className="text-xs text-muted-foreground mt-1">{item.official_items?.price}</p>
            </div>
            </button>
            
            {/* Price Search Button - Always visible */}
            <Button
              onClick={() => handlePriceSearch(item)}
              size="sm"
              variant="outline"
              className="mt-2 w-full gap-1 text-xs"
            >
              <Search className="w-3 h-3" />
              {t("collectionScreen.wishlist.priceSearch")}
            </Button>
            
            {enableActions && user && user.id === userId && (
              <div className="flex gap-2 mt-2 w-full">
                <Button
                  onClick={() => handleAddToCollection(item.official_items, item.id)}
                  size="sm"
                  variant="ghost"
                  className="flex-1 text-xs"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t("collectionScreen.wishlist.got")}
                </Button>
                <Button
                  onClick={() => handleRemoveFromWishlist(item.id)}
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Price Search Modal */}
      <PriceSearchModal
        isOpen={!!priceSearchItem}
        onClose={() => setPriceSearchItem(null)}
        itemTitle={priceSearchItem?.title || ''}
        itemImage={priceSearchItem?.image}
      />
    </>
  );
}
