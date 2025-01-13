import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MyCollectionGoodsCard } from "./collection/MyCollectionGoodsCard";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Grid, List, Tags, PlusCircle } from "lucide-react";
import { useState, useMemo, memo } from "react";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { TagManageModal } from "./tag/TagManageModal";
import { ItemMemoriesModal } from "./ItemMemoriesModal";

interface UserCollectionProps {
  selectedTags: string[];
  userId?: string | null;
}

const MemoizedMyCollectionGoodsCard = memo(MyCollectionGoodsCard);

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

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

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

  const filteredItems = useMemo(() => {
    if (selectedTags.length === 0) return items;
    
    return items.filter(item => 
      selectedTags.some(tag => 
        item.user_item_tags?.some(itemTag => itemTag.tags?.name === tag)
      )
    );
  }, [items, selectedTags]);

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
      const selectedItem = items.find(item => item.id === selectedItems[0]);
      if (selectedItem) {
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

  const gridClass = isCompact
    ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2"
    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {isSelectionMode ? (
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedItems.length === filteredItems.length ? "選択解除" : "全て選択"}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedItems.length}個選択中
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleConfirmSelection}
                  disabled={selectedItems.length === 0}
                >
                  確定
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectionAction(null);
                    setSelectedItems([]);
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startSelection('tags')}
                className="gap-2"
              >
                <Tags className="h-4 w-4" />
                <span>タグを管理</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startSelection('memories')}
                className="gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                <span>記録を追加</span>
              </Button>
            </>
          )}
        </div>
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={filteredItems} strategy={rectSortingStrategy}>
          <div className={gridClass}>
            {filteredItems.map((item) => (
              <div key={item.id} className="relative">
                {isSelectionMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="w-4 h-4"
                    />
                  </div>
                )}
                <MemoizedMyCollectionGoodsCard
                  id={item.id}
                  title={item.title}
                  image={item.image}
                  quantity={item.quantity}
                  isCompact={isCompact}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
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
          itemId={selectedItems[0]}
          itemTitle={items.find(item => item.id === selectedItems[0])?.title || ""}
        />
      )}
    </div>
  );
}
