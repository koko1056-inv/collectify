
import { CardContent as UICardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LikeButton } from "./LikeButton";
import { BookMarked, Heart } from "lucide-react";

interface CollectionGoodsCardContentProps {
  id: string;
  isOwner: boolean;
  onMemoriesClick: () => void;
  className?: string;
}

export function CollectionGoodsCardContent({
  id,
  isOwner,
  onMemoriesClick,
  className = ""
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
    <UICardContent className={`px-3 py-2 space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-gray-400" />
            <span className="text-[10px] text-gray-500">0</span>
          </div>
          <div className="flex items-center gap-1">
            <BookMarked className="h-3 w-3 text-gray-400" />
            <span className="text-[10px] text-gray-500">{itemMemories.length || 0}</span>
          </div>
        </div>
      </div>
    </UICardContent>
  );
}
