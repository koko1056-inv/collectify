// Collectify freemium plan limits
// Free: basic experience
// Premium: unlimited collection, all themes, unlimited furniture, 10 3D generations/month
// Premium+: everything + priority AI, early access

export type PlanTier = "free" | "premium" | "premium_plus";

export interface PlanLimits {
  collectionItems: number;
  wishlistItems: number;
  themes: string[] | "all";          // テーマID配列または "all"
  furnitureSlots: number;            // 同時に部屋に置ける家具数
  displayConversions: number;        // 月あたりのグッズ→ディスプレイ変換回数
  threeDGenerations: number;         // 月あたりの3Dモデル生成回数
  roomReactionsPerDay: number;       // 1日にルームに送れるリアクション数
  customBgm: boolean;                // カスタムBGM設定
  removeWatermark: boolean;          // シェア画像の透かし削除
  priorityAI: boolean;               // AI処理の優先度
  badge: string | null;              // プロフィールバッジ
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    collectionItems: 50,
    wishlistItems: 20,
    themes: ["cyber_neon", "sunny_room", "mint_cafe", "midnight_lounge"], // 4つだけ
    furnitureSlots: 10,
    displayConversions: 3,
    threeDGenerations: 1,
    roomReactionsPerDay: 10,
    customBgm: false,
    removeWatermark: false,
    priorityAI: false,
    badge: null,
  },
  premium: {
    collectionItems: 1000,
    wishlistItems: 500,
    themes: "all",
    furnitureSlots: 50,
    displayConversions: 30,
    threeDGenerations: 10,
    roomReactionsPerDay: 100,
    customBgm: true,
    removeWatermark: true,
    priorityAI: false,
    badge: "★ Premium",
  },
  premium_plus: {
    collectionItems: Infinity as unknown as number,
    wishlistItems: Infinity as unknown as number,
    themes: "all",
    furnitureSlots: Infinity as unknown as number,
    displayConversions: 100,
    threeDGenerations: 50,
    roomReactionsPerDay: Infinity as unknown as number,
    customBgm: true,
    removeWatermark: true,
    priorityAI: true,
    badge: "👑 Premium+",
  },
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

export function canUseTheme(plan: PlanTier, themeId: string): boolean {
  const allowed = PLAN_LIMITS[plan].themes;
  if (allowed === "all") return true;
  return allowed.includes(themeId);
}

export function isThemeLocked(plan: PlanTier, themeId: string): boolean {
  return !canUseTheme(plan, themeId);
}

export function hasReachedLimit(
  plan: PlanTier,
  limit: keyof PlanLimits,
  current: number
): boolean {
  const max = PLAN_LIMITS[plan][limit];
  if (typeof max !== "number") return false;
  return current >= max;
}
