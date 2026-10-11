/**
 * 推しの部屋の目録・配置の形・置き方の計算（絵を描かない、純粋な部分）。
 *
 * - 部屋は正面から見た1部屋。座標は「部屋の絵の単位」（横 ROOM_W・縦 ROOM_H。左上が 0,0）で持つ。
 *   画面の大きさが変わっても配置が崩れないよう、px ではなくこの単位で保存する。
 * - 置いた物の位置 (x, y) は「足もとの中央」。棚の板や机の天板に“立てて”置く物なので、下の辺を基準にする。
 * - 目録（どの key がどのセットか）は DB の oshi_room_assets と同じ。保存のときはサーバーが同じ目録で確かめる
 *   （scripts/test-oshi-room.mjs が、ここと migration の並びを突き合わせる）。
 * - セット 'base' は無料。それ以外は user_unlocks の 'room:<セット>' を買った人だけが使える。
 *
 * このファイルは node のテストからも読むので、React や "@/..." を import しない。
 */

export const ROOM_W = 360;
export const ROOM_H = 420;
/** 壁と床の境目（幅木の上）。ここより下が床 */
export const FLOOR_Y = 286;
/** 窓の位置。窓は動かせない部屋の一部（時間の移ろいを見せる場所なので、いつも同じ所にある） */
export const ROOM_WINDOW = { x: 112, y: 36, w: 100, h: 110 };
/** グッズ（フレーム込み）の、大きさ 1 のときの横幅 */
export const GOODS_BASE_W = 56;
export const MAX_FURNITURE = 20;
export const MAX_ROOM_GOODS = 5;
/** 大きさの範囲。DB の save_oshi_room（0.5〜2）より内側にして、丸めても外に出ないようにする */
export const SCALE_MIN = 0.6;
export const SCALE_MAX = 1.6;
/** 置いた物を、棚の板・机の天板に吸い付ける距離（縦） */
export const SNAP_DISTANCE = 14;

export const ROOM_SETS = ["base", "oshi", "sakura", "natsu", "halloween", "xmas", "yumekawa", "showcase"] as const;
export type RoomSet = (typeof ROOM_SETS)[number];

export type RoomAssetKind = "wallpaper" | "floor" | "furniture" | "frame";

export interface RoomAssetMeta {
  key: string;
  kind: RoomAssetKind;
  set: RoomSet;
}

const a = (key: string, kind: RoomAssetKind): RoomAssetMeta => ({ key, kind, set: key.split(".")[0] as RoomSet });

/** 目録。並びは migration 20261012300000_oshi_room.sql の INSERT と同じ */
export const ROOM_ASSETS: RoomAssetMeta[] = [
  a("base.cream", "wallpaper"),
  a("base.mint", "wallpaper"),
  a("base.lilac", "wallpaper"),
  a("base.wood", "floor"),
  a("base.carpet", "floor"),
  a("base.shelf", "furniture"),
  a("base.desk", "furniture"),
  a("base.rug", "furniture"),
  a("base.plant", "furniture"),
  a("base.lamp", "furniture"),
  a("base.wallshelf", "furniture"),
  a("base.frame", "frame"),
  a("base.acrylic", "frame"),
  a("base.badge", "frame"),
  a("base.photo", "frame"),
  a("oshi.wall", "wallpaper"),
  a("oshi.floor", "floor"),
  a("oshi.penlight", "furniture"),
  a("oshi.garland", "furniture"),
  a("oshi.ribbon", "frame"),
  a("sakura.wall", "wallpaper"),
  a("sakura.tatami", "floor"),
  a("sakura.tree", "furniture"),
  a("sakura.branch", "furniture"),
  a("sakura.frame", "frame"),
  a("natsu.wall", "wallpaper"),
  a("natsu.engawa", "floor"),
  a("natsu.chochin", "furniture"),
  a("natsu.kingyo", "furniture"),
  a("natsu.uchiwa", "frame"),
  a("halloween.wall", "wallpaper"),
  a("halloween.floor", "floor"),
  a("halloween.pumpkin", "furniture"),
  a("halloween.ghost", "furniture"),
  a("halloween.frame", "frame"),
  a("xmas.wall", "wallpaper"),
  a("xmas.floor", "floor"),
  a("xmas.tree", "furniture"),
  a("xmas.gifts", "furniture"),
  a("xmas.wreath", "frame"),
  a("yumekawa.wall", "wallpaper"),
  a("yumekawa.floor", "floor"),
  a("yumekawa.cloud", "furniture"),
  a("yumekawa.moon", "furniture"),
  a("yumekawa.heart", "frame"),
  a("showcase.wall", "wallpaper"),
  a("showcase.floor", "floor"),
  a("showcase.case", "furniture"),
  a("showcase.pedestal", "furniture"),
  a("showcase.gold", "frame"),
];

