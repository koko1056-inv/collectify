import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CollectionGoodsCard } from "./CollectionGoodsCard";
import { Skeleton } from "./ui/skeleton";

interface UserCollectionProps {
  selectedTag: string | null;
  selectedArtist?: string | null;
  selectedAnime?: string | null;
}

export function UserCollection({ 
  selectedTag,
  selectedArtist,
  selectedAnime,
}: UserCollectionProps) {
  const { user } = useAuth();

  const { data: userItems = [], isLoading: isItemsLoading } = useQuery({
    queryKey: ["user-items", user?.id, selectedTag, selectedArtist, selectedAnime],
    queryFn: async () => {
      if (!user) return [];
      
      const query = supabase
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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">コレクションを表示するにはログインしてください。</p>
      </div>
    );
  }

  if (isItemsLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const filteredItems = userItems.filter(item => {
    const matchesTag = !selectedTag || 
      item.user_item_tags?.some(tag => tag.tags?.name === selectedTag);
    const matchesArtist = !selectedArtist || item.artist === selectedArtist;
    const matchesAnime = !selectedAnime || item.anime === selectedAnime;
    return matchesTag && matchesArtist && matchesAnime;
  });

  if (userItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">まだコレクションに追加されたアイテムがありません。</p>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">選択された条件に一致するアイテムがありません。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredItems.map((item) => (
        <CollectionGoodsCard
          key={item.id}
          id={item.id}
          title={item.title}
          image={item.image}
          isShared={item.is_shared}
        />
      ))}
    </div>
  );
}