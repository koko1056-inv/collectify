import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type DailyLoginRewardKind = "points" | "cosmetic_cover" | "cosmetic_frame" | "points_slot";

export interface DailyLoginWeekDay {
  offset: number;
  cycle_day: number;
  kind: DailyLoginRewardKind;
  points: number;
  slot_bonus: number;
  is_today: boolean;
}

export interface DailyLoginMilestone {
  streak_days: number;
  bonus_points: number;
  bonus_slot: number;
  label: string;
}

export interface DailyLoginStatus {
  today: string;
  claimed_today: boolean;
  streak: number;
  cycle_day: number;
  week: DailyLoginWeekDay[];
  milestones: DailyLoginMilestone[];
}

export interface DailyLoginClaimResult {
  claimed: boolean;
  already_claimed: boolean;
  today: string;
  streak: number;
  cycle_day: number;
  kind?: DailyLoginRewardKind;
  points_awarded?: number;
  cosmetic_unlocked?: string | null;
  slot_bonus?: number;
  milestone?: number | null;
  milestone_points?: number;
  week: DailyLoginWeekDay[];
}

export const DAILY_LOGIN_STATUS_KEY = "daily-login-status";

/** どこからでもログイン報酬のシートを開ける合図（表示は DailyLoginRewardHost が持つ） */
export const DAILY_LOGIN_OPEN_EVENT = "pocke:daily-login-open";
export function openDailyLoginReward() {
  window.dispatchEvent(new Event(DAILY_LOGIN_OPEN_EVENT));
}

/**
 * 今日のログイン報酬の状態（受け取り済みか・今日のサイクル日・これからの7日・連続記録の表）。
 * 受け取りはしない（get_daily_login_status には副作用が無い）
 */
export function useDailyLoginStatus() {
  const { user } = useAuth();
  return useQuery<DailyLoginStatus | null>({
    queryKey: [DAILY_LOGIN_STATUS_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_daily_login_status");
      if (error) throw error;
      return (data ?? null) as unknown as DailyLoginStatus | null;
    },
    enabled: !!user?.id,
    staleTime: 20_000,
    refetchOnWindowFocus: true,
  });
}

/** 今日の分を受け取る。サーバーが1日1回だけに制限する（claim_daily_login_reward） */
export function useClaimDailyLoginReward() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("claim_daily_login_reward");
      if (error) throw error;
      return data as unknown as DailyLoginClaimResult;
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: [DAILY_LOGIN_STATUS_KEY, user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["userPoints"] });
      if (result.slot_bonus) {
        void queryClient.invalidateQueries({ queryKey: ["userLimits"] });
      }
      if (result.cosmetic_unlocked) {
        void queryClient.invalidateQueries({ queryKey: ["userUnlocks"] });
      }
    },
  });
}