const ASSET_BY_KEY = new Map(ROOM_ASSETS.map((m) => [m.key, m]));

export function roomAsset(key: string | null | undefined): RoomAssetMeta | undefined {
  return key ? ASSET_BY_KEY.get(key) : undefined;
}

export function assetsOfKind(kind: RoomAssetKind): RoomAssetMeta[] {
  return ROOM_ASSETS.filter((m) => m.kind === kind);
}

/** セットを解放するキー（point_shop_items.unlock_key / user_unlocks.unlock_key） */
export function roomUnlockKey(set: RoomSet): string {
  return `room:${set}`;
}

/** 使えるか（無料の基本セットか、買ってあるか） */
export function isAssetUsable(key: string, owned: ReadonlySet<string>): boolean {
  const meta = roomAsset(key);
  if (!meta) return false;
  return meta.set === "base" || owned.has(roomUnlockKey(meta.set));
}

/** 翻訳キーの末尾（base.shelf → base_shelf） */
export function roomI18nId(key: string): string {
  return key.replace(".", "_");
}

// ---------------------------------------------------------------------------
// 家具・フレームの形（当たり判定と吸い付けに使う。絵は components/oshi/room/art が描く）
// ---------------------------------------------------------------------------

/** 家具の置き場所。wall は壁に掛ける物、flat は床に敷く物（ラグ）、stand は床に立てる物 */
export type FurnitureLayer = "wall" | "flat" | "stand";

/** 物を置ける面（棚の板・机の天板）。家具の箱の中の座標（左上が 0,0） */
export interface Surface {
  y: number;
  x0: number;
  x1: number;
}

export interface FurnitureDef {
  w: number;
  h: number;
  layer: FurnitureLayer;
  surfaces?: Surface[];
  /** 夜に灯る明かりの中心（家具の箱の中の座標）と半径 */
  light?: { x: number; y: number; r: number };
}

