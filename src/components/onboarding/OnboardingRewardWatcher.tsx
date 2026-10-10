import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ONBOARDING_STEPS } from "./steps";
import { ONBOARDING_REWARD_CHECK_EVENT } from "@/lib/onboardingRewards";

/** 保存のあとの再読み込みは連続して起きるので、まとめて1回だけ確かめる */
const DEBOUNCE_MS = 1200;
/** 続けて呼びすぎないための最短の間隔 */
const MIN_INTERVAL_MS = 3000;

/** この見張り役が自分で再読み込みさせるもの。これに反応して、また確かめに行かないようにする */
const OWN_KEYS = new Set(["onboarding-checklist", "userPoints", "pointTransactions"]);

/**
 * 「Collectifyはじめてガイド」の報酬を、達成したその場で受け取れるようにする。
 *
 * 以前は、達成の判定と付与をコレクション画面のチェックリストが持っていた。
 * そのため、ガイドに沿ってプロフィールを編集・保存しても、チェックリストを開き直し、
 * しかもそのキャッシュ（5分）が切れるまで報酬が出なかった（実際に取りこぼしていた）。
 *
 * いまは達成の判定も付与もサーバー（claim_completed_onboarding_rewards）が持ち、
 * ここは「確かめて」と頼むだけ。頼むきっかけは:
 *   - 画面を移ったとき
 *   - アプリに戻ってきたとき
 *   - 何かを保存して、アプリがデータを読み直したとき（保存のたびに各画面が invalidate する）
 *   - invalidate を使わない保存のあと、requestOnboardingRewardCheck() で頼まれたとき
 * 付与されたら、達成の通知を出し、チェックリストとポイントを読み直す。
 */
export function OnboardingRewardWatcher() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { pathname } = useLocation();

  const uid = user?.id ?? null;
  const timer = useRef<number | null>(null);
  const lastRun = useRef(0);
  const running = useRef(false);

  const check = useCallback(async () => {
    if (!uid || running.current) return;
    running.current = true;
    lastRun.current = Date.now();
    try {
      const { data, error } = await supabase.rpc("claim_completed_onboarding_rewards");
      if (error) {
        console.error("[OnboardingRewardWatcher] claim failed:", error);
        return;
      }
      const granted = data ?? [];
      if (granted.length === 0) return;

      for (const g of granted) {
        const step = ONBOARDING_STEPS.find((s) => s.id === g.step_id);
        toast.success(t("misc.checklist.achievedTitle", { label: step ? t(step.labelKey) : g.step_id }), {
          description: t("misc.checklist.achievedDesc", { points: g.points }),
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["onboarding-checklist", uid] });
      void queryClient.invalidateQueries({ queryKey: ["userPoints"] });
      void queryClient.invalidateQueries({ queryKey: ["pointTransactions"] });
    } finally {
      running.current = false;
    }
  }, [uid, queryClient, t]);

  const schedule = useCallback(() => {
    if (!uid) return;
    if (timer.current) window.clearTimeout(timer.current);
    const wait = Math.max(DEBOUNCE_MS, MIN_INTERVAL_MS - (Date.now() - lastRun.current));
    timer.current = window.setTimeout(() => {
      timer.current = null;
      void check();
    }, wait);
  }, [uid, check]);

  // ログインした直後と、画面を移ったとき
  useEffect(() => {
    schedule();
  }, [pathname, schedule]);

  // アプリに戻ってきたとき
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") schedule();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [schedule]);

  // 何かを保存したあと（各画面は保存のあとに invalidate で読み直す）
  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "invalidate") return;
      const head = event.query.queryKey[0];
      if (typeof head === "string" && OWN_KEYS.has(head)) return;
      schedule();
    });
  }, [queryClient, schedule]);

  // invalidate を使わない保存（プロフィールの編集など）から、直接頼まれたとき
  useEffect(() => {
    window.addEventListener(ONBOARDING_REWARD_CHECK_EVENT, schedule);
    return () => window.removeEventListener(ONBOARDING_REWARD_CHECK_EVENT, schedule);
  }, [schedule]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  return null;
}
