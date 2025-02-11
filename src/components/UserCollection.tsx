
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "./ui/skeleton";
import { useState, useMemo } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { CollectionGrid } from "./collection/CollectionGrid";
import { CollectionActions } from "./collection/CollectionActions";
import { TagManageModal } from "./tag/TagManageModal";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

interface UserCollectionProps {
  selectedTags: string[];
  userId?: string | null;
}

export function UserCollection({ selectedTags, userId }: UserCollectionProps) {
  const { user } = useAuth();
  const [isCompact, setIsCompact] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isTagManageModalOpen, setIsTagManageModalOpen] = useState(false);
  const effectiveUserId = userId || user?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items = [], isLoading: isItemsLoading } = useQuery({
    queryKey: ["user-items", effectiveUserId, selectedTags],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
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

      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const filteredItems = useMemo(() => {
    if (selectedTags.length === 0) return items;
    
    return items.filter(item => 
      selectedTags.some(tag => 
        item.user_item_tags?.some(itemTag => itemTag.tags?.name === tag)
      )
    );
  }, [items, selectedTags]);

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

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleSelectionModeToggle = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedItems([]);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
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
        <p className="text-gray-500">選択されたタグに一致するアイテムがありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectionModeToggle}
          >
            {isSelectionMode ? "選択を終了" : "アイテムを選択"}
          </Button>
          {isSelectionMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedItems.length === filteredItems.length ? "全て解除" : "全て選択"}
              </Button>
              {selectedItems.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTagManageModalOpen(true)}
                >
                  タグを管理 ({selectedItems.length}個)
                </Button>
              )}
            </>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCompact(!isCompact)}
        >
          {isCompact ? "通常表示" : "コンパクト表示"}
        </Button>
      </div>

      <CollectionGrid
        items={filteredItems}
        isCompact={isCompact}
        isSelectionMode={isSelectionMode}
        selectedItems={selectedItems}
        onSelectItem={handleSelectItem}
        onDragEnd={handleDragEnd}
      />

      <TagManageModal
        isOpen={isTagManageModalOpen}
        onClose={() => {
          setIsTagManageModalOpen(false);
          setIsSelectionMode(false);
          setSelectedItems([]);
        }}
        itemIds={selectedItems}
        isUserItem={true}
      />
    </div>
  );
}
