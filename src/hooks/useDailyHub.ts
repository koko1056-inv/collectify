import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginBonusTiers } from "@/hooks/useLoginBonusTiers";
import type { OfficialItem } from "@/types";

/** 「新着」とみなす期間（時間）。毎日の自動追加の取りこぼしや、数日あいた人にも見せられるよう長めに */
const NEW_WINDOW_HOURS = 72;
/** 一覧で見せる最大件数 */
const NEW_LIMIT = 24;

function todayJst(): string {
  return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
}

/**
 * 「今日のチェック」に出す情報。
 *  - 連続ログイン日数・今日のボーナス・次の段階までの残り日数
 *  - 推しの作品の新着グッズ（直近72時間）
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

  const interests = useQuery({
    queryKey: ["daily-hub-interests", uid],
    enabled: !!uid,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("interests, favorite_contents").eq("id", uid!).maybeSingle();
      if (error) throw error;
      return [...new Set([...(data?.favorite_contents ?? []), ...(data?.interests ?? [])])].filter(Boolean) as string[];
    },
  });

  const names = interests.data ?? [];
  const fresh = useQuery({
    queryKey: ["daily-hub-new", uid, names.join("|")],
    enabled: names.length > 0,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const since = new Date(Date.now() - NEW_WINDOW_HOURS * 3600e3).toISOString();
      const { data, error, count } = await supabase
        .from("official_items")
        .select("id, title, image, price, release_date, content_name, created_at", { count: "exact" })
        .in("content_name", names)
        .is("merged_into", null)
        .neq("image", "/placeholder.svg")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(NEW_LIMIT);
      if (error) throw error;
      return { items: (data ?? []) as unknown as OfficialItem[], total: count ?? (data?.length ?? 0) };
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
    newItems: fresh.data?.items ?? [],
    newTotal: fresh.data?.total ?? 0,
    newContents: names,
  };
}