export const FURNITURE_DEFS: Record<string, FurnitureDef> = {
  "base.shelf": { w: 104, h: 170, layer: "stand", surfaces: [{ y: 2, x0: 4, x1: 100 }, { y: 86, x0: 9, x1: 95 }, { y: 160, x0: 9, x1: 95 }] },
  "base.desk": { w: 150, h: 84, layer: "stand", surfaces: [{ y: 5, x0: 6, x1: 144 }] },
  "base.rug": { w: 210, h: 44, layer: "flat" },
  "base.plant": { w: 60, h: 112, layer: "stand" },
  "base.lamp": { w: 46, h: 160, layer: "stand", light: { x: 23, y: 28, r: 80 } },
  "base.wallshelf": { w: 120, h: 26, layer: "wall", surfaces: [{ y: 4, x0: 6, x1: 114 }] },
  "oshi.penlight": { w: 50, h: 96, layer: "stand", light: { x: 25, y: 18, r: 56 } },
  "oshi.garland": { w: 220, h: 54, layer: "wall" },
  "sakura.tree": { w: 110, h: 150, layer: "stand" },
  "sakura.branch": { w: 150, h: 70, layer: "wall" },
  "natsu.chochin": { w: 52, h: 96, layer: "wall", light: { x: 26, y: 56, r: 70 } },
  "natsu.kingyo": { w: 80, h: 104, layer: "stand" },
  "halloween.pumpkin": { w: 76, h: 64, layer: "stand", light: { x: 38, y: 38, r: 64 } },
  "halloween.ghost": { w: 64, h: 80, layer: "wall" },
  "xmas.tree": { w: 120, h: 176, layer: "stand", light: { x: 60, y: 90, r: 90 } },
  "xmas.gifts": { w: 100, h: 60, layer: "stand", surfaces: [{ y: 10, x0: 8, x1: 52 }] },
  "yumekawa.cloud": { w: 170, h: 84, layer: "stand", surfaces: [{ y: 44, x0: 26, x1: 144 }] },
  "yumekawa.moon": { w: 70, h: 80, layer: "wall", light: { x: 35, y: 40, r: 70 } },
  "showcase.case": { w: 120, h: 200, layer: "stand", surfaces: [{ y: 4, x0: 4, x1: 116 }, { y: 98, x0: 10, x1: 110 }, { y: 188, x0: 10, x1: 110 }] },
  "showcase.pedestal": { w: 80, h: 92, layer: "stand", surfaces: [{ y: 6, x0: 6, x1: 74 }], light: { x: 40, y: -40, r: 80 } },
};

export type FrameShape = "rect" | "round" | "circle" | "heart";

export interface FrameDef {
  /** 縦 ÷ 横 */
  aspect: number;
  /** 写真の窓（フレームの箱に対する割合 0〜1） */
  window: { x: number; y: number; w: number; h: number };
  shape: FrameShape;
}

export const FRAME_DEFS: Record<string, FrameDef> = {
  "base.frame": { aspect: 1.22, window: { x: 0.15, y: 0.13, w: 0.7, h: 0.74 }, shape: "rect" },
  "base.acrylic": { aspect: 1.5, window: { x: 0.08, y: 0.04, w: 0.84, h: 0.74 }, shape: "round" },
  "base.badge": { aspect: 1.0, window: { x: 0.08, y: 0.08, w: 0.84, h: 0.84 }, shape: "circle" },
  "base.photo": { aspect: 1.28, window: { x: 0.1, y: 0.08, w: 0.8, h: 0.76 }, shape: "rect" },
  "oshi.ribbon": { aspect: 1.36, window: { x: 0.12, y: 0.24, w: 0.76, h: 0.66 }, shape: "round" },
  "sakura.frame": { aspect: 1.22, window: { x: 0.14, y: 0.12, w: 0.72, h: 0.76 }, shape: "round" },
  "natsu.uchiwa": { aspect: 1.5, window: { x: 0.1, y: 0.04, w: 0.8, h: 0.534 }, shape: "circle" },
  "halloween.frame": { aspect: 1.24, window: { x: 0.15, y: 0.13, w: 0.7, h: 0.74 }, shape: "rect" },
  "xmas.wreath": { aspect: 1.1, window: { x: 0.19, y: 0.17, w: 0.62, h: 0.564 }, shape: "circle" },
  "yumekawa.heart": { aspect: 0.95, window: { x: 0.08, y: 0.08, w: 0.84, h: 0.84 }, shape: "heart" },
  "showcase.gold": { aspect: 1.26, window: { x: 0.17, y: 0.15, w: 0.66, h: 0.7 }, shape: "rect" },
};

// ---------------------------------------------------------------------------
// 配置
// ---------------------------------------------------------------------------

export interface RoomFurniture {
  id: string;
  key: string;
  x: number;
  y: number;
  z: number;
  s: number;
  flip?: boolean;
}

export interface RoomGoods {
  item: string;
  x: number;
  y: number;
  z: number;
  s: number;
  frame: string;
  /** 上に置いている家具の id（家具を動かすと一緒に動く） */
  on?: string | null;
}

