/**
 * 「Collectifyはじめてガイド」の手順と付与ポイント。
 * チェックリストと使い方ページの両方がここを読む（以前は使い方ページが古い7手順・古い額を直書きしていた）。
 * 付与額の正はサーバーの onboarding_reward_steps。変えるときは両方そろえる。
 */
export const ONBOARDING_STEPS = [
  { id: "account", labelKey: "misc.checklist.accountLabel", points: 10, emoji: "👤" },
  { id: "profile", labelKey: "misc.checklist.profileLabel", points: 20, emoji: "✏️" },
  { id: "first-item", labelKey: "misc.checklist.firstItemLabel", points: 30, emoji: "📦" },
  { id: "favorites", labelKey: "misc.checklist.favoritesLabel", points: 20, emoji: "⭐" },
  { id: "wishlist", labelKey: "misc.checklist.wishlistLabel", points: 10, emoji: "💗" },
  { id: "ai-room", labelKey: "misc.checklist.aiRoomLabel", points: 30, emoji: "🏠" },
  { id: "avatar", labelKey: "misc.checklist.avatarLabel", points: 30, emoji: "🧑‍🎨" },
  { id: "follow", labelKey: "misc.checklist.followLabel", points: 10, emoji: "🤝" },
  { id: "trade-offer", labelKey: "misc.checklist.tradeOfferLabel", points: 20, emoji: "🔁" },
  { id: "bookmark", labelKey: "misc.checklist.bookmarkLabel", points: 10, emoji: "🔖" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export const ONBOARDING_STEP_POINTS = Object.fromEntries(
  ONBOARDING_STEPS.map((s) => [s.id, s.points]),
) as Record<OnboardingStepId, number>;
