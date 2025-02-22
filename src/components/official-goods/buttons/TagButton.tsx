
import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface TagButtonProps {
  onClick: (e: React.MouseEvent) => void;
  tagCount: number;
  itemId: string;
}

export function TagButton({ onClick, tagCount: initialTagCount, itemId }: TagButtonProps) {
  const [realtimeTagCount, setRealtimeTagCount] = useState(initialTagCount);

  const { data: currentTagCount = 0 } = useQuery({
    queryKey: ["item-tags-count", itemId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("item_tags")
        .select("*", { count: 'exact', head: true })
        .eq("official_item_id", itemId);
      
      if (error) {
        console.error("Error getting tag count:", error);
        return 0;
      }
      
      return count || 0;
    },
    initialData: initialTagCount,
  });

  useEffect(() => {
    setRealtimeTagCount(currentTagCount);
  }, [currentTagCount]);

  useEffect(() => {
    const channel = supabase
      .channel('tag-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_tags',
          filter: `official_item_id=eq.${itemId}`
        },
        async () => {
          const { count, error } = await supabase
            .from("item_tags")
            .select("*", { count: 'exact', head: true })
            .eq("official_item_id", itemId);
          
          if (error) {
            console.error("Error getting realtime tag count:", error);
            return;
          }
          
          setRealtimeTagCount(count || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId]);

  return (
    <div className="flex flex-col items-center">
      <Button
        variant="outline"
        size="icon"
        onClick={onClick}
        className="border-gray-200 hover:bg-gray-50 h-7 w-7 sm:h-9 sm:w-9"
      >
        <Tag className="h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
      <span className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">{realtimeTagCount}</span>
    </div>
  );
}
