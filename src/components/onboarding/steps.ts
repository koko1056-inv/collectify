import {
  ArrowLeftRight,
  Bookmark,
  Heart,
  House,
  Package,
  PenLine,
  Star,
  UserPlus,
  UserRound,
  UserRoundPen,
  type LucideIcon,
} from "lucide-react";

/**
 * 「Collectifyはじめてガイド」の手順と付与ポイント。
 * チェックリストと使い方ページの両方がここを読む（以前は使い方ページが古い7手順・古い額を直書きしていた）。
 * 付与額の正はサーバーの onboarding_reward_steps。変えるときは両方そろえる。
 *
 * 以前は各手順に絵文字（👤✏️📦⭐…）を持たせていたが、端末ごとに絵柄が変わり
 * アプリの他のアイコンとも線の太さがそろわなかったので、lucide のアイコンに置き換えた。
 */
export const ONBOARDING_STEPS = [
  { id: "account", labelKey: "misc.checklist.accountLabel", points: 10, icon: UserRound },
  { id: "profile", labelKey: "misc.checklist.profileLabel", points: 20, icon: PenLine },
  { id: "first-item", labelKey: "misc.checklist.firstItemLabel", points: 30, icon: Package },
  { id: "favorites", labelKey: "misc.checklist.favoritesLabel", points: 20, icon: Star },
  { id: "wishlist", labelKey: "misc.checklist.wishlistLabel", points: 10, icon: Heart },
  { id: "ai-room", labelKey: "misc.checklist.aiRoomLabel", points: 30, icon: House },
  { id: "avatar", labelKey: "misc.checklist.avatarLabel", points: 30, icon: UserRoundPen },
  { id: "follow", labelKey: "misc.checklist.followLabel", points: 10, icon: UserPlus },
  { id: "trade-offer", labelKey: "misc.checklist.tradeOfferLabel", points: 20, icon: ArrowLeftRight },
  { id: "bookmark", labelKey: "misc.checklist.bookmarkLabel", points: 10, icon: Bookmark },
] as const satisfies ReadonlyArray<{ id: string; labelKey: string; points: number; icon: LucideIcon }>;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export const ONBOARDING_STEP_POINTS = Object.fromEntries(
  ONBOARDING_STEPS.map((s) => [s.id, s.points]),
) as Record<OnboardingStepId, number>;
