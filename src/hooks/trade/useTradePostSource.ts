import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TradePostGoods {
  /** 譲: user_items の id / 求: wishlists の id */
  id: string;
  title: string;
  image: string | null;
  content_name: string | null;
  quantity: number;
}

// 読み込む前の空の一覧。毎回 [] を作ると、受け取る側の useEffect が描くたびに動いてしまう
const EMPTY: TradePostGoods[] = [];

/**
 * 「譲・求」画像の材料。
 *  - 譲: 交換に出しているグッズ（user_items.for_trade = true）。数量（quantity）も出す
 *  - 求: ほしいものリスト（wishlists → official_items）
 * どちらも新しい順。作品で絞るので作品名（content_name）も読む。
 */
export function useTradePostSource(enabled: boolean) {
  const { user } = useAuth();
  const uid = user?.id;

  const give = useQuery({
    queryKey: ["trade-post-give", uid],
    enabled: enabled && !!uid,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<TradePostGoods[]> => {
      const { data, error } = await supabase
        .from("user_items")
        .select("id, title, image, quantity, content_name")
        .eq("user_id", uid!)
        .eq("for_trade", true)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((r) => ({ id: r.id, title: r.title, image: r.image, content_name: r.content_name, quantity: Math.max(r.quantity ?? 1, 1) }));
    },
  });

  const want = useQuery({
    queryKey: ["trade-post-want", uid],
    enabled: enabled && !!uid,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<TradePostGoods[]> => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("id, official_items ( id, title, image, content_name )")
        .eq("user_id", uid!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? [])
        .filter((r) => r.official_items)
        .map((r) => {
          const o = r.official_items as { title: string; image: string | null; content_name: string | null };
          return { id: r.id, title: o.title, image: o.image, content_name: o.content_name, quantity: 1 };
        });
    },
  });

  return {
    give: give.data ?? EMPTY,
    want: want.data ?? EMPTY,
    isLoading: give.isLoading || want.isLoading,
    isError: give.isError || want.isError,
    refetch: () => {
      void give.refetch();
      void want.refetch();
    },
  };
}
