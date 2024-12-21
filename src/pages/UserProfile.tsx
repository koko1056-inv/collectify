import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { CollectionGoodsCard } from "@/components/CollectionGoodsCard";
import { Skeleton } from "@/components/ui/skeleton";

const UserProfile = () => {
  const { userId } = useParams();

  const { data: profile } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: userItems = [], isLoading } = useQuery({
    queryKey: ["user-items", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select(`
          *,
          user_item_tags (
            tags (
              id,
              name
            )
          )
        `)
        .eq("user_id", userId)
        .eq("is_shared", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8 pt-24">
          <p className="text-center text-gray-500">ユーザーが見つかりません</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="space-y-8">
          <h1 className="text-3xl font-bold">
            {profile?.username}さんのコレクション
          </h1>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">共有アイテム</h2>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-[200px] w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : userItems.length === 0 ? (
              <p className="text-gray-500">共有されているアイテムはありません</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userItems.map((item) => (
                  <CollectionGoodsCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    image={item.image}
                    isShared={item.is_shared}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">欲しいものリスト</h2>
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
        </div>
      </main>
    </div>
  );
};

export default UserProfile;