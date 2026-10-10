/**
 * 利用状況の分析（Mixpanel）への同意。
 *
 * 同意が無いあいだは、分析ツールを初期化もしない（EU/英国のルールと、世界のどこでも同じ扱いにそろえる）。
 * 同意しなくても、アプリの機能はすべて使える。
 */
export type AnalyticsConsent = "granted" | "denied";

const KEY = "collectify-analytics-consent";
export const ANALYTICS_CONSENT_EVENT = "collectify:analytics-consent";

export function getAnalyticsConsent(): AnalyticsConsent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    // ストレージが使えない環境では、同意が取れないものとして扱う
    return null;
  }
}

export function setAnalyticsConsent(value: AnalyticsConsent): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // 保存できなくても、今のセッションには反映する
  }
  window.dispatchEvent(new CustomEvent<AnalyticsConsent>(ANALYTICS_CONSENT_EVENT, { detail: value }));
}
