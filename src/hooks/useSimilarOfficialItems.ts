import { supabase } from "@/integrations/supabase/client";

export interface SimilarOfficialItem {
  id: string;
  title: string;
  image: string;
  content_name: string | null;
  owner_count: number;
  wish_count: number;
}

/**
 * 登録しようとしている名前で、既存のカタログに同じ見出しのものがないか調べる。
 *
 * 見つかっても登録は止めない。呼び出し側は候補を人に見せて、
 * 「同じもの」か「同名の別商品」かを選ばせる。
 *
 * 失敗しても登録の邪魔はしない。確認は登録より重要ではないので、
 * ここで例外を投げると、通信が不安定なときに登録できなくなってしまう。
 */
export async function fetchSimilarOfficialItems(
  title: string,
  contentName?: string | null
): Promise<SimilarOfficialItem[]> {
  const trimmed = title?.trim();
  if (!trimmed) return [];

  try {
    const { data, error } = await supabase.rpc("find_similar_official_items", {
      _title: trimmed,
      _content_name: contentName?.trim() || null,
      _limit: 8,
    });
    if (error) throw error;
    return (data ?? []) as SimilarOfficialItem[];
  } catch (e) {
    console.error("similar item lookup failed:", e);
    return [];
  }
}
