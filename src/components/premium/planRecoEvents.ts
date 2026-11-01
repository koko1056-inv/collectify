import {
  INITIAL_PLAN_RECO_STATE,
  parsePlanRecoState,
  type PlanRecoState,
  type PlanRecoTrigger,
} from "@/lib/planReco";

/**
 * プランのおすすめのきっかけを知らせる（表示と間隔の判断は PlanRecoHost が持つ）。
 * 出す側はイベントを投げるだけ。いまは「ポイントが足りなくて使えなかった」（insufficient）で使う。
 */
export const PLAN_RECO_EVENT = "plan-reco:request";

export interface PlanRecoRequest {
  trigger: PlanRecoTrigger;
  n?: number;
}

export function requestPlanReco(trigger: PlanRecoTrigger, n?: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PlanRecoRequest>(PLAN_RECO_EVENT, { detail: { trigger, n } }));
}

/**
 * プランの画面（PaywallModal）を開く。ウェルカムの最後の「プランをくわしく見る」から使う。
 * ウェルカムを先に終えてから（ようこそボーナスを受け取り、画面を移ってから）開くので、
 * 決済ページから戻ってきてもウェルカムをやり直さずに済む。
 */
export const PLAN_PAYWALL_EVENT = "plan-reco:open-paywall";

export function openPlanPaywall(plan: "premium" | "premium_plus") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ plan: "premium" | "premium_plus" }>(PLAN_PAYWALL_EVENT, { detail: { plan } }));
}

// ─────────── 端末に置く記録（ユーザーごとにキーを分ける） ───────────

const stateKey = (uid: string) => `plan_reco_v1_${uid}`;

export function loadPlanRecoState(uid: string): PlanRecoState {
  try {
    return parsePlanRecoState(localStorage.getItem(stateKey(uid)));
  } catch {
    return { ...INITIAL_PLAN_RECO_STATE };
  }
}

export function savePlanRecoState(uid: string, state: PlanRecoState) {
  try {
    localStorage.setItem(stateKey(uid), JSON.stringify(state));
  } catch {
    /* 保存できない端末では、この起動のあいだだけ覚えている（nudgeSlot で1回まで） */
  }
}
