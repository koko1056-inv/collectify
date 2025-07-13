
import { CardContent as UICardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LikeButton } from "./LikeButton";
import { BookMarked } from "lucide-react";

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
    staleTime: 0, // Changed from 1000 to 0 to ensure immediate updates
    refetchInterval: 2000 // Add periodic refetching every 2 seconds
  });

  return <UICardContent className="px-3 py-1 space-y-0.5">
    </UICardContent>;
}
