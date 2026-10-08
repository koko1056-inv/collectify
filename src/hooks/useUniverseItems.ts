import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { UniverseItemInput } from "@/utils/universe/layout";

const PAGE = 1000;
// 1画面に描ける現実的な上限。これ以上は古いお迎えから切り捨てず、新しい側を優先して描く
const MAX_ITEMS = 6000;

/**
 * 推し宇宙に並べる、自分の全グッズ。
 * 棚の絞り込み（タグなど）には左右されないよう、専用に全件を取る。
 * ["user-items", ...] で始まるキーなので、追加・削除のたびに自動で引き直される。
 */
export function useUniverseItems(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["user-items", "universe", userId],
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<UniverseItemInput[]> => {
      const rows: UniverseItemInput[] = [];
      for (let from = 0; from < MAX_ITEMS; from += PAGE) {
        const { data, error } = await supabase
          .from("user_items")
          .select(
            "id, title, image, quantity, content_name, created_at, official_items!user_items_official_item_id_fkey(content_name), user_item_tags(tags(name, category))"
          )
          .eq("user_id", userId!)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        for (const r of data ?? []) {
          const official = r.official_items as { content_name: string | null } | null;
          // 作品名が空のときは、本人がつけた「作品」タグで補う（それも無ければ「その他」）
          const contentTag = (r.user_item_tags as { tags: { name: string; category: string | null } | null }[] | null)
            ?.map((t) => t.tags)
            .find((t) => t?.category === "content")?.name;
          rows.push({
            id: r.id,
            title: r.title ?? "",
            image: r.image ?? "",
            quantity: r.quantity ?? 1,
            contentName: official?.content_name || r.content_name || contentTag || null,
          });
        }
        if (!data || data.length < PAGE) break;
      }
      return rows;
    },
  });
}
