
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "./ui/skeleton";
import { useState, useMemo, useEffect } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { CollectionGrid } from "./collection/CollectionGrid";
import { SearchBar } from "./SearchBar";

interface UserCollectionProps {
  selectedTags: string[];
  userId?: string | null;
}

export function UserCollection({ selectedTags, userId }: UserCollectionProps) {
  const { user } = useAuth();
  const [isCompact, setIsCompact] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const effectiveUserId = userId || user?.id;
  const queryClient = useQueryClient();

  const { data: items = [], isLoading: isItemsLoading } = useQuery({
    queryKey: ["user-items", effectiveUserId, selectedTags],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      console.log("Fetching user items for userId:", effectiveUserId);
      
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
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching user items:", error);
        throw error;
      }
      
      console.log("Fetched user items:", data?.length || 0);
      return data || [];
    },
    enabled: !!effectiveUserId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const filteredItems = useMemo(() => {
    console.log("Filtering items. Total items:", items.length);
    console.log("Selected tags:", selectedTags);
    console.log("Search query:", searchQuery);
    
    // タグフィルターを適用
    let filtered = items;
    if (selectedTags.length > 0) {
      filtered = items.filter(item => 
        selectedTags.some(tag => 
          item.user_item_tags?.some(itemTag => itemTag.tags?.name === tag)
        )
      );
      console.log("After tag filtering:", filtered.length);
    }
    
    // 検索クエリを適用（リアルタイム検索）
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query)
      );
      console.log("After search filtering:", filtered.length);
    }
    
    console.log("Final filtered items:", filtered.length);
    return filtered;
  }, [items, selectedTags, searchQuery]);

  // 検索クエリの変更をログに出力
  useEffect(() => {
    console.log("Search query changed to:", searchQuery);
  }, [searchQuery]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      
      const newItems = arrayMove([...items], oldIndex, newIndex);
      queryClient.setQueryData(["user-items", effectiveUserId, selectedTags], newItems);
    }
  };

  const handleSearchChange = (query: string) => {
    console.log("Search change triggered with query:", query);
    // リアルタイム検索のために、入力の度に検索クエリを更新
    setSearchQuery(query);
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId) 
        : [...prev, itemId]
    );
  };

  const toggleCompactView = () => {
    setIsCompact(!isCompact);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (!isSelectionMode) {
      setSelectedItems([]);
    }
  };

  if (!effectiveUserId) {
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

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">まだコレクションに追加されたアイテムがありません。</p>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">条件に一致するアイテムがありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <SearchBar 
          searchQuery={searchQuery} 
          onSearchChange={handleSearchChange}
          selectedTags={[]} 
          onTagsChange={() => {}} 
          tags={[]}
        />
      </div>
      
      <CollectionGrid
        items={filteredItems}
        isCompact={isCompact}
        isSelectionMode={isSelectionMode}
        selectedItems={selectedItems}
        onSelectItem={handleSelectItem}
        onDragEnd={handleDragEnd}
      />
    </div>
  );
}
