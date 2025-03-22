
import { CardContent as UICardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LikeButton } from "./LikeButton";
import { BookMarked } from "lucide-react";

interface CollectionGoodsCardContentProps {
  id: string;
  isOwner: boolean;
  onMemoriesClick: () => void;
  quantity?: number;
}

export function CollectionGoodsCardContent({
  id,
  isOwner,
  onMemoriesClick,
  quantity = 1
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
    staleTime: 0, // Changed from 1000 to 0 to ensure immediate updates
    refetchInterval: 2000 // Add periodic refetching every 2 seconds
  });

  return <UICardContent className="px-3 py-1 space-y-0.5">
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          <LikeButton itemId={id} />
          <button 
            onClick={e => {
              e.stopPropagation();
              onMemoriesClick();
            }} 
            className="flex flex-col items-center gap-0.5"
            aria-label={`思い出: ${itemMemories.length}件`}
          >
            <div className={`h-7 w-7 sm:h-9 sm:w-9 p-1.5 ${itemMemories.length > 0 ? 'text-green-500' : 'text-gray-400'}`}>
              <BookMarked className="h-full w-full" />
            </div>
            <span className="text-[10px] sm:text-xs -mt-1 text-gray-500">{itemMemories.length}</span>
          </button>
        </div>
      </div>
    </UICardContent>;
}
