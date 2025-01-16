import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CollectionGoodsCard } from "@/components/CollectionGoodsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Grid, List } from "lucide-react";
import { FilterBar } from "@/components/FilterBar";
import { Tag } from "@/types";

interface ProfileCollectionProps {
  userId: string;
}

export function ProfileCollection({ userId }: ProfileCollectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCompact, setIsCompact] = useState(false);

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
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });

  const filteredItems = userItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => 
        item.user_item_tags?.some(itemTag => itemTag.tags?.name === tag)
      );
    return matchesSearch && matchesTags;
  });

  const gridClass = isCompact
    ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2"
    : "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3";

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-2xl font-semibold">コレクション</h2>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            tags={tags}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCompact(!isCompact)}
            className="gap-2"
          >
            {isCompact ? (
              <>
                <Grid className="h-4 w-4" />
                <span>通常表示</span>
              </>
            ) : (
              <>
                <List className="h-4 w-4" />
                <span>一覧表示</span>
              </>
            )}
          </Button>
        </div>
        {isLoading ? (
          <div className={gridClass}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-[120px] w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="text-gray-500">
            {userItems.length === 0 
              ? "コレクションにアイテムはありません"
              : "検索条件に一致するアイテムはありません"}
          </p>
        ) : (
          <div className={gridClass}>
            {filteredItems.map((item) => (
              <CollectionGoodsCard
                key={item.id}
                id={item.id}
                title={item.title}
                image={item.image}
                userId={userId}
                isCompact={isCompact}
                quantity={item.quantity}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}