
import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface TagButtonProps {
  onClick: (e: React.MouseEvent) => void;
  itemId: string;
  isUserItem?: boolean;
}

export function TagButton({ onClick, itemId, isUserItem = false }: TagButtonProps) {
  // カテゴリ別タグ数を取得するクエリ（改善版）
  const { data: categoryCounts = { character: 0, type: 0, series: 0, total: 0 }, refetch } = useQuery({
    queryKey: ["item-category-tags-count", itemId, isUserItem],
    queryFn: async () => {
      const table = isUserItem ? "user_item_tags" : "item_tags";
      const idField = isUserItem ? "user_item_id" : "official_item_id";
      
      console.log(`[TagButton] Fetching category counts for ${itemId}`);
      
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
        console.error("Error getting category tag counts:", error);
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
      
      // 総数は実際のタグ数ではなく、設定されているカテゴリの数
      counts.total = uniqueCategories.size;
      
      console.log(`[TagButton] Category counts for ${itemId}:`, counts);
      console.log(`[TagButton] Unique categories: ${Array.from(uniqueCategories).join(', ')}`);
      return counts;
    },
    enabled: !!itemId,
    staleTime: 0, // 常に最新データを取得
    refetchOnWindowFocus: true, // ウィンドウフォーカス時に再取得
    refetchOnMount: true, // マウント時に再取得
  });

  // リアルタイム更新の設定（強化版）
  useEffect(() => {
    if (!itemId) return;

    const table = isUserItem ? "user_item_tags" : "item_tags";
    const idField = isUserItem ? "user_item_id" : "official_item_id";
    
    // タグ変更のリアルタイム監視
    const tagChannel = supabase
      .channel(`tag-changes-${isUserItem ? 'user' : 'official'}-${itemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `${idField}=eq.${itemId}`
        },
        async (payload) => {
          console.log(`[TagButton] Tag change detected for ${table} ${itemId}`, payload);
          
          // 少し遅延してからリフェッチ（DB反映を待つ）
          setTimeout(async () => {
            await refetch();
          }, 100);
        }
      )
      .subscribe();

    // タグテーブル自体の変更も監視
    const tagsChannel = supabase
      .channel(`tags-changes-${itemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tags'
        },
        async (payload) => {
          console.log(`[TagButton] Tags table change detected for ${itemId}`, payload);
          
          // 少し遅延してからリフェッチ
          setTimeout(async () => {
            await refetch();
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tagChannel);
      supabase.removeChannel(tagsChannel);
    };
  }, [itemId, isUserItem, refetch]);

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
}