export interface RoomLayout {
  v: 1;
  furniture: RoomFurniture[];
  goods: RoomGoods[];
}

export interface RoomState {
  wallpaper: string;
  floor: string;
  layout: RoomLayout;
}

export const DEFAULT_WALLPAPER = "base.cream";
export const DEFAULT_FLOOR = "base.wood";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const round1 = (v: number) => Math.round(v * 10) / 10;

export function goodsSize(g: Pick<RoomGoods, "s" | "frame">): { w: number; h: number } {
  const def = FRAME_DEFS[g.frame] ?? FRAME_DEFS["base.frame"];
  const w = GOODS_BASE_W * g.s;
  return { w, h: w * def.aspect };
}

export function furnitureSize(f: Pick<RoomFurniture, "key" | "s">): { w: number; h: number } {
  const def = FURNITURE_DEFS[f.key];
  if (!def) return { w: 40 * f.s, h: 40 * f.s };
  return { w: def.w * f.s, h: def.h * f.s };
}

/** 置き場所ごとの、足もと（y）の動ける範囲 */
export function furnitureYRange(key: string, s: number): [number, number] {
  const def = FURNITURE_DEFS[key];
  const h = (def?.h ?? 40) * s;
  if (def?.layer === "wall") return [Math.max(h, 30), FLOOR_Y - 4];
  return [FLOOR_Y + 10, ROOM_H - 2];
}

export function clampFurniture(f: RoomFurniture): RoomFurniture {
  const { w } = furnitureSize(f);
  const [y0, y1] = furnitureYRange(f.key, f.s);
  // 横は半分まで外にはみ出してよい（部屋の端に寄せて置けるように）。縦は置き場所の中だけ
  return { ...f, x: clamp(f.x, w * 0.1, ROOM_W - w * 0.1), y: clamp(f.y, y0, y1) };
}

export function clampGoods(g: RoomGoods): RoomGoods {
  const { w, h } = goodsSize(g);
  return { ...g, x: clamp(g.x, w / 2, ROOM_W - w / 2), y: clamp(g.y, Math.min(h + 4, ROOM_H - 2), ROOM_H - 2) };
}

/** 家具の置ける面を、部屋の座標にしたもの */
export interface RoomSurface {
  furnitureId: string;
  y: number;
  x0: number;
  x1: number;
}

export function roomSurfaces(furniture: RoomFurniture[]): RoomSurface[] {
  const out: RoomSurface[] = [];
  for (const f of furniture) {
    const def = FURNITURE_DEFS[f.key];
    if (!def?.surfaces) continue;
    const top = f.y - def.h * f.s;
    for (const s of def.surfaces) {
      // 左右反転しても、面は箱の中で反転するだけ
      const lx0 = f.flip ? def.w - s.x1 : s.x0;
      const lx1 = f.flip ? def.w - s.x0 : s.x1;
      out.push({
        furnitureId: f.id,
        y: top + s.y * f.s,
        x0: f.x - (def.w / 2) * f.s + lx0 * f.s,
        x1: f.x - (def.w / 2) * f.s + lx1 * f.s,
      });
    }
  }
  return out;
}

/**
 * グッズを置く位置を決める。近くに棚の板・机の天板があれば、その上に吸い付ける。
 * 返す surface は吸い付けた面（模様替え中に、どこに置かれるかを線で見せるため）
 */
export function snapGoods(g: RoomGoods, furniture: RoomFurniture[]): { goods: RoomGoods; surface: RoomSurface | null } {
  const clamped = clampGoods(g);
  let best: RoomSurface | null = null;
  let bestD = SNAP_DISTANCE;
  for (const s of roomSurfaces(furniture)) {
    if (clamped.x < s.x0 - 4 || clamped.x > s.x1 + 4) continue;
    const d = Math.abs(clamped.y - s.y);
    if (d <= bestD) {
      best = s;
      bestD = d;
    }
  }
  if (!best) return { goods: { ...clamped, on: null }, surface: null };
  return { goods: { ...clamped, y: best.y, on: best.furnitureId }, surface: best };
}

