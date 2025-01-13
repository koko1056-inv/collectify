import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MyCollectionGoodsCard } from "./collection/MyCollectionGoodsCard";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Grid, List } from "lucide-react";
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

interface UserCollectionProps {
  selectedTags: string[];
}

// Memoize MyCollectionGoodsCard
const MemoizedMyCollectionGoodsCard = memo(MyCollectionGoodsCard);

export function UserCollection({ selectedTags }: UserCollectionProps) {
  const { user } = useAuth();
  const [isCompact, setIsCompact] = useState(false);
  const [items, setItems] = useState<any[]>([]);

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

  const { isLoading: isItemsLoading } = useQuery({
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
      setItems(data);
      return data;
    },
    enabled: !!user,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Memoize filtered items
  const filteredItems = useMemo(() => {
    if (selectedTags.length === 0) return items;
    
    return items.filter(item => 
      selectedTags.some(tag => 
        item.user_item_tags?.some(itemTag => itemTag.tags?.name === tag)
      )
    );
  }, [items, selectedTags]);

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
      <div className="flex justify-end">
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
              <MemoizedMyCollectionGoodsCard
                key={item.id}
                id={item.id}
                title={item.title}
                image={item.image}
                quantity={item.quantity}
                isCompact={isCompact}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}