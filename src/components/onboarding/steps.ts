import {
  ArrowLeftRight,
  Bookmark,
  Heart,
  House,
  Package,
  PenLine,
  Star,
  Target,
  Tv,
  UserPlus,
  UserRound,
  UserRoundPen,
  type LucideIcon,
} from "lucide-react";

/**
 * 「Collectifyはじめてガイド」の手順。
 * チェックリストと使い方ページの両方がここを読む。
 *
 * 以前は10項目（プロフィール・ほしいもの・AIルーム・アバター・フォロー・AI作品の保存…）あり、
 * 初めての人が「結局なんのアプリか」で迷っていた。アプリの中心は
 * 「登録する → 眺める（飾る）→ コンプ → 交換」の1本なので、ガイドもその順の5項目に絞る。
 *
 * 付与額の正はサーバーの onboarding_reward_steps。ここには額を持たない
 * （useOnboardingRewardPoints で読む。サーバーに行の無い手順は「+pt」を出さない）。
 *
 * 項目 ID はサーバーの onboarding_rewards（受け取り済みの記録）と onboarding_step_done（達成の判定）が使う。
 * 外した項目の ID は消さずに LEGACY_ONBOARDING_STEPS に残す:
 *  - 受け取り済みの記録はそのまま残る（DB の行は消さない）
 *  - サーバーでは止めてある（onboarding_reward_steps.is_active = false。20261016060553）が、
 *    古い記録の通知（OnboardingRewardWatcher）にも項目名を出せるようにしておく
 */
export interface OnboardingStepDef {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: LucideIcon;
}

export const ONBOARDING_STEPS = [
  // 推しの作品。推しの新着・コンプの的・交換相手の候補がここから決まる（ウェルカムで選んだ人は最初から達成）
  { id: "interests", labelKey: "misc.checklist.interestsLabel", descriptionKey: "misc.checklist.interestsDesc", icon: Tv },
  // 登録する（まとめて登録を案内する）
  { id: "first-item", labelKey: "misc.checklist.firstItemFlowLabel", descriptionKey: "misc.checklist.firstItemFlowDesc", icon: Package },
  // 眺める・愛着: 推しグッズを選ぶと推しの部屋に飾られる（判定は以前の「推しグッズを選ぶ」と同じ）
  { id: "favorites", labelKey: "misc.checklist.favoritesFlowLabel", descriptionKey: "misc.checklist.favoritesFlowDesc", icon: Star },
  // コンプ: 集めるもの（目標）を1つ決める（目標は collection_goals。サーバーが達成を確かめて付与する）
  { id: "goal", labelKey: "misc.checklist.goalLabel", descriptionKey: "misc.checklist.goalDesc", icon: Target },
  // 交換: 交換に出す（X の譲・求画像も同じ画面から作れる）
  { id: "trade-offer", labelKey: "misc.checklist.tradeFlowLabel", descriptionKey: "misc.checklist.tradeFlowDesc", icon: ArrowLeftRight },
] as const satisfies ReadonlyArray<OnboardingStepDef>;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

/** 画面には出さないが、記録と通知のために名前だけ残す以前の手順 */
export const LEGACY_ONBOARDING_STEPS: ReadonlyArray<OnboardingStepDef> = [
  { id: "account", labelKey: "misc.checklist.accountLabel", descriptionKey: "misc.checklist.accountDesc", icon: UserRound },
  { id: "profile", labelKey: "misc.checklist.profileLabel", descriptionKey: "misc.checklist.profileDesc", icon: PenLine },
  { id: "wishlist", labelKey: "misc.checklist.wishlistLabel", descriptionKey: "misc.checklist.wishlistDesc", icon: Heart },
  { id: "ai-room", labelKey: "misc.checklist.aiRoomLabel", descriptionKey: "misc.checklist.aiRoomDesc", icon: House },
  { id: "avatar", labelKey: "misc.checklist.avatarLabel", descriptionKey: "misc.checklist.avatarDesc", icon: UserRoundPen },
  { id: "follow", labelKey: "misc.checklist.followLabel", descriptionKey: "misc.checklist.followDesc", icon: UserPlus },
  { id: "bookmark", labelKey: "misc.checklist.bookmarkLabel", descriptionKey: "misc.checklist.bookmarkDesc", icon: Bookmark },
];

/**
 * 以前の10項目。これを全部受け取り済みの人（以前のガイドを終えた人）には、新しいガイドを出し直さない。
 * 新しい項目（作品・集めるもの）のためだけに、終えたガイドが戻ってくると邪魔になる。
 */
export const LEGACY_FULL_GUIDE_IDS = [
  "account", "profile", "first-item", "favorites", "wishlist", "ai-room", "avatar", "follow", "trade-offer", "bookmark",
] as const;

/** 通知などで項目名を引く（今の項目と以前の項目の両方から） */
export function findOnboardingStep(id: string): OnboardingStepDef | undefined {
  return (ONBOARDING_STEPS as ReadonlyArray<OnboardingStepDef>).find((s) => s.id === id) ?? LEGACY_ONBOARDING_STEPS.find((s) => s.id === id);
}
