import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LoginBonusTier {
  min_streak: number;
  points: number;
}

/**
 * 連続ログインボーナスの段階表。
 *
 * 報酬額はサーバー側の login_bonus_tiers が唯一の正で、
 * ここでは表示のためだけに読む（claim_login_bonus は自分で引き直す）。
 */
export function useLoginBonusTiers() {
  return useQuery<LoginBonusTier[]>({
    queryKey: ["loginBonusTiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_bonus_tiers")
        .select("min_streak, points")
        .order("min_streak", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    // マスタデータなので長めにキャッシュする
    staleTime: 1000 * 60 * 60,
  });
}
