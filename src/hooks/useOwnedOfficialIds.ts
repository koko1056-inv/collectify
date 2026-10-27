import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** PostgREST が 1 回で返せる上限（既定 1000 行）。 */
const PAGE = 1000;

/**
 * 自分が持っている公式グッズの id（Set）。
 *
 * AddGoodsSheet の「一覧から選ぶ」と同じクエリキー ["owned-official-item-ids", uid]・同じ形（Set<string>）にして、
 * キャッシュを共有する（TradeCard・ItemPublic などが出している invalidate もそのまま効く）。
 * 1000 件を超えて持っている人もいるので、id 順にページ送りして全部読む。
 * ゲスト（未ログイン）は null。
 */
export const ownedOfficialIdsKey = (uid: string | null | undefined) => ["owned-official-item-ids", uid] as const;

export async function fetchOwnedOfficialIds(uid: string): Promise<Set<string>> {
  const out = new Set<string>();
  for (let page = 0; ; page += 1) {
    const { data, error } = await supabase
      .from("user_items")
      .select("official_item_id")
      .eq("user_id", uid)
      .not("official_item_id", "is", null)
      .order("id", { ascending: true })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) if (r.official_item_id) out.add(r.official_item_id as string);
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export function useOwnedOfficialIds() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const query = useQuery({
    queryKey: ownedOfficialIdsKey(uid),
    enabled: !!uid,
    staleTime: 1000 * 60,
    queryFn: () => fetchOwnedOfficialIds(uid!),
  });
  return { ...query, ownedIds: uid ? query.data ?? null : null, isGuest: !uid };
}
