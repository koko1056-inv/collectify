
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface WishlistGridProps {
  userId: string;
  enableActions?: boolean;
}

export function WishlistGrid({ userId, enableActions = false }: WishlistGridProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: wishlistItems = [], isLoading } = useQuery({
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
  });

  const handleAddToCollection = async (officialItem: any, wishlistId: string) => {
    if (!user) {
      toast({
        title: "エラー",
        description: "コレクションに追加するにはログインが必要です。",
        variant: "destructive",
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
      await queryClient.invalidateQueries({ queryKey: ["user-items"] });

      toast({
        title: "成功",
        description: "コレクションに追加しました。",
      });
    } catch (error) {
      console.error("Error adding to collection:", error);
      toast({
        title: "エラー",
        description: "コレクションへの追加に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFromWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase.from("wishlists").delete().eq("id", wishlistId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast({
        title: "成功",
        description: "ウィッシュリストから削除しました。",
      });
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast({
        title: "エラー",
        description: "ウィッシュリストからの削除に失敗しました。",
        variant: "destructive",
      });
    }
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

  if (!wishlistItems || wishlistItems.length === 0) {
    return <p className="text-center text-gray-500 py-4">欲しい物リストは空です</p>;
  }

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
      {wishlistItems.map((item: any) => (
        <div
          key={item.id}
          className="bg-white border rounded-lg p-3 flex flex-col items-center shadow-sm relative"
        >
          <img
            src={item.official_items?.image}
            alt={item.official_items?.title}
            className="h-24 w-24 object-cover rounded mb-2"
          />
          <div className="text-center w-full">
            <h3 className="font-medium text-sm line-clamp-2">{item.official_items?.title}</h3>
            {item.note && <p className="text-xs text-gray-500 mt-1">メモ: {item.note}</p>}
            <p className="text-xs text-gray-400 mt-1">{item.official_items?.price}</p>
          </div>
          {enableActions && user && user.id === userId && (
            <div className="flex gap-2 mt-2">
              <Button
                onClick={() => handleAddToCollection(item.official_items, item.id)}
                size="sm"
                variant="ghost"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                ゲット
              </Button>
              <Button
                onClick={() => handleRemoveFromWishlist(item.id)}
                size="sm"
                variant="ghost"
                className="text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
