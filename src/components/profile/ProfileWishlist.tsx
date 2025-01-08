import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProfileWishlistProps {
  userId: string;
}

export function ProfileWishlist({ userId }: ProfileWishlistProps) {
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
              <div>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}