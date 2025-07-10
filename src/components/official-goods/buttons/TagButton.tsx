
import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface TagButtonProps {
  onClick: (e: React.MouseEvent) => void;
  tagCount: number;
  itemId: string;
  isUserItem?: boolean;
}

export function TagButton({ onClick, tagCount: initialTagCount, itemId, isUserItem = false }: TagButtonProps) {
  const [realtimeTagCount, setRealtimeTagCount] = useState(initialTagCount);

  // タグ数を取得するクエリ
  const { data: currentTagCount = 0 } = useQuery({
    queryKey: ["item-tags-count", itemId, isUserItem],
    queryFn: async () => {
      const table = isUserItem ? "user_item_tags" : "item_tags";
      const idField = isUserItem ? "user_item_id" : "official_item_id";
      
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: 'exact', head: true })
        .eq(idField, itemId);
      
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

  // リアルタイム更新の設定
  useEffect(() => {
    const table = isUserItem ? "user_item_tags" : "item_tags";
    const idField = isUserItem ? "user_item_id" : "official_item_id";
    
    const channel = supabase
      .channel(`tag-changes-${isUserItem ? 'user' : 'official'}-${itemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `${idField}=eq.${itemId}`
        },
        async () => {
          console.log(`[TagButton] Real-time update detected for ${table} ${itemId}`);
          
          const { count, error } = await supabase
            .from(table)
            .select("*", { count: 'exact', head: true })
            .eq(idField, itemId);
          
          if (error) {
            console.error("Error getting realtime tag count:", error);
            return;
          }
          
          console.log(`[TagButton] Updated tag count for ${itemId}: ${count}`);
          setRealtimeTagCount(count || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, isUserItem]);

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
