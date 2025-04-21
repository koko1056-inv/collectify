
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface CollectionWishlistProps {
  userId: string;
}

export function CollectionWishlist({ userId }: CollectionWishlistProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
        <div key={item.id} className="bg-white border rounded-lg p-3 flex flex-col items-center shadow-sm">
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
        </div>
      ))}
    </div>
  );
}
