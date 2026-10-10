/**
 * 「はじめてガイドの報酬を確かめて」と頼む合図。受け取るのは OnboardingRewardWatcher。
 *
 * ふだんは、保存のあとにアプリがデータを読み直す（invalidate）のを見て自動で確かめる。
 * invalidate を使わず refetch だけで読み直す保存（プロフィールの編集など）では、これを呼ぶ。
 */
export const ONBOARDING_REWARD_CHECK_EVENT = "collectify:onboarding-reward-check";

export function requestOnboardingRewardCheck() {
  window.dispatchEvent(new Event(ONBOARDING_REWARD_CHECK_EVENT));
}