/** 家具を動かしたとき、上に置いてあるグッズも同じだけ動かす（面の上に乗ったまま） */
export function moveFurniture(layout: RoomLayout, id: string, next: RoomFurniture): RoomLayout {
  const prev = layout.furniture.find((f) => f.id === id);
  if (!prev) return layout;
  const moved = clampFurniture(next);
  const furniture = layout.furniture.map((f) => (f.id === id ? moved : f));
  const dx = moved.x - prev.x;
  const dy = moved.y - prev.y;
  const scaled = moved.s !== prev.s || !!moved.flip !== !!prev.flip;
  const goods = layout.goods.map((g) => {
    if (g.on !== id) return g;
    if (!scaled) return { ...g, x: g.x + dx, y: g.y + dy };
    // 大きさ・向きが変わったら、いちばん近い面に載せ直す
    const surfaces = roomSurfaces([moved]);
    let best = surfaces[0];
    for (const s of surfaces) if (Math.abs(s.y - (g.y + dy)) < Math.abs(best.y - (g.y + dy))) best = s;
    if (!best) return { ...g, on: null };
    return { ...g, x: clamp(g.x + dx, best.x0, best.x1), y: best.y };
  });
  return { ...layout, furniture, goods };
}

/** 家具をしまう。上に置いてあったグッズは床に下ろす */
export function removeFurniture(layout: RoomLayout, id: string): RoomLayout {
  return {
    ...layout,
    furniture: layout.furniture.filter((f) => f.id !== id),
    goods: layout.goods.map((g) => (g.on === id ? clampGoods({ ...g, y: ROOM_H - 14, on: null }) : g)),
  };
}

export function newFurnitureId(existing: { id: string }[]): string {
  const used = new Set(existing.map((f) => f.id));
  for (let i = 1; i < 1000; i++) {
    const id = `f${i}`;
    if (!used.has(id)) return id;
  }
  return `f${Date.now().toString(36).slice(-6)}`;
}

/** 新しい家具を置く場所（部屋の真ん中あたり。壁に掛ける物は壁の真ん中） */
export function placeNewFurniture(layout: RoomLayout, key: string): RoomLayout {
  const def = FURNITURE_DEFS[key];
  const id = newFurnitureId(layout.furniture);
  const z = layout.furniture.reduce((m, f) => Math.max(m, f.z), -1) + 1;
  const y = def?.layer === "wall" ? 170 : def?.layer === "flat" ? ROOM_H - 16 : ROOM_H - 30;
  const f = clampFurniture({ id, key, x: ROOM_W / 2 + ((layout.furniture.length % 3) - 1) * 24, y, z, s: 1 });
  return { ...layout, furniture: [...layout.furniture, f] };
}

/** 基本の部屋（まだ保存していない人に見せる）。家具の id は固定にして、グッズの置き場所から指す */
export function defaultFurniture(): RoomFurniture[] {
  return [
    { id: "f1", key: "base.rug", x: 180, y: 412, z: 0, s: 1 },
    { id: "f2", key: "base.shelf", x: 60, y: 394, z: 1, s: 1 },
    { id: "f3", key: "base.desk", x: 262, y: 392, z: 2, s: 1 },
    { id: "f4", key: "base.lamp", x: 134, y: 372, z: 3, s: 1 },
    { id: "f5", key: "base.wallshelf", x: 292, y: 168, z: 4, s: 1 },
    { id: "f6", key: "base.plant", x: 334, y: 414, z: 5, s: 0.8 },
  ];
}

/**
 * 推しグッズの置き場所の候補（順位の順）。1位は部屋の真ん中の床に大きく、ほかは机・棚・壁の棚へ。
 * 家具は defaultFurniture の位置が前提。家具を動かした部屋では、空いている面を探す（slotFor）
 */
