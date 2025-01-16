import { Card } from "@/components/ui/card";
import { CardImage } from "./CardImage";
import { CollectionGoodsCard } from "../CollectionGoodsCard";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MyCollectionGoodsCardProps {
  id: string;
  title: string;
  image: string;
  quantity?: number;
  isCompact?: boolean;
}

function MyCollectionGoodsCardComponent({ 
  id, 
  title, 
  image,
  quantity,
  isCompact 
}: MyCollectionGoodsCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const { data: itemMemories = [] } = useQuery({
    queryKey: ["item-memories", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("item_memories")
        .select("*")
        .eq("user_item_id", id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching memories:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
  };

  if (isCompact) {
    return (
      <Card 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="hover-scale card-shadow bg-white border border-gray-200"
      >
        <CardImage image={image} title={title} memoriesCount={itemMemories.length} />
      </Card>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <CollectionGoodsCard
        id={id}
        title={title}
        image={image}
        quantity={quantity}
        memoriesCount={itemMemories.length}
      />
    </div>
  );
}

export const MemoizedMyCollectionGoodsCard = memo(MyCollectionGoodsCardComponent);