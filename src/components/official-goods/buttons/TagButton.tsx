
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

  // カテゴリ別のタグ数を取得するクエリ
  const { data: categoryTagCounts = { character: 0, type: 0, series: 0 } } = useQuery({
    queryKey: ["item-category-tags-count", itemId, isUserItem],
    queryFn: async () => {
      const table = isUserItem ? "user_item_tags" : "item_tags";
      const idField = isUserItem ? "user_item_id" : "official_item_id";
      
      // カテゴリ別にタグ数を取得
      const { data: tags, error } = await supabase
        .from(table)
        .select(`
          tags!inner(category)
        `)
        .eq(idField, itemId);
      
      if (error) {
        console.error("Error getting category tag counts:", error);
        return { character: 0, type: 0, series: 0 };
      }
      
      // カテゴリごとにカウント
      const counts = { character: 0, type: 0, series: 0 };
      tags?.forEach((item: any) => {
        const category = item.tags?.category;
        if (category && counts.hasOwnProperty(category)) {
          counts[category as keyof typeof counts]++;
        }
      });
      
      return counts;
    },
    initialData: { character: 0, type: 0, series: 0 },
  });

  const [realtimeCategoryCounts, setRealtimeCategoryCounts] = useState(categoryTagCounts);

  useEffect(() => {
    setRealtimeCategoryCounts(categoryTagCounts);
  }, [categoryTagCounts]);

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
          
          // カテゴリ別タグ数を再取得
          const { data: tags, error } = await supabase
            .from(table)
            .select(`
              tags!inner(category)
            `)
            .eq(idField, itemId);
          
          if (error) {
            console.error("Error getting realtime category tag counts:", error);
            return;
          }
          
          const counts = { character: 0, type: 0, series: 0 };
          tags?.forEach((item: any) => {
            const category = item.tags?.category;
            if (category && counts.hasOwnProperty(category)) {
              counts[category as keyof typeof counts]++;
            }
          });
          
          console.log(`[TagButton] Updated category counts for ${itemId}:`, counts);
          setRealtimeCategoryCounts(counts);
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
      <div className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5 sm:mt-1 text-center leading-tight">
        <div>キャラ:{realtimeCategoryCounts.character}</div>
        <div>タイプ:{realtimeCategoryCounts.type}</div>
        <div>シリーズ:{realtimeCategoryCounts.series}</div>
      </div>
    </div>
  );
}
