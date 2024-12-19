import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export function WishlistViewModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();

  const { data: wishlistItems, isLoading } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: wishlist, error } = await supabase
        .from("wishlists")
        .select(`
          *,
          official_items (
            title,
            image,
            price
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return wishlist;
    },
    enabled: !!user && isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>欲しいグッズリスト</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-24 w-24" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            ))
          ) : wishlistItems?.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              まだ欲しいグッズが登録されていません
            </p>
          ) : (
            wishlistItems?.map((item) => (
              <div key={item.id} className="flex gap-4 items-center border rounded-lg p-4">
                <img
                  src={item.official_items.image}
                  alt={item.official_items.title}
                  className="h-24 w-24 object-cover rounded-md"
                />
                <div className="flex-1">
                  <h3 className="font-medium">{item.official_items.title}</h3>
                  <p className="text-sm text-gray-600">{item.official_items.price}</p>
                  {item.note && (
                    <p className="text-sm text-gray-500 mt-2">メモ: {item.note}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}