import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CollectionGoodsCard } from "@/components/CollectionGoodsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Grid, List } from "lucide-react";
import { FilterBar } from "@/components/FilterBar";
import { Tag } from "@/types";
import { CollectionGrid } from "../collection/CollectionGrid";

interface ProfileCollectionProps {
  userId: string;
}

interface UserItem {
  id: string;
  title: string;
  image: string;
  quantity: number;
  anime: string | null;
  artist: string | null;
  created_at: string;
  images: string[] | null;
  official_item_id: string | null;
  official_link: string | null;
  prize: string;
  release_date: string;
  user_id: string;
  user_item_tags?: {
    tags: {
      id: string;
      name: string;
    } | null;
  }[];
}

export function ProfileCollection({ userId }: ProfileCollectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
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
      return data as UserItem[];
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
    const matchesContent = selectedContent.length === 0 || selectedContent.includes(item.anime || "");
    return matchesSearch && matchesTags && matchesContent;
  });

  const gridClass = isCompact
    ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2"
    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">コレクション</h2>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            selectedContent={selectedContent}
            onContentChange={setSelectedContent}
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
          <CollectionGrid
            items={filteredItems}
            isCompact={isCompact}
            isSelectionMode={false}
            selectedItems={[]}
            onSelectItem={() => {}}
            onDragEnd={() => {}}
          />
        )}
      </div>
    </div>
  );
}