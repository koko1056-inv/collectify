import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "./ui/skeleton";
import { useState, useMemo } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { CollectionGrid } from "./collection/CollectionGrid";
import { Button } from "./ui/button";
import { Dices } from "lucide-react";
import { RandomCollectionItemModal } from "./collection/RandomCollectionItemModal";
import { CollectionViewToggle } from "./collection/CollectionViewToggle";

interface UserCollectionProps {
  selectedTags: string[];
  userId?: string | null;
  selectedContent?: string;
  onContentChange?: (content: string) => void;
}

export function UserCollection({
  selectedTags,
  userId,
  selectedContent,
  onContentChange,
}: UserCollectionProps) {
  const { user } = useAuth();
  const [isCompact, setIsCompact] = useState(false);
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);
  const effectiveUserId = userId || user?.id;
  const queryClient = useQueryClient();

  const { data: items = [], isLoading: isItemsLoading } = useQuery({
    queryKey: ["user-items", effectiveUserId, selectedTags],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const query = supabase.from("user_items").select(`
          *,
          user_item_tags (
            tags (
              id,
              name
            )
          )
        `).eq("user_id", effectiveUserId).order("created_at", {
        ascending: false
      });
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10
  });

  // content_nameでのフィルタを追加
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item =>
        selectedTags.some(tag =>
          item.user_item_tags?.some(itemTag => itemTag.tags?.name === tag)
        )
      );
    }
    if (selectedContent && selectedContent !== "all") {
      filtered = filtered.filter(item => {
        // TypeScript エラーを回避するために、content_nameプロパティの存在を確認
        return 'content_name' in item && item.content_name === selectedContent;
      });
    }
    return filtered;
  }, [items, selectedTags, selectedContent]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      const newItems = arrayMove([...items], oldIndex, newIndex);
      queryClient.setQueryData(["user-items", effectiveUserId, selectedTags], newItems);
    }
  };

  if (!effectiveUserId) {
    return <div className="text-center py-8">
        <p className="text-gray-500">コレクションを表示するにはログインしてください。</p>
      </div>;
  }
  if (isItemsLoading) {
    return <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {[...Array(8)].map((_, i) => <div key={i} className="space-y-3">
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>)}
      </div>;
  }
  if (items.length === 0) {
    return <div className="text-center py-8">
        <p className="text-gray-500">まだコレクションに追加されたアイテムがありません。</p>
      </div>;
  }
  if (filteredItems.length === 0) {
    return <div className="text-center py-8">
        <p className="text-gray-500">選択されたタグやコンテンツに一致するアイテムがありません。</p>
      </div>;
  }
  return <div className="space-y-4 my-0 mx-0 px-0 py-px">
      <div className="flex justify-center mb-4">
        <Button onClick={() => setIsRandomModalOpen(true)} variant="outline" className="gap-2">
          <Dices className="h-4 w-4" />
          今日のコレクション
        </Button>
      </div>
      
      <CollectionViewToggle userId={effectiveUserId} items={filteredItems} isCompact={isCompact} handleDragEnd={handleDragEnd} />

      <RandomCollectionItemModal isOpen={isRandomModalOpen} onClose={() => setIsRandomModalOpen(false)} userId={effectiveUserId} />
    </div>;
}
