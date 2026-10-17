import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BadgeStats } from "@/components/badges/badgeDefs";

export const BADGE_STATS_KEY = "badge-stats";

/** 実績バッジの数（人のプロフィールでも、見てよい相手なら読める） */
export function useBadgeStats(userId: string | null | undefined) {
  return useQuery({
    queryKey: [BADGE_STATS_KEY, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_badge_stats", { _user_id: userId! });
      if (error) throw error;
      return (data ?? null) as unknown as BadgeStats | null;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
