import { CardContent as UICardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TagList } from "./TagList";
import { LikeButton } from "./LikeButton";
import { BookMarked, Medal, Star, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CollectionGoodsCardContentProps {
  id: string;
  isOwner: boolean;
  onMemoriesClick: () => void;
}

export function CollectionGoodsCardContent({
  id,
  isOwner,
  onMemoriesClick,
}: CollectionGoodsCardContentProps) {
  const { data: itemTags = [] } = useQuery({
    queryKey: ["user-item-tags", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("user_item_tags")
        .select(`
          tag_id,
          tags (
            id,
            name
          )
        `)
        .eq("user_item_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

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
    staleTime: 1000,
  });

  const memoriesCount = itemMemories.length;

  return (
    <UICardContent className="px-3 py-2 space-y-1">
      <TagList tags={itemTags} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LikeButton itemId={id} />
          {itemMemories.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMemoriesClick();
              }}
              className="flex flex-col items-center gap-0.5"
            >
              <div className="h-7 w-7 sm:h-9 sm:w-9 p-1.5 text-purple-500">
                <BookMarked className="h-full w-full" />
              </div>
              <span className="text-[10px] sm:text-xs text-purple-500 -mt-1">{itemMemories.length}</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {memoriesCount >= 1 && memoriesCount < 10 && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
              <Medal className="h-3 w-3 mr-1" />
              1日達成
            </Badge>
          )}
          {memoriesCount >= 10 && memoriesCount < 100 && (
            <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
              <Star className="h-3 w-3 mr-1" />
              10日達成
            </Badge>
          )}
          {memoriesCount >= 100 && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              <Trophy className="h-3 w-3 mr-1" />
              100日達成
            </Badge>
          )}
        </div>
      </div>
    </UICardContent>
  );
}