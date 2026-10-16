import type { TourStep } from "./SpotlightTour";
import type { OnboardingStepId } from "./steps";

/**
 * 「Collectifyはじめてガイド」の各項目を押したときの行き先と、着いた画面で出す案内。
 *
 * 項目を押すと `path` に `?guide=<id>` を付けて移動し、GuideHost がその画面の
 * 操作する場所（data-tour）を光らせて「ここを押す」と案内する。
 * 以前は行き先がおおまか（例: 推しグッズ（当時のお気に入りTOP5） → コレクション画面）で、
 * 着いた画面のどこを押せばいいのか分からなかった。
 * すべての項目に行き先を持たせる（scripts/test-onboarding-tours.mjs が、行き先・指す場所・文言の有無を確かめる）。
 */
export interface GuideTask {
  /** 移動先（クエリを含めてよい）。 */
  path: string;
  steps: TourStep[];
}

export const GUIDE_TASKS: Record<OnboardingStepId, GuideTask> = {
  interests: {
    path: "/me",
    steps: [{ target: "me-interests", titleKey: "tour.guide.interests.title", bodyKey: "tour.guide.interests.body", waitMs: 3000 }],
  },
  // 登録。＋を押すと追加の選び方が開き、一覧から選ぶとシリーズをまとめて登録できる
  "first-item": {
    path: "/collection",
    steps: [{ target: "collection-add", titleKey: "tour.guide.firstItemFlow.title", bodyKey: "tour.guide.firstItemFlow.body", advance: "click", waitMs: 2500 }],
  },
  favorites: {
    path: "/me",
    steps: [{ target: "me-oshi-goods", titleKey: "tour.guide.favorites.title", bodyKey: "tour.guide.favorites.body", advance: "click", waitMs: 3000 }],
  },
  // コンプの「集めるもの」。グッズが無くカードが出ていないときは、案内は自動で飛ばされる
  goal: {
    path: "/collection",
    steps: [{ target: "collection-goals", titleKey: "tour.guide.goal.title", bodyKey: "tour.guide.goal.body", waitMs: 3500 }],
  },
  "trade-offer": {
    path: "/trade",
    steps: [{ target: "trade-offer-cta", titleKey: "tour.guide.tradeFlow.title", bodyKey: "tour.guide.tradeFlow.body", advance: "click", waitMs: 3000 }],
  },
};

/** 項目の行き先（`?guide=` 付き）。案内の無い項目は null */
export function guideHref(id: OnboardingStepId): string | null {
  const task = GUIDE_TASKS[id] as GuideTask | undefined;
  if (!task) return null;
  return `${task.path}${task.path.includes("?") ? "&" : "?"}guide=${id}`;
}

/** いまの画面で出すべき案内。`?guide=` があり、行き先の画面に着いているときだけ返す */
export function guideForLocation(pathname: string, search: string): { id: string; task: GuideTask } | null {
  const id = new URLSearchParams(search).get("guide");
  if (!id) return null;
  // 以前の項目（ai-room など）の ?guide= は、もう案内しない（ブックマークなどから来ても何も出さない）
  const task = (GUIDE_TASKS as Record<string, GuideTask | undefined>)[id];
  if (!task) return null;
  const targetPath = task.path.split("?")[0];
  return pathname === targetPath ? { id, task } : null;
}
