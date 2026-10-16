import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * はじめてガイドの各手順で、いまサーバーが実際に付与する額（onboarding_reward_steps）。
 *
 * 以前はアプリ側に額を直書きしていたため、サーバーに行の無い手順にも「+20pt」と出せてしまった。
 * ここで読んだ表に行がある（かつ有効な）手順だけ額を返し、無い手順は undefined（画面では「+pt」を出さない）。
 *
 * is_active 列は 20261016060553 で足した。列の無い古い DB では返らないので、行があれば有効とみなす。
 * 表は anon でも読める（GRANT SELECT）。
 */
export function useOnboardingRewardPoints() {
  return useQuery({
    queryKey: ["onboarding-reward-steps"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.from("onboarding_reward_steps").select("*");
      if (error) throw error;
      const out: Record<string, number> = {};
      for (const row of (data ?? []) as Array<{ step_id: string; points: number; is_active?: boolean | null }>) {
        if (row.is_active === false) continue;
        out[row.step_id] = row.points;
      }
      return out;
    },
    staleTime: 1000 * 60 * 60,
    meta: { silentError: true },
  });
}
