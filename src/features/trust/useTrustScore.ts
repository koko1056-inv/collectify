import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TrustScore } from "./types";

const EMPTY: Omit<TrustScore, "user_id"> = {
  trade_score: 0,
  trade_count: 0,
  collector_score: 0,
  collector_count: 0,
  communication_score: 0,
  communication_count: 0,
};

export function useTrustScore(userId: string | undefined | null) {
  return useQuery({
    queryKey: ["trust-score", userId],
    queryFn: async (): Promise<TrustScore> => {
      if (!userId) return { user_id: "", ...EMPTY };
      const { data, error } = await supabase
        .from("user_trust_scores")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.warn("useTrustScore error:", error);
        return { user_id: userId, ...EMPTY };
      }
      return data ?? { user_id: userId, ...EMPTY };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * 複数ユーザーをまとめて取得（リスト表示用）
 */
export function useTrustScoresBulk(userIds: string[]) {
  const sortedKey = [...userIds].sort().join(",");
  return useQuery({
    queryKey: ["trust-scores-bulk", sortedKey],
    queryFn: async (): Promise<Record<string, TrustScore>> => {
      if (userIds.length === 0) return {};
      const { data, error } = await supabase
        .from("user_trust_scores")
        .select("*")
        .in("user_id", userIds);
      if (error) {
        console.warn("useTrustScoresBulk error:", error);
        return {};
      }
      const map: Record<string, TrustScore> = {};
      for (const row of data ?? []) {
        map[row.user_id] = row as TrustScore;
      }
      // 未登録ユーザーは空スコアで補完
      for (const id of userIds) {
        if (!map[id]) map[id] = { user_id: id, ...EMPTY };
      }
      return map;
    },
    enabled: userIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });
}
