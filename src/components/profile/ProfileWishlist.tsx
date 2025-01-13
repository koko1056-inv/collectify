import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { useState } from "react";
import { TradeRequestModal } from "../trade/TradeRequestModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ProfileWishlistProps {
  userId: string;
}

export function ProfileWishlist({ userId }: ProfileWishlistProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ["wishlist", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select(`
          *,
          official_items (
            title,
            image,
            price
          )
        `)
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
  });

  const handleGrantWish = (itemId: string, itemTitle: string) => {
    if (!user) {
      toast({
        title: "ログインが必要です",
        description: "願いを叶えるにはログインしてください",
        variant: "destructive",
      });
      return;
    }

    if (user.id === userId) {
      toast({
        title: "自分のウィッシュリストです",
        description: "自分のウィッシュリストの願いは叶えられません",
        variant: "destructive",
      });
      return;
    }

    setSelectedItem({
      id: itemId,
      title: itemTitle,
    });
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
              {user && user.id !== userId && (
                <Button
                  onClick={() => handleGrantWish(item.official_item_id, item.official_items.title)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Wand2 className="h-4 w-4" />
                  願いを叶える
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <TradeRequestModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          requestedItemId={selectedItem.id}
          requestedItemTitle={selectedItem.title}
          receiverId={userId}
        />
      )}
    </div>
  );
}