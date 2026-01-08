import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Hash, TrendingUp } from "lucide-react";

interface TrendingTagsProps {
  onTagClick?: (tagName: string) => void;
  selectedTags?: string[];
}

export function TrendingTags({ onTagClick, selectedTags = [] }: TrendingTagsProps) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data: trendingTags, isLoading } = useQuery({
    queryKey: ["trending-tags"],
    queryFn: async () => {
      // 過去1週間の投稿に紐づくアイテムを取得
      const { data: postsData, error: postsError } = await supabase
        .from("goods_posts")
        .select(`
          user_item_id,
          user_items:user_item_id (
            official_item_id
          )
        `)
        .gte("created_at", oneWeekAgo.toISOString());

      if (postsError) throw postsError;

      // official_item_idsを収集
      const officialItemIds = postsData
        ?.map((post) => (post.user_items as any)?.official_item_id)
        .filter(Boolean) as string[];

      if (!officialItemIds || officialItemIds.length === 0) {
        // 投稿がない場合は人気タグを返す
        const { data: popularTags, error: popularError } = await supabase
          .from("tags")
          .select("id, name, usage_count, category")
          .eq("status", "approved")
          .order("usage_count", { ascending: false })
          .limit(10);

        if (popularError) throw popularError;
        return popularTags || [];
      }

      // これらのアイテムに紐づくタグを取得
      const { data: itemTags, error: itemTagsError } = await supabase
        .from("item_tags")
        .select(`
          tag_id,
          tags:tag_id (id, name, usage_count, category)
        `)
        .in("official_item_id", officialItemIds);

      if (itemTagsError) throw itemTagsError;

      // タグの出現回数をカウント
      const tagCounts: Record<string, { tag: any; count: number }> = {};
      itemTags?.forEach((itemTag) => {
        const tag = itemTag.tags as any;
        if (tag) {
          if (!tagCounts[tag.id]) {
            tagCounts[tag.id] = { tag, count: 0 };
          }
          tagCounts[tag.id].count++;
        }
      });

      // カウント順にソート
      return Object.values(tagCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((item) => ({
          ...item.tag,
          trend_count: item.count,
        }));
    },
    staleTime: 1000 * 60 * 5, // 5分キャッシュ
  });

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "character":
        return "bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300";
      case "series":
        return "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
      case "item_type":
        return "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300";
      default:
        return "bg-muted hover:bg-muted/80";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-wrap gap-2">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-6 w-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!trendingTags || trendingTags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        トレンドタグ
      </h3>
      <div className="flex flex-wrap gap-2">
        {trendingTags.map((tag) => {
          const isSelected = selectedTags.includes(tag.name);
          return (
            <Badge
              key={tag.id}
              variant="secondary"
              className={`
                cursor-pointer text-xs flex items-center gap-1 transition-all
                ${getCategoryColor(tag.category)}
                ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}
              `}
              onClick={() => onTagClick?.(tag.name)}
            >
              <Hash className="h-3 w-3" />
              {tag.name}
              {tag.trend_count && (
                <span className="text-[10px] opacity-70">
                  {tag.trend_count}
                </span>
              )}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
