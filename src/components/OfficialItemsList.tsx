import { OfficialGoodsCard } from "./OfficialGoodsCard";
import { OfficialItem } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OfficialItemsListProps {
  items: OfficialItem[];
  onAnimeSelect?: (anime: string | null) => void;
  onArtistSelect?: (artist: string | null) => void;
}

export function OfficialItemsList({ items, onAnimeSelect, onArtistSelect }: OfficialItemsListProps) {
  const { user } = useAuth();

  const { data: userItemsMap = {} } = useQuery({
    queryKey: ["user-items-map", user?.id],
    queryFn: async () => {
      if (!user) return {};

      const { data } = await supabase
        .from("user_items")
        .select("official_link")
        .eq("user_id", user.id);

      return data?.reduce((acc: Record<string, boolean>, item) => {
        if (item.official_link) {
          acc[item.official_link] = true;
        }
        return acc;
      }, {}) || {};
    },
    enabled: !!user,
  });

  const { data: wishlistCounts = {} } = useQuery({
    queryKey: ["wishlist-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("official_item_id, count")
        .select("official_item_id");

      return data?.reduce((acc: Record<string, number>, item) => {
        acc[item.official_item_id] = (acc[item.official_item_id] || 0) + 1;
        return acc;
      }, {}) || {};
    },
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">該当するアイテムが見つかりませんでした。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => (
        <OfficialGoodsCard
          key={item.id}
          id={item.id}
          title={item.title}
          description={item.description}
          image={item.image}
          price={item.price}
          releaseDate={item.release_date}
          isInCollection={!!userItemsMap[item.id]}
          wishlistCount={wishlistCounts[item.id] || 0}
          onAnimeSelect={onAnimeSelect}
          onArtistSelect={onArtistSelect}
        />
      ))}
    </div>
  );
}