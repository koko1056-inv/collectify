import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * カタログのグッズを「ほしいもの」に入れて、関係する表示を引き直す。
 *
 * 追加シートの「ほしい」と、コンプの「あと1個」の両方から使う。
 * 引き直すキーが場所ごとにずれると、片方の画面だけ古い表示が残るので、ここにまとめる。
 * キーは既存のウィッシュ追加（MemoizedOfficialGoodsCard）と揃えてある。
 */
export async function addOfficialItemToWishlist(
  queryClient: QueryClient,
  userId: string,
  officialItemId: string
): Promise<void> {
  const { error } = await supabase.from("wishlists").insert({
    user_id: userId,
    official_item_id: officialItemId,
  });
  if (error) throw error;
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["wished-official-item-ids", userId], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: ["wishlist"], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: ["wishlist-counts"] }),
    queryClient.invalidateQueries({ queryKey: ["is-in-wishlist", officialItemId, userId] }),
    // 交換のマッチングは「ほしいもの」からも計算している
    queryClient.invalidateQueries({ queryKey: ["trade-matches", userId] }),
    queryClient.invalidateQueries({ queryKey: ["trade-series-partners", userId] }),
    queryClient.invalidateQueries({ queryKey: ["trade-readiness", userId] }),
    queryClient.invalidateQueries({ queryKey: ["onboarding-checklist", userId] }),
  ]);
}

/** 自分の「ほしいもの」に入っている公式グッズのID。追加シートとコンプの「あと1個」で同じキャッシュを使う */
export const wishedOfficialIdsKey = (userId: string | null | undefined) => ["wished-official-item-ids", userId] as const;

export async function fetchWishedOfficialIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("wishlists")
    .select("official_item_id")
    .eq("user_id", userId)
    .not("official_item_id", "is", null);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.official_item_id as string));
}
