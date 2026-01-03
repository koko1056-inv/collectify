import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import { useEffect, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface TagButtonProps {
  onClick: (e: React.MouseEvent) => void;
  itemId: string;
  isUserItem?: boolean;
}

export const TagButton = memo(function TagButton({ onClick, itemId, isUserItem = false }: TagButtonProps) {
  const queryClient = useQueryClient();
  
  // カテゴリ別タグ数を取得するクエリ（最適化版）
  const { data: categoryCounts = { character: 0, type: 0, series: 0, total: 0 } } = useQuery({
    queryKey: ["item-category-tags-count", itemId, isUserItem],
    queryFn: async () => {
      const table = isUserItem ? "user_item_tags" : "item_tags";
      const idField = isUserItem ? "user_item_id" : "official_item_id";
      
      const { data, error } = await supabase
        .from(table)
        .select(`
          tag_id,
          tags:tag_id (
            id,
            name,
            category
          )
        `)
        .eq(idField, itemId);
      
      if (error) {
        return { character: 0, type: 0, series: 0, total: 0 };
      }
      
      const counts = { character: 0, type: 0, series: 0, total: 0 };
      const uniqueCategories = new Set();
      
      data?.forEach(item => {
        const category = item.tags?.category;
        if (category && ['character', 'type', 'series'].includes(category)) {
          counts[category as keyof typeof counts]++;
          uniqueCategories.add(category);
        }
      });
      
      counts.total = uniqueCategories.size;
      return counts;
    },
    enabled: !!itemId,
    staleTime: 1000 * 60 * 2, // 2分間キャッシュ
    gcTime: 1000 * 60 * 10, // 10分間保持
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // リアルタイム更新は削除 - 過剰なリクエストを防止
  // タグ変更時はユーザーアクション後にinvalidateQueriesで更新

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
      <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 text-center">
        {categoryCounts.total || 0}
      </div>
    </div>
  );
});
