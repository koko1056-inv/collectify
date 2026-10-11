import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * 交換の「注目」（スポットライト）。
 *
 * ポイントを使って、一定時間だけ自分の交換グッズを相手側の一覧で先に出す。
 * 値段と時間はサーバー（trade_spotlight_plans）が持つ。ここでは表示と呼び出しだけ。
 * 並び替えは find_trade_matches などの RPC の中で済んでいるので、
 * 画面側は「注目」の印を付けるだけでよい。
 */

export interface SpotlightPlan {
  duration: string;
  hours: number;
  price: number;
}

export interface MySpotlight {
  /** いま注目が効いているか */
  active: boolean;
  /** 続けて買った分も含めた終わりの時刻。注目していなければ null */
  endsAt: string | null;
  /** 先の予約は「今から何時間先」まで（延長の上限） */
  maxHours: number;
  plans: SpotlightPlan[];
}

type RawSpotlight = {
  active?: boolean;
  ends_at?: string | null;
  max_hours?: number;
  plans?: SpotlightPlan[];
} | null;

export const MY_SPOTLIGHT_KEY = "trade-spotlight-mine";

export function useMyTradeSpotlight() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [MY_SPOTLIGHT_KEY, user?.id],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<MySpotlight> => {
      const { data, error } = await supabase.rpc("get_my_trade_spotlight");
      if (error) throw error;
      const raw = (data ?? null) as RawSpotlight;
      return {
        active: !!raw?.active,
        endsAt: raw?.ends_at ?? null,
        maxHours: raw?.max_hours ?? 168,
        plans: Array.isArray(raw?.plans) ? raw!.plans! : [],
      };
    },
  });
}

/** サーバーが返す理由（英語の決まり文句）を、画面側の分岐に使う種類へ */
export type SpotlightErrorKind = "insufficient" | "limit" | "noOffers" | "other";

export class SpotlightError extends Error {
  constructor(public kind: SpotlightErrorKind, message: string) {
    super(message);
  }
}

function toSpotlightError(message: string | undefined): SpotlightError {
  const m = message ?? "";
  if (m.includes("Insufficient points")) return new SpotlightError("insufficient", m);
  if (m.includes("Spotlight limit reached")) return new SpotlightError("limit", m);
  if (m.includes("No items offered for trade") || m.includes("Item not offered for trade")) {
    return new SpotlightError("noOffers", m);
  }
  return new SpotlightError("other", m);
}

export function useBuyTradeSpotlight() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (duration: string): Promise<{ endsAt: string; newPoints: number }> => {
      // 品は選ばず「交換に出しているグッズ全部」を対象にする（_item_ids は渡さない）
      const { data, error } = await supabase.rpc("buy_trade_spotlight", { _duration: duration });
      if (error) throw toSpotlightError(error.message);
      const raw = (data ?? {}) as { ends_at?: string; new_points?: number };
      return { endsAt: raw.ends_at ?? "", newPoints: raw.new_points ?? 0 };
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [MY_SPOTLIGHT_KEY] });
      qc.invalidateQueries({ queryKey: ["userPoints"] });
      qc.invalidateQueries({ queryKey: ["pointTransactions"] });
    },
  });
}

/**
 * 画面に出ている相手のうち、いま注目中の人。
 * ブロックしている／されている相手はサーバー側で除いている。
 */
export function useTradeSpotlightUsers(userIds: string[]) {
  const { user } = useAuth();
  const ids = [...new Set(userIds)].sort();

  return useQuery({
    queryKey: ["trade-spotlight-users", user?.id, ids.join(",")],
    enabled: !!user?.id && ids.length > 0,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase.rpc("get_trade_spotlight_users", { _user_ids: ids });
      if (error) throw error;
      return new Set((data ?? []) as string[]);
    },
  });
}
