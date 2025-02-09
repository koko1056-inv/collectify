
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "./ui/skeleton";
import { useState, useMemo } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { TagManageModal } from "./tag/TagManageModal";
import { ItemMemoriesModal } from "./ItemMemoriesModal";
import { SelectionModeControls } from "./collection/SelectionModeControls";
import { CollectionGrid } from "./collection/CollectionGrid";

interface UserCollectionProps {
  selectedTags: string[];
  userId?: string | null;
}

export function UserCollection({ selectedTags, userId }: UserCollectionProps) {
  const { user } = useAuth();
  const [isCompact, setIsCompact] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionAction, setSelectionAction] = useState<'tags' | 'memories' | null>(null);
  const effectiveUserId = userId || user?.id;
  const queryClient = useQueryClient();

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
      }
      return [...prev, itemId];
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const startSelection = (action: 'tags' | 'memories') => {
    setIsSelectionMode(true);
    setSelectionAction(action);
    setSelectedItems([]);
  };

  const handleActionComplete = () => {
    setIsSelectionMode(false);
    setSelectionAction(null);
    setSelectedItems([]);
    if (selectionAction === 'tags') {
      setIsTagModalOpen(false);
    } else if (selectionAction === 'memories') {
      setIsMemoriesModalOpen(false);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedItems.length === 0) return;
    
    if (selectionAction === 'tags') {
      setIsTagModalOpen(true);
    } else if (selectionAction === 'memories') {
      const selectedItemTitles = selectedItems
        .map(id => items.find(item => item.id === id)?.title)
        .filter((title): title is string => title !== undefined);

      if (selectedItemTitles.length > 0) {
        setIsMemoriesModalOpen(true);
      }
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
      {isSelectionMode && (
        <SelectionModeControls
          selectedItems={selectedItems}
          totalItems={filteredItems.length}
          onSelectAll={handleSelectAll}
          onConfirm={handleConfirmSelection}
          onCancel={() => {
            setIsSelectionMode(false);
            setSelectionAction(null);
            setSelectedItems([]);
          }}
        />
      )}

      <CollectionGrid
        items={filteredItems}
        isCompact={isCompact}
        isSelectionMode={isSelectionMode}
        selectedItems={selectedItems}
        onSelectItem={handleSelectItem}
        onDragEnd={handleDragEnd}
      />

      {isTagModalOpen && selectedItems.length > 0 && (
        <TagManageModal
          isOpen={isTagModalOpen}
          onClose={handleActionComplete}
          itemIds={selectedItems}
          isUserItem={true}
        />
      )}
      {isMemoriesModalOpen && selectedItems.length > 0 && (
        <ItemMemoriesModal
          isOpen={isMemoriesModalOpen}
          onClose={handleActionComplete}
          itemIds={selectedItems}
          itemTitles={selectedItems
            .map(id => items.find(item => item.id === id)?.title)
            .filter((title): title is string => title !== undefined)
          }
          userId={userId}
        />
      )}
    </div>
  );
}