const DEFAULT_SLOTS: Omit<RoomGoods, "item" | "z">[] = [
  { x: 180, y: 404, s: 1.3, frame: "base.acrylic", on: null },
  { x: 262, y: 313, s: 1.0, frame: "base.photo", on: "f3" },
  { x: 60, y: 310, s: 0.8, frame: "base.badge", on: "f2" },
  { x: 292, y: 146, s: 0.8, frame: "base.frame", on: "f5" },
  { x: 60, y: 384, s: 0.8, frame: "base.photo", on: "f2" },
];

export function defaultLayout(goodsIds: string[]): RoomLayout {
  return mergeGoods({ v: 1, furniture: defaultFurniture(), goods: [] }, goodsIds);
}

/** 置き場所の候補のうち、i 番目（候補が家具を指していて、その家具が無ければ床へ） */
export function slotFor(layout: RoomLayout, index: number): Omit<RoomGoods, "item" | "z"> {
  const taken = (x: number, y: number) => layout.goods.some((g) => Math.abs(g.x - x) < 24 && Math.abs(g.y - y) < 24);
  // 候補を順に見て、まだ誰も置いていない所を使う
  for (let k = 0; k < DEFAULT_SLOTS.length; k++) {
    const slot = DEFAULT_SLOTS[(index + k) % DEFAULT_SLOTS.length];
    const host = slot.on ? layout.furniture.find((f) => f.id === slot.on) : null;
    if (slot.on && !host) continue;
    if (!taken(slot.x, slot.y)) return slot;
  }
  // 空きが無ければ床に横並び
  return { x: 60 + (index % 5) * 60, y: ROOM_H - 10, s: 0.9, frame: "base.photo", on: null };
}

/**
 * 保存された配置と、いまの推しグッズを合わせる。
 * - 推しグッズから外した物は消す
 * - まだ置き場所の無い推しグッズ（新しく選んだ物）は空いている候補に置く
 * - 上に置いた家具が無くなっていたら床に下ろす
 */
export function mergeGoods(layout: RoomLayout, goodsIds: string[]): RoomLayout {
  const ids = new Set(goodsIds);
  const fids = new Set(layout.furniture.map((f) => f.id));
  let goods = layout.goods
    .filter((g) => ids.has(g.item))
    .map((g) => (g.on && !fids.has(g.on) ? clampGoods({ ...g, y: ROOM_H - 14, on: null }) : g));
  let next: RoomLayout = { ...layout, goods };
  goodsIds.forEach((id, i) => {
    if (next.goods.some((g) => g.item === id)) return;
    const slot = slotFor(next, i);
    const z = next.goods.reduce((m, g) => Math.max(m, g.z), -1) + 1;
    goods = [...next.goods, { ...slot, item: id, z }];
    next = { ...next, goods };
  });
  return next;
}

/** サーバーから来た layout を、壊れていても落ちないように読む（変な要素は捨てる） */
export function parseLayout(raw: unknown): RoomLayout | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const furniture: RoomFurniture[] = [];
  const goods: RoomGoods[] = [];
  const seen = new Set<string>();
  for (const f of Array.isArray(r.furniture) ? r.furniture.slice(0, MAX_FURNITURE) : []) {
    if (!f || typeof f !== "object") continue;
    const o = f as Record<string, unknown>;
    const x = num(o.x), y = num(o.y), z = num(o.z), s = num(o.s);
    if (typeof o.id !== "string" || typeof o.key !== "string" || x === null || y === null || z === null || s === null) continue;
    if (!FURNITURE_DEFS[o.key] || seen.has(o.id)) continue;
    seen.add(o.id);
    furniture.push({ id: o.id, key: o.key, x, y, z, s: clamp(s, SCALE_MIN, SCALE_MAX), flip: o.flip === true });
  }
  for (const g of Array.isArray(r.goods) ? r.goods.slice(0, MAX_ROOM_GOODS) : []) {
    if (!g || typeof g !== "object") continue;
    const o = g as Record<string, unknown>;
    const x = num(o.x), y = num(o.y), z = num(o.z), s = num(o.s);
    if (typeof o.item !== "string" || x === null || y === null || z === null || s === null) continue;
    const frame = typeof o.frame === "string" && FRAME_DEFS[o.frame] ? o.frame : "base.frame";
    goods.push({ item: o.item, x, y, z, s: clamp(s, SCALE_MIN, SCALE_MAX), frame, on: typeof o.on === "string" ? o.on : null });
  }
  return { v: 1, furniture, goods };
}

