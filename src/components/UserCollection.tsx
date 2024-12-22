import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MyCollectionGoodsCard } from "./collection/MyCollectionGoodsCard";
import { Skeleton } from "./ui/skeleton";

interface UserCollectionProps {
  selectedTags: string[];
}

export function UserCollection({ selectedTags }: UserCollectionProps) {
  const { user } = useAuth();

  const { data: userItems = [], isLoading: isItemsLoading } = useQuery({
    queryKey: ["user-items", user?.id, selectedTags],
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const filteredItems = selectedTags.length > 0
    ? userItems.filter(item => 
        selectedTags.every(tag => 
          item.user_item_tags?.some(itemTag => itemTag.tags?.name === tag)
        )
      )
    : userItems;

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
        <p className="text-gray-500">選択されたタグに一致するアイテムがありません。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {filteredItems.map((item) => (
        <MyCollectionGoodsCard
          key={item.id}
          id={item.id}
          title={item.title}
          image={item.image}
          isShared={item.is_shared}
          quantity={item.quantity}
        />
      ))}
    </div>
  );
}