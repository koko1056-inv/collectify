import type { TourStep } from "./SpotlightTour";

/**
 * 画面ごとの操作ガイド定義。
 *
 * 置き方の方針:
 * - 1ツアーは2〜4歩まで。長いと読まれない。
 * - 最後の1歩は必ず「実際に押す」で終える。説明で終わらせない。
 * - 指す対象は data-tour 属性。見つからなければ自動で飛ばされるので、
 *   条件表示のカードを指しても安全。
 */
export interface PageTour {
  /** profiles.completed_tours に保存されるID。変更すると再表示される。 */
  id: string;
  /** 発火する画面。pathname の完全一致で判定する。 */
  path: string;
  steps: TourStep[];
}

export const PAGE_TOURS: PageTour[] = [
  {
    // 最重要。ここで1個目を登録してもらえないと、他の機能が全部空で動かない。
    // 最後の1歩は「追加」を実際に押させて終える。押した先の説明は
    // /quick-add 側のガイドが続ける。
    id: "collection-v1",
    path: "/collection",
    steps: [
      {
        target: "nav-bar",
        titleKey: "tour.collection.nav.title",
        bodyKey: "tour.collection.nav.body",
        padding: 4,
      },
      {
        target: "collection-checklist",
        titleKey: "tour.collection.checklist.title",
        bodyKey: "tour.collection.checklist.body",
      },
      {
        // ここが本番。棚の読み込みが遅い回線だと空状態のCTAの描画が
        // 遅れるので、既定より長く待ってから諦める。
        target: "collection-add",
        titleKey: "tour.collection.add.title",
        bodyKey: "tour.collection.add.body",
        advance: "click",
        waitMs: 2500,
      },
    ],
  },
  {
    // 登録の山場。カメラが開いた直後に「適当でいい」と伝える。
    // 完璧に撮らなければいけないと思わせると、ここで手が止まる。
    id: "quick-add-v1",
    path: "/quick-add",
    steps: [
      {
        target: "quickadd-capture",
        titleKey: "tour.quickAdd.capture.title",
        bodyKey: "tour.quickAdd.capture.body",
        waitMs: 1500,
      },
    ],
  },
  {
    id: "search-v1",
    path: "/search",
    steps: [
      {
        target: "search-input",
        titleKey: "tour.search.input.title",
        bodyKey: "tour.search.input.body",
      },
      {
        target: "search-results",
        titleKey: "tour.search.results.title",
        bodyKey: "tour.search.results.body",
      },
    ],
  },
  {
    id: "ai-rooms-v1",
    path: "/ai-rooms",
    steps: [
      {
        target: "airooms-intro",
        titleKey: "tour.aiRooms.intro.title",
        bodyKey: "tour.aiRooms.intro.body",
      },
      {
        target: "airooms-generate",
        titleKey: "tour.aiRooms.generate.title",
        bodyKey: "tour.aiRooms.generate.body",
      },
    ],
  },
  {
    id: "explore-v1",
    path: "/explore",
    steps: [
      {
        target: "explore-tabs",
        titleKey: "tour.explore.tabs.title",
        bodyKey: "tour.explore.tabs.body",
      },
      {
        target: "explore-feed",
        titleKey: "tour.explore.feed.title",
        bodyKey: "tour.explore.feed.body",
      },
    ],
  },
  {
    id: "my-room-v1",
    path: "/my-room",
    steps: [
      {
        target: "myroom-main",
        titleKey: "tour.myRoom.main.title",
        bodyKey: "tour.myRoom.main.body",
      },
    ],
  },
  {
    id: "point-shop-v1",
    path: "/point-shop",
    steps: [
      {
        target: "shop-balance",
        titleKey: "tour.pointShop.balance.title",
        bodyKey: "tour.pointShop.balance.body",
      },
      {
        target: "shop-items",
        titleKey: "tour.pointShop.items.title",
        bodyKey: "tour.pointShop.items.body",
      },
    ],
  },
];

export function tourForPath(pathname: string): PageTour | undefined {
  return PAGE_TOURS.find((tour) => tour.path === pathname);
}

export const ALL_TOUR_IDS = PAGE_TOURS.map((tour) => tour.id);
