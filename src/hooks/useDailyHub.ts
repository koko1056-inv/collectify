import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginBonusTiers } from "@/hooks/useLoginBonusTiers";

function todayJst(): string {
  return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
}

/**
 * 「今日のチェック」に出す情報。
 *  - 連続ログイン日数・今日のボーナス・次の段階までの残り日数
 * 推しの作品の新着グッズは、ここでは読まない。「推しの新商品」の画面（/releases）と、
 * その入口のバッジ（useOshiNewBadge: 最後に見た時刻からの件数）に移した。
 * ログインボーナスの付与そのものは AuthContext が行う（ここは表示のための読み取りだけ）。
 */
export function useDailyHub() {
  const { user } = useAuth();
  const uid = user?.id;
  const tiers = useLoginBonusTiers();

  const points = useQuery({
    queryKey: ["daily-hub-points", uid],
    enabled: !!uid,
    staleTime: 1000 * 60,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_points")
        .select("login_streak, last_login_bonus_date")
        .eq("user_id", uid!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const derived = useMemo(() => {
    const streak = points.data?.login_streak ?? 0;
    const claimedToday = points.data?.last_login_bonus_date === todayJst();
    const sorted = [...(tiers.data ?? [])].sort((a, b) => a.min_streak - b.min_streak);
    const current = [...sorted].reverse().find((t) => t.min_streak <= Math.max(streak, 1));
    const next = sorted.find((t) => t.min_streak > streak) ?? null;
    return {
      streak,
      claimedToday,
      todayPoints: current?.points ?? null,
      next: next ? { inDays: next.min_streak - streak, points: next.points } : null,
    };
  }, [points.data, tiers.data]);

  return {
    ...derived,
    ready: points.isSuccess,
  };
}