/** 重なり順を 0,1,2… に詰める（同じ種類の中で、いまの順のまま） */
function normalizeZ<T extends { z: number }>(list: T[]): T[] {
  const order = [...list].map((v, i) => ({ v, i })).sort((p, q) => p.v.z - q.v.z || p.i - q.i);
  const zOf = new Map(order.map((o, rank) => [o.i, rank]));
  return list.map((v, i) => ({ ...v, z: zOf.get(i) ?? 0 }));
}

/** 保存する形に整える（丸め・範囲・重なり順・推しグッズだけ）。サーバーの確かめに通る形にする */
export function layoutForSave(layout: RoomLayout, goodsIds: string[]): RoomLayout {
  const furniture = normalizeZ(layout.furniture.slice(0, MAX_FURNITURE)).map((f) => {
    const c = clampFurniture({ ...f, s: clamp(f.s, SCALE_MIN, SCALE_MAX) });
    const out: RoomFurniture = { id: c.id, key: c.key, x: round1(c.x), y: round1(c.y), z: c.z, s: round1(c.s) };
    if (c.flip) out.flip = true;
    return out;
  });
  const fids = new Set(furniture.map((f) => f.id));
  const ids = new Set(goodsIds);
  const goods = normalizeZ(layout.goods.filter((g) => ids.has(g.item)).slice(0, MAX_ROOM_GOODS)).map((g) => {
    const c = clampGoods({ ...g, s: clamp(g.s, SCALE_MIN, SCALE_MAX) });
    return {
      item: c.item,
      x: round1(c.x),
      y: round1(c.y),
      z: c.z,
      s: round1(c.s),
      frame: c.frame,
      on: c.on && fids.has(c.on) ? c.on : null,
    };
  });
  return { v: 1, furniture, goods };
}

/** 重なり順をいちばん前（後ろ）へ。同じ種類（家具どうし・グッズどうし）の中で入れ替える */
export function bringTo<T extends { z: number }>(list: T[], index: number, where: "front" | "back" | "forward" | "backward"): T[] {
  const sorted = normalizeZ(list);
  const cur = sorted[index]?.z ?? 0;
  const max = sorted.length - 1;
  const target = where === "front" ? max : where === "back" ? 0 : where === "forward" ? Math.min(max, cur + 1) : Math.max(0, cur - 1);
  return sorted.map((v, i) => {
    if (i === index) return { ...v, z: target };
    if (target > cur && v.z > cur && v.z <= target) return { ...v, z: v.z - 1 };
    if (target < cur && v.z < cur && v.z >= target) return { ...v, z: v.z + 1 };
    return v;
  });
}

// ---------------------------------------------------------------------------
// 時間の雰囲気（日本時間）。部屋の状態ではなく、窓の外と明かりの見た目だけ
// ---------------------------------------------------------------------------

export type TimeOfDay = "morning" | "day" | "evening" | "night";

export function timeOfDayJst(now: number = Date.now()): TimeOfDay {
  const h = new Date(now + 9 * 3600e3).getUTCHours();
  if (h >= 5 && h < 10) return "morning";
  if (h >= 10 && h < 16) return "day";
  if (h >= 16 && h < 19) return "evening";
  return "night";
}
