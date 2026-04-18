// アイソメ2.5D部屋のスロット定義
// 配置を完全自動化するため、グッズは「スロット」に1つずつ収まる
//
// 座標系: SVGビューボックス 800x600
// 部屋は奥行きのあるアイソメ風 (上が奥、下が手前)
//
// スロットタイプ:
//   - shelf: 後ろの壁にある棚 (3段 x 3列 = 9スロット)
//   - wallback: 後ろ壁 (棚の上、缶バッジやポスター用)
//   - wallleft: 左壁
//   - floor: 床の手前
//   - desk: 右側のデスク

export type SlotType = "shelf" | "wallback" | "wallleft" | "floor" | "desk";

export interface RoomSlot {
  id: number;             // 0..N の通し番号
  type: SlotType;
  // SVG中心座標
  x: number;
  y: number;
  // アイテム描画サイズ
  w: number;
  h: number;
  // 描画z (大きいほど手前)
  z: number;
  // 推奨グッズタイプ (将来の優先度マッチ用)
  prefer?: "small" | "medium" | "large";
}

// 800x600 ビューボックス
// 後ろ壁: y=80~280, 床: y=280~520
const SHELF_TOP_Y = 175;
const SHELF_MID_Y = 230;
const SHELF_BOT_Y = 285;
const SHELF_XS = [220, 320, 420];

const WALLBACK_TOP_Y = 100;
const WALLBACK_XS = [180, 280, 380, 480];

const FLOOR_BACK_Y = 360;
const FLOOR_FRONT_Y = 450;
const FLOOR_XS = [180, 290, 400, 510];

const WALLLEFT_XS = [80];
const WALLLEFT_YS = [160, 240];

const DESK_X = 600;
const DESK_YS = [330, 380];

export const ROOM_SLOTS: RoomSlot[] = [
  // 棚 上段 (3スロット)
  ...SHELF_XS.map((x, i) => ({
    id: 0 + i,
    type: "shelf" as SlotType,
    x,
    y: SHELF_TOP_Y,
    w: 70,
    h: 70,
    z: 10,
    prefer: "small" as const,
  })),
  // 棚 中段 (3スロット)
  ...SHELF_XS.map((x, i) => ({
    id: 3 + i,
    type: "shelf" as SlotType,
    x,
    y: SHELF_MID_Y,
    w: 70,
    h: 70,
    z: 11,
    prefer: "small" as const,
  })),
  // 棚 下段 (3スロット)
  ...SHELF_XS.map((x, i) => ({
    id: 6 + i,
    type: "shelf" as SlotType,
    x,
    y: SHELF_BOT_Y,
    w: 70,
    h: 70,
    z: 12,
    prefer: "small" as const,
  })),

  // 後ろ壁 上 (4スロット, 缶バッジ・ポスター)
  ...WALLBACK_XS.map((x, i) => ({
    id: 9 + i,
    type: "wallback" as SlotType,
    x,
    y: WALLBACK_TOP_Y,
    w: 60,
    h: 60,
    z: 5,
    prefer: "small" as const,
  })),

  // 左壁 (2スロット)
  ...WALLLEFT_YS.map((y, i) => ({
    id: 13 + i,
    type: "wallleft" as SlotType,
    x: WALLLEFT_XS[0],
    y,
    w: 70,
    h: 90,
    z: 6,
    prefer: "medium" as const,
  })),

  // 床 後列 (4スロット)
  ...FLOOR_XS.map((x, i) => ({
    id: 15 + i,
    type: "floor" as SlotType,
    x,
    y: FLOOR_BACK_Y,
    w: 80,
    h: 80,
    z: 20 + i,
    prefer: "medium" as const,
  })),

  // 床 前列 (4スロット, 大きめのぬいぐるみ等)
  ...FLOOR_XS.map((x, i) => ({
    id: 19 + i,
    type: "floor" as SlotType,
    x,
    y: FLOOR_FRONT_Y,
    w: 90,
    h: 90,
    z: 30 + i,
    prefer: "large" as const,
  })),

  // デスク (右奥) (2スロット)
  ...DESK_YS.map((y, i) => ({
    id: 23 + i,
    type: "desk" as SlotType,
    x: DESK_X,
    y,
    w: 70,
    h: 70,
    z: 15 + i,
    prefer: "small" as const,
  })),
];

export const TOTAL_SLOTS = ROOM_SLOTS.length;

// アイテムの優先スロット順 (棚→床後→壁→デスク→床前)
export const SLOT_PRIORITY = [
  // shelf
  0, 1, 2, 3, 4, 5, 6, 7, 8,
  // floor back
  15, 16, 17, 18,
  // wallback
  9, 10, 11, 12,
  // desk
  23, 24,
  // wallleft
  13, 14,
  // floor front
  19, 20, 21, 22,
];

export function getSlotById(id: number): RoomSlot | undefined {
  return ROOM_SLOTS.find((s) => s.id === id);
}

// 与えられた占有スロットIDから空きスロットを優先順で返す
export function findNextSlot(occupied: Set<number>): RoomSlot | undefined {
  for (const id of SLOT_PRIORITY) {
    if (!occupied.has(id)) return getSlotById(id);
  }
  return undefined;
}
