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
  // (user_id, official_item_id) は一意。別の画面で先に入れていた（23505）なら、入っているので成功として扱う
  if (error && error.code !== "23505") throw error;
  await invalidateWishlistChanged(queryClient, userId, officialItemId);
}

/**
 * カタログのグッズを「ほしいもの」から外して、関係する表示を引き直す（カードの「ほしい」ボタンを外したとき）。
 * 自分の行だけを消す（RLS でも本人の行しか消せない）。
 */
export async function removeOfficialItemFromWishlist(
  queryClient: QueryClient,
  userId: string,
  officialItemId: string
): Promise<void> {
  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", userId)
    .eq("official_item_id", officialItemId);
  if (error) throw error;
  await invalidateWishlistChanged(queryClient, userId, officialItemId);
}

/** ほしいものを足した・外したあとに引き直すキー。追加と削除でずれないよう 1 か所にまとめる */
async function invalidateWishlistChanged(queryClient: QueryClient, userId: string, officialItemId: string) {
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
    // グッズのページ（/item/:id）の「ほしい」表示
    queryClient.invalidateQueries({ queryKey: ["public-item-state", userId, officialItemId] }),
  ]);
}

/** 自分の「ほしいもの」に入っている公式グッズのID。追加シートとコンプの「あと1個」で同じキャッシュを使う */
export const wishedOfficialIdsKey = (userId: string | null | undefined) => ["wished-official-item-ids", userId] as const;

/** PostgREST が 1 回で返せる上限（既定 1000 行）。カードの「ほしい」でたくさん入れる人もいるので、ページ送りで全部読む */
const WISHED_PAGE = 1000;

export async function fetchWishedOfficialIds(userId: string): Promise<Set<string>> {
  const out = new Set<string>();
  for (let page = 0; ; page += 1) {
    const { data, error } = await supabase
      .from("wishlists")
      .select("official_item_id")
      .eq("user_id", userId)
      .not("official_item_id", "is", null)
      .order("id", { ascending: true })
      .range(page * WISHED_PAGE, (page + 1) * WISHED_PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) if (r.official_item_id) out.add(r.official_item_id as string);
    if (!data || data.length < WISHED_PAGE) break;
  }
  return out;
}
