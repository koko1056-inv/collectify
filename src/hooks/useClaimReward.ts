import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * サーバー側で定義された報酬を請求する。
 *
 * 付与額はクライアントから渡さない。`reason` に対応する額は DB の
 * `point_rewards` テーブルが唯一の正で、二重受け取りも
 * `point_reward_claims` のユニーク索引がサーバー側で防ぐ。
 *
 * @returns 実際に付与された場合は true、すでに受け取り済みなら false
 */
export type RewardReason =
  | "welcome_bonus"
  | "item_add"
  | "official_item_add"
  | "content_add";

export async function claimReward(
  reason: RewardReason,
  referenceId?: string | null
): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_reward", {
    _reason: reason,
    _reference_id: referenceId ?? null,
  });
  if (error) {
    // 報酬の取りこぼしで本体の操作を失敗させたくないため、投げずに記録する
    console.error("[claimReward] failed:", reason, error);
    return false;
  }
  return data === true;
}

/** 称号の資格をサーバー側で一括評価して付与する。 */
export async function grantEligibleAchievements(): Promise<number> {
  const { data, error } = await supabase.rpc("grant_eligible_achievements");
  if (error) {
    console.error("[grantEligibleAchievements] failed:", error);
    return 0;
  }
  return typeof data === "number" ? data : 0;
}

/**
 * 報酬請求 → 称号評価 → 関連クエリの無効化までをまとめて行う。
 * 付与が無かった場合（すでに受け取り済み）は再取得もしない。
 */
export function useClaimReward() {
  const qc = useQueryClient();

  return useCallback(
    async (reason: RewardReason, referenceId?: string | null) => {
      const awarded = await claimReward(reason, referenceId);
      if (!awarded) return false;

      const newAchievements = await grantEligibleAchievements();

      qc.invalidateQueries({ queryKey: ["userPoints"] });
      qc.invalidateQueries({ queryKey: ["pointTransactions"] });
      if (newAchievements > 0) {
        qc.invalidateQueries({ queryKey: ["userAchievements"] });
      }
      return true;
    },
    [qc]
  );
}
