// Collectify のサブスク（プレミアム / プレミアム+）
//
// 特典は、実際にサーバーで効いているものだけを書く。
//   - 毎月のポイント: grant_subscription_monthly_points（migrations/20261029190000_subscription_perks_and_earn_trim.sql）
//     購読の始まりから1か月ごとに、支払い済みの期間の分を渡す。年額プランも毎月その月の分。
//   - AI 生成の割引: 各 Edge Function（edit-image / generate-avatar / generate-post-image / generate-ai-room）が
//     supabase/functions/_shared/subscription.ts で割り引く。
// 変えるときは、ここと上の2か所を揃えること。
//
// 以前はここに「コレクション上限・テーマ・家具スロット・ディスプレイ変換・カスタムBGM・透かし削除・
// 優先AI・バッジ」を並べていたが、どれもアプリ・サーバーのどこでも使われておらず（表示していた
// PaywallModal も開く場所が無かった）、払っても何も変わらなかった。売り文句からは外した。

export type PlanTier = "free" | "premium" | "premium_plus";

export interface PlanPerks {
  /** 毎月もらえるポイント */
  monthlyPoints: number;
  /** AI 生成の割引（%） */
  aiDiscountPercent: number;
}

export const PLAN_PERKS: Record<PlanTier, PlanPerks> = {
  free: { monthlyPoints: 0, aiDiscountPercent: 0 },
  premium: { monthlyPoints: 600, aiDiscountPercent: 20 },
  premium_plus: { monthlyPoints: 1300, aiDiscountPercent: 40 },
};

export const PLAN_NAMES: Record<PlanTier, string> = {
  free: "無料",
  premium: "プレミアム",
  premium_plus: "プレミアム+",
};

export const PLAN_PRICES_JPY: Record<PlanTier, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  premium: { monthly: 480, yearly: 4800 },       // 2ヶ月分お得
  premium_plus: { monthly: 980, yearly: 9800 },
};

// iOS IAP Product IDs (App Store Connectで登録する識別子)
export const IAP_PRODUCT_IDS = {
  premium_monthly: "com.collectify.premium.monthly",
  premium_yearly: "com.collectify.premium.yearly",
  premium_plus_monthly: "com.collectify.premium_plus.monthly",
  premium_plus_yearly: "com.collectify.premium_plus.yearly",
} as const;

/** 割引後の pt（サーバーと同じく整数に丸める）。例: 100 → 80 / 60、30 → 24 / 18、20 → 16 / 12 */
export function discountedAiCost(baseCost: number, plan: PlanTier): number {
  const pct = PLAN_PERKS[plan].aiDiscountPercent;
  return Math.round((baseCost * (100 - pct)) / 100);
}
