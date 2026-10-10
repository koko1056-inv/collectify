import type { TourStep } from "./SpotlightTour";
import type { OnboardingStepId } from "./steps";

/**
 * 「Collectifyはじめてガイド」の各項目を押したときの行き先と、着いた画面で出す案内。
 *
 * 項目を押すと `path` に `?guide=<id>` を付けて移動し、GuideHost がその画面の
 * 操作する場所（data-tour）を光らせて「ここを押す」と案内する。
 * 以前は行き先がおおまか（例: お気に入りTOP5 → コレクション画面）で、
 * 着いた画面のどこを押せばいいのか分からなかった。
 */
export interface GuideTask {
  /** 移動先（クエリを含めてよい）。 */
  path: string;
  steps: TourStep[];
}

export const GUIDE_TASKS: Partial<Record<OnboardingStepId, GuideTask>> = {
  profile: {
    path: "/me",
    steps: [{ target: "me-edit", titleKey: "tour.guide.profile.title", bodyKey: "tour.guide.profile.body", advance: "click", waitMs: 2500 }],
  },
  "first-item": {
    path: "/collection",
    steps: [{ target: "collection-add", titleKey: "tour.guide.firstItem.title", bodyKey: "tour.guide.firstItem.body", advance: "click", waitMs: 2500 }],
  },
  favorites: {
    path: "/me",
    steps: [{ target: "me-top5", titleKey: "tour.guide.favorites.title", bodyKey: "tour.guide.favorites.body", advance: "click", waitMs: 3000 }],
  },
  wishlist: {
    path: "/search",
    steps: [{ target: "search-results", titleKey: "tour.guide.wishlist.title", bodyKey: "tour.guide.wishlist.body", waitMs: 3000 }],
  },
  "ai-room": {
    path: "/ai-rooms",
    steps: [{ target: "airooms-generate", titleKey: "tour.guide.aiRoom.title", bodyKey: "tour.guide.aiRoom.body", advance: "click", waitMs: 3000 }],
  },
  avatar: {
    path: "/me?tab=ai&view=avatar",
    steps: [{ target: "avatar-create", titleKey: "tour.guide.avatar.title", bodyKey: "tour.guide.avatar.body", advance: "click", waitMs: 3000 }],
  },
  follow: {
    path: "/explore?tab=users",
    steps: [{ target: "explore-users", titleKey: "tour.guide.follow.title", bodyKey: "tour.guide.follow.body", waitMs: 3000 }],
  },
  "trade-offer": {
    path: "/trade",
    steps: [{ target: "trade-offer-cta", titleKey: "tour.guide.tradeOffer.title", bodyKey: "tour.guide.tradeOffer.body", advance: "click", waitMs: 3000 }],
  },
  bookmark: {
    path: "/explore?tab=ai",
    steps: [{ target: "explore-feed", titleKey: "tour.guide.bookmark.title", bodyKey: "tour.guide.bookmark.body", waitMs: 3000 }],
  },
};

/** 項目の行き先（`?guide=` 付き）。案内の無い項目は null */
export function guideHref(id: OnboardingStepId): string | null {
  const task = GUIDE_TASKS[id];
  if (!task) return null;
  return `${task.path}${task.path.includes("?") ? "&" : "?"}guide=${id}`;
}

/** いまの画面で出すべき案内。`?guide=` があり、行き先の画面に着いているときだけ返す */
export function guideForLocation(pathname: string, search: string): { id: string; task: GuideTask } | null {
  const id = new URLSearchParams(search).get("guide");
  if (!id) return null;
  const task = GUIDE_TASKS[id as OnboardingStepId];
  if (!task) return null;
  const targetPath = task.path.split("?")[0];
  return pathname === targetPath ? { id, task } : null;
}
