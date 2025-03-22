import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { playSound } from "@/utils/sound";

interface ProfileWishlistProps {
  userId: string;
}

export function ProfileWishlist({ userId }: ProfileWishlistProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: wishlistItems = [] } = useQuery({
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

  const handleAddToCollection = async (officialItem: any) => {
    if (!user) {
      toast({
        title: "エラー",
        description: "コレクションに追加するにはログインが必要です。",
        variant: "destructive",
      });
      return;
    }

    try {
      // 音を先に再生 - ユーザーインタラクション直後のため成功しやすい
      playSound('success', 0.5);
      
      // Add to user's collection
      const { error: insertError } = await supabase.from("user_items").insert({
        title: officialItem.title,
        image: officialItem.image,
        release_date: officialItem.release_date || new Date().toISOString().split('T')[0],
        user_id: user.id,
        prize: officialItem.price || "0",
        official_item_id: officialItem.id,
      });

      if (insertError) throw insertError;

      // Remove from wishlist
      const { error: deleteError } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", user.id)
        .eq("official_item_id", officialItem.id);

      if (deleteError) throw deleteError;

      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      await queryClient.invalidateQueries({ queryKey: ["user-items"] });

      toast({
        title: "成功",
        description: "コレクションに追加しました。",
      });
    } catch (error) {
      console.error("Error adding to collection:", error);
      // エラー時は別の音を再生
      playSound('error', 0.5);
      toast({
        title: "エラー",
        description: "コレクションへの追加に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">ウィッシュリスト</h2>
      {wishlistItems.length === 0 ? (
        <p className="text-gray-500">欲しいものリストは空です</p>
      ) : (
        <div className="grid gap-4">
          {wishlistItems.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 items-center border rounded-lg p-4 bg-white"
            >
              <img
                src={item.official_items.image}
                alt={item.official_items.title}
                className="h-24 w-24 object-cover rounded-md"
              />
              <div className="flex-1">
                <h3 className="font-medium">
                  {item.official_items.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {item.official_items.price}
                </p>
                {item.note && (
                  <p className="text-sm text-gray-500 mt-2">
                    メモ: {item.note}
                  </p>
                )}
              </div>
              {user && user.id === userId && (
                <Button
                  onClick={() => handleAddToCollection(item.official_items)}
                  className="ml-auto"
                >
                  ゲット
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
