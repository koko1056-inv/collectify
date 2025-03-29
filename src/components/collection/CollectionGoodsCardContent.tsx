
import { CardContent as UICardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LikeButton } from "./LikeButton";
import { BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CollectionGoodsCardContentProps {
  id: string;
  isOwner: boolean;
  onMemoriesClick: () => void;
}

export function CollectionGoodsCardContent({
  id,
  isOwner,
  onMemoriesClick
}: CollectionGoodsCardContentProps) {
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
    refetchOnWindowFocus: true,
    staleTime: 0,
    refetchInterval: 2000
  });

  return (
    <UICardContent className="px-2 py-1 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <LikeButton itemId={id} />
          <span className="text-[10px] text-gray-500">0</span>
        </div>
        <div className="flex items-center gap-1">
          <BookMarked className="h-4 w-4 text-gray-400" />
          <span className="text-[10px] text-gray-500">{itemMemories.length}</span>
        </div>
      </div>
      <Button 
        variant="default" 
        className="w-full h-8 bg-gray-900 hover:bg-gray-800 text-xs rounded-md"
        onClick={(e) => {
          e.stopPropagation();
          onMemoriesClick();
        }}
      >
        記録を追加
      </Button>
    </UICardContent>
  );
}
