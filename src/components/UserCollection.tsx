import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CollectionGoodsCard } from "./CollectionGoodsCard";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";
import { useState } from "react";

export function UserCollection() {
  const { user } = useAuth();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const { data: userItems = [], isLoading: isItemsLoading } = useQuery({
    queryKey: ["user-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("user_items")
        .select(`
          *,
          user_item_tags (
            tag_id,
            tags (
              name
            )
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: allTags = [], isLoading: isTagsLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">コレクションを表示するにはログインしてください。</p>
      </div>
    );
  }

  if (isItemsLoading || isTagsLoading) {
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

  const filteredItems = selectedTag
    ? userItems.filter(item => 
        item.user_item_tags?.some(tag => tag.tags?.name === selectedTag)
      )
    : userItems;

  if (userItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">まだコレクションに追加されたアイテムがありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={selectedTag === null ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedTag(null)}
        >
          すべて
        </Badge>
        {allTags.map((tag) => (
          <Badge
            key={tag.id}
            variant={selectedTag === tag.name ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedTag(tag.name)}
          >
            {tag.name}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map((item) => (
          <CollectionGoodsCard
            key={item.id}
            id={item.id}
            title={item.title}
            image={item.image}
          />
        ))}
      </div>
    </div>
  );
}