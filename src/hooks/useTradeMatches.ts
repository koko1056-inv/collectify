import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TradeMatchItem {
  id: string;
  title: string;
  image: string;
}

export interface TradeMatch {
  partner_id: string;
  partner_username: string | null;
  partner_avatar_url: string | null;
  /** 両想い。相手の出しているものが欲しくて、相手も自分の出しているものを欲しがっている */
  is_mutual: boolean;
  /** 相手が交換に出していて、自分が欲しいもの */
  their_items: TradeMatchItem[];
  /** 自分が交換に出していて、相手が欲しいもの */
  my_items: TradeMatchItem[];
}

/** jsonb で返ってくるので、配列以外が来ても落ちないようにしておく */
function toItems(value: unknown): TradeMatchItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is TradeMatchItem =>
      !!v && typeof v === "object" && typeof (v as TradeMatchItem).id === "string"
  );
}

/**
 * 交換相手の候補。
 *
 * 突き合わせはサーバー側の find_trade_matches に任せている。
 * 以前はブラウザで最大5000行を引いて総当たりしていたが、
 * 件数が増えると成立しないうえ、「相手も自分のものを欲しがっているか」を
 * 見ていなかったので、片想いばかりが並んでいた。
 */
export function useTradeMatches() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trade-matches", user?.id],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<TradeMatch[]> => {
      const { data, error } = await supabase.rpc("find_trade_matches", { _limit: 30 });
      if (error) throw error;

      return (data ?? []).map((row) => ({
        partner_id: row.partner_id,
        partner_username: row.partner_username,
        partner_avatar_url: row.partner_avatar_url,
        is_mutual: row.is_mutual,
        their_items: toItems(row.their_items),
        my_items: toItems(row.my_items),
      }));
    },
  });
}

/**
 * マッチが出ない理由を切り分けるための材料。
 * ウィッシュが空なのか、交換に出しているグッズが無いのかで案内を変える。
 */
export function useTradeReadiness() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trade-readiness", user?.id],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [wish, offers] = await Promise.all([
        supabase
          .from("wishlists")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id),
        supabase
          .from("user_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("for_trade", true),
      ]);

      if (wish.error) throw wish.error;
      if (offers.error) throw offers.error;

      return { wishCount: wish.count ?? 0, offerCount: offers.count ?? 0 };
    },
  });
}
