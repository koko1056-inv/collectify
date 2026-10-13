// 推しの部屋の目録・配置の計算（src/lib/oshiRoom.ts）の確認。  npm run test:oshi-room
//
// 目録（どの key がどのセットか）はアプリと DB（migration の INSERT）の2か所にある。
// ずれると「アプリでは置けるのにサーバーが保存を断る」形で壊れるので、ここで突き合わせる。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  FLOOR_Y,
  FRAME_DEFS,
  FURNITURE_DEFS,
  MAX_FURNITURE,
  ROOM_ASSETS,
  ROOM_H,
  ROOM_SETS,
  ROOM_W,
  bringTo,
  defaultLayout,
  goodsSize,
  isAssetUsable,
  layoutForSave,
  mergeGoods,
  moveFurniture,
  parseLayout,
  placeNewFurniture,
  removeFurniture,
  roomI18nId,
  roomItemFromUnlockKey,
  roomItemUnlockKey,
  roomSurfaces,
  roomUnlockKey,
  setUnlockLevel,
  snapGoods,
  timeOfDayJst,
  LEVEL_SETS,
  ROOM_SINGLE_ITEMS,
  SHOP_SETS,
} from "../src/lib/oshiRoom.ts";
import {
  LEVEL_POINTS,
  LEVEL_REWARDS,
  LINE_COUNT,
  TIER_START,
  bondSummary,
  expectedRewards,
  idleBob,
  levelItemsAt,
  parseRewards,
  pickLine,
  reactionTier,
  rewardAt,
} from "../src/lib/oshiLevel.ts";
import { ROOM_SET_KEYS, isRoomItemKey, isRoomSetKey } from "../src/lib/cosmetics.ts";
import { oshiRoom } from "../src/translations/modules/oshiRoom.ts";
import { cosmetics } from "../src/translations/modules/cosmetics.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// 目録とショップの商品は、はじめの部屋（20261012300000）と、増やしたセット・特典・単品（20261013100000）の2つにある
const migration = ["20261012300000_oshi_room.sql", "20261013100000_oshi_room_more_sets.sql"]
  .map((f) => readFileSync(resolve(root, "supabase/migrations", f), "utf8"))
  .join("\n");
const rewardsMigration = readFileSync(resolve(root, "supabase/migrations/20261013100100_oshi_level_rewards.sql"), "utf8");

// ── 目録が DB と同じか（並び・種類・セット） ──
const dbAssets = [...migration.matchAll(/\('([a-z0-9]+\.[a-z0-9_]+)', '(wallpaper|floor|furniture|frame)', '([a-z0-9]+)'\)/g)].map((m) => ({ key: m[1], kind: m[2], set: m[3] }));
assert.deepEqual(
  ROOM_ASSETS.map((a) => ({ key: a.key, kind: a.kind, set: a.set })),
  dbAssets,
  "ROOM_ASSETS と migration の oshi_room_assets がずれている"
);
assert.equal(new Set(ROOM_ASSETS.map((a) => a.key)).size, ROOM_ASSETS.length, "目録の key が重なっている");
assert.deepEqual([...new Set(ROOM_ASSETS.map((a) => a.set))], [...ROOM_SETS], "ROOM_SETS と目録のセットの並びがずれている");

// ── ショップの商品（room:*）が、セットと cosmetics.ts の ROOM_SET_KEYS と同じか（レベルの特典は売らない） ──
const shopKeys = [...migration.matchAll(/'(room:[a-z0-9]+)'\)/g)].map((m) => m[1]);
const paidSets = SHOP_SETS.map(roomUnlockKey);
assert.deepEqual(shopKeys, paidSets, "ショップの room:* と ROOM_SETS（ショップのセット）がずれている");
assert.deepEqual(ROOM_SET_KEYS, paidSets, "cosmetics.ts の ROOM_SET_KEYS と ROOM_SETS がずれている");
for (const set of Object.keys(LEVEL_SETS)) assert.ok(!shopKeys.includes(roomUnlockKey(set)), `レベルの特典 ${set} がショップにある`);

// ── 単品（room:<目録の key>）が、ROOM_SINGLE_ITEMS と同じか。ショップのセットの家具・フレームだけ ──
const singleKeys = [...migration.matchAll(/'(room:[a-z0-9]+\.[a-z0-9_]+)'\)/g)].map((m) => m[1]);
assert.deepEqual(singleKeys, ROOM_SINGLE_ITEMS.map(roomItemUnlockKey), "ショップの単品と ROOM_SINGLE_ITEMS がずれている");
for (const key of ROOM_SINGLE_ITEMS) {
  const meta = ROOM_ASSETS.find((a) => a.key === key);
  assert.ok(meta, `単品 ${key} が目録に無い`);
  assert.ok(meta.kind === "furniture" || meta.kind === "frame", `単品 ${key} は家具かフレームだけ`);
  assert.ok(SHOP_SETS.includes(meta.set), `単品 ${key} はショップのセットの物だけ`);
  assert.equal(roomItemFromUnlockKey(roomItemUnlockKey(key)), key);
  assert.equal(isRoomItemKey(roomItemUnlockKey(key)), true);
  assert.equal(isRoomSetKey(roomItemUnlockKey(key)), false);
}
assert.equal(roomItemFromUnlockKey("room:sakura"), null);
assert.equal(roomItemFromUnlockKey("room:nope.thing"), null);
assert.equal(roomItemFromUnlockKey("cover:starry"), null);
assert.equal(isRoomItemKey("room:sakura"), false);
// 単品の値段は 50〜100pt、セットは 150〜300pt
for (const m of migration.matchAll(/'cosmetic', 'unlock', (\d+), 1, true, 'home', \d+, '(room:[a-z0-9._]+)'\)/g)) {
  const cost = Number(m[1]);
  if (m[2].includes(".")) assert.ok(cost >= 50 && cost <= 100, `単品の値段: ${m[2]} ${cost}`);
  else assert.ok(cost >= 150 && cost <= 300, `セットの値段: ${m[2]} ${cost}`);
}

// ── ショップのセットは 壁紙1・床1・家具2〜3・フレーム1（基本は家具とフレームが多い）。レベルの特典は1〜3つ ──
for (const set of ROOM_SETS) {
  const of = (kind) => ROOM_ASSETS.filter((a) => a.set === set && a.kind === kind).length;
  if (setUnlockLevel(set) !== null) {
    const n = ROOM_ASSETS.filter((a) => a.set === set).length;
    assert.ok(n >= 1 && n <= 3, `${set} の特典の数`);
    continue;
  }
  assert.ok(of("wallpaper") >= 1 && of("floor") >= 1 && of("furniture") >= 2 && of("frame") >= 1, `${set} の中身が足りない`);
  if (set !== "base") assert.ok(of("furniture") <= 3 && of("frame") === 1, `${set} の家具・フレームの数`);
}

// ── 家具の置ける面・明かりが、家具の箱の中にあるか ──
for (const [key, def] of Object.entries(FURNITURE_DEFS)) {
  for (const s of def.surfaces ?? []) {
    assert.ok(s.y >= 0 && s.y <= def.h && s.x0 >= 0 && s.x1 <= def.w && s.x0 < s.x1, `${key} の面が箱の外: ${JSON.stringify(s)}`);
  }
}
for (const [key, def] of Object.entries(FRAME_DEFS)) {
  const w = def.window;
  assert.ok(w.x >= 0 && w.y >= 0 && w.x + w.w <= 1 && w.y + w.h <= 1, `${key} の窓がフレームの外`);
}

// ── 形の定義と、日英の名前が全部あるか ──
for (const a of ROOM_ASSETS) {
  if (a.kind === "furniture") assert.ok(FURNITURE_DEFS[a.key], `FURNITURE_DEFS に ${a.key} が無い`);
  if (a.kind === "frame") assert.ok(FRAME_DEFS[a.key], `FRAME_DEFS に ${a.key} が無い`);
  assert.ok(oshiRoom.ja.assets[roomI18nId(a.key)], `ja の名前が無い: ${a.key}`);
  assert.ok(oshiRoom.en.assets[roomI18nId(a.key)], `en の名前が無い: ${a.key}`);
}
for (const set of ROOM_SETS) {
  assert.ok(oshiRoom.ja.sets[set] && oshiRoom.en.sets[set], `セット名が無い: ${set}`);
}
assert.deepEqual(Object.keys(FURNITURE_DEFS).sort(), ROOM_ASSETS.filter((a) => a.kind === "furniture").map((a) => a.key).sort());
assert.deepEqual(Object.keys(FRAME_DEFS).sort(), ROOM_ASSETS.filter((a) => a.kind === "frame").map((a) => a.key).sort());

// ── 使えるか（基本は無料・ほかは買ったセット・単品・レベルで解放したセットだけ。DB の oshi_room_require_asset と同じ） ──
assert.equal(isAssetUsable("base.shelf", new Set()), true);
assert.equal(isAssetUsable("sakura.tree", new Set()), false);
assert.equal(isAssetUsable("sakura.tree", new Set(["room:sakura"])), true);
assert.equal(isAssetUsable("sakura.tree", new Set(["room:sakura.tree"])), true);
assert.equal(isAssetUsable("sakura.branch", new Set(["room:sakura.tree"])), false);
assert.equal(isAssetUsable("lv5.wall", new Set()), false);
assert.equal(isAssetUsable("lv5.wall", new Set(["room:lv3"])), false);
assert.equal(isAssetUsable("lv5.wall", new Set(["room:lv5"])), true);
assert.equal(isAssetUsable("nope.thing", new Set(["room:nope"])), false);

// ── なかよしレベルの特典（lib/oshiLevel.ts）。ポイントの表は DB の point_rewards と同じか ──
const dbPoints = {};
for (const m of rewardsMigration.matchAll(/\('companion_lv(\d+)',\s*(\d+),/g)) dbPoints[m[1]] = Number(m[2]);
for (const m of rewardsMigration.matchAll(/SET points = (\d+)[^;]*reason = 'companion_lv(\d+)'/g)) dbPoints[m[2]] = Number(m[1]);
assert.deepEqual(
  Object.fromEntries(Object.entries(LEVEL_POINTS).map(([k, v]) => [String(k), v])),
  dbPoints,
  "LEVEL_POINTS と migration の point_rewards がずれている"
);
assert.deepEqual(Object.keys(LEVEL_POINTS).map(Number), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert.deepEqual(LEVEL_REWARDS.map((r) => r.level), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
// レベルの特典のセットは Lv3・5・7・10 で、目録にある
assert.deepEqual(Object.values(LEVEL_SETS), [3, 5, 7, 10]);
for (const [set, lv] of Object.entries(LEVEL_SETS)) {
  assert.ok(ROOM_SETS.includes(set));
  assert.equal(setUnlockLevel(set), lv);
  assert.deepEqual(levelItemsAt(lv), ROOM_ASSETS.filter((a) => a.set === set).map((a) => a.key));
  assert.equal(rewardAt(lv).set, set);
}
assert.equal(setUnlockLevel("sakura"), null);
assert.deepEqual(levelItemsAt(4), []);
// 反応の段階
assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(reactionTier), [1, 1, 1, 2, 2, 2, 3, 3, 3, 4]);
assert.deepEqual(TIER_START, { 1: 1, 2: 4, 3: 7, 4: 10 });
assert.equal(rewardAt(4).tier, 2);
assert.equal(rewardAt(5).tier, null);
assert.equal(rewardAt(10).tier, 4);
assert.equal(rewardAt(1), null);
assert.equal(rewardAt(11), null);
assert.ok(idleBob(10) > idleBob(7) && idleBob(7) > idleBob(4) && idleBob(4) > idleBob(1));
// 見込みの特典（写真の保存からのレベルアップ）: 間のレベルのポイントの合計と、まだ持っていないセット
assert.deepEqual(expectedRewards(1, 5, new Set(["room:lv3"])), { points: 3 + 5 + 5 + 10, unlocked: ["lv5"] });
assert.deepEqual(expectedRewards(9, 10, new Set()), { points: 30, unlocked: ["lv10"] });
assert.deepEqual(expectedRewards(5, 5, new Set()), { points: 0, unlocked: [] });
// サーバーの答えを読む（変な形でも落ちない）
assert.deepEqual(parseRewards({ points: 15, unlocked: ["lv5", "evil", 3] }), { points: 15, unlocked: ["lv5"] });
assert.equal(parseRewards(null), null);
assert.deepEqual(parseRewards({ points: "x" }), { points: 0, unlocked: [] });
// ひとこと: Lv1〜3 は言わない。直前と同じ番号は続けない
assert.equal(pickLine(1, 0.5), null);
assert.equal(pickLine(2, 0).key, "oshiRoom.lines.mid.1");
assert.equal(pickLine(4, 0.9999).key, `oshiRoom.lines.max.${LINE_COUNT}`);
for (let i = 0; i < 50; i++) {
  const r = i / 50;
  const a = pickLine(3, r);
  const b = pickLine(3, r, a.n);
  assert.notEqual(a.n, b.n);
  assert.ok(b.n >= 1 && b.n <= LINE_COUNT);
}
for (const lang of ["ja", "en"]) {
  for (const g of ["mid", "high", "max"]) {
    for (let n = 1; n <= LINE_COUNT; n++) assert.ok(oshiRoom[lang].lines[g][n], `${lang} のひとことが無い: ${g}.${n}`);
  }
  for (const tier of [2, 3, 4]) {
    assert.ok(oshiRoom[lang].fx.tierUp[tier] && oshiRoom[lang].next.tier[tier], `${lang} の反応の段階の文言が無い: ${tier}`);
  }
  for (const set of SHOP_SETS) {
    const id = roomUnlockKey(set).replace(":", "_");
    assert.ok(cosmetics[lang].items[id]?.name && cosmetics[lang].items[id]?.desc, `${lang} のショップの名前が無い: ${id}`);
  }
}
assert.deepEqual(bondSummary([10, 3, 1]), { total: 14, best: 10 });
assert.deepEqual(bondSummary([]), { total: 0, best: 0 });

// ── サーバーの確かめ（save_oshi_room）と同じ範囲に入っているか ──
const UUIDS = ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222", "33333333-3333-3333-3333-333333333333", "44444444-4444-4444-4444-444444444444", "55555555-5555-5555-5555-555555555555"];
function assertSavable(layout) {
  assert.equal(layout.v, 1);
  assert.ok(layout.furniture.length <= 20 && layout.goods.length <= 5);
  const fids = new Set();
  for (const f of layout.furniture) {
    assert.deepEqual(Object.keys(f).filter((k) => !["id", "key", "x", "y", "z", "s", "flip"].includes(k)), []);
    assert.match(f.id, /^[a-z0-9_-]{1,24}$/);
    assert.ok(!fids.has(f.id));
    fids.add(f.id);
    assert.ok(f.x >= 0 && f.x <= 360 && f.y >= 0 && f.y <= 420 && f.z >= 0 && f.z <= 100 && f.s >= 0.5 && f.s <= 2, JSON.stringify(f));
  }
  for (const g of layout.goods) {
    assert.deepEqual(Object.keys(g).filter((k) => !["item", "x", "y", "z", "s", "frame", "on"].includes(k)), []);
    assert.ok(g.x >= 0 && g.x <= 360 && g.y >= 0 && g.y <= 420 && g.z >= 0 && g.z <= 100 && g.s >= 0.5 && g.s <= 2, JSON.stringify(g));
    assert.ok(g.on === null || fids.has(g.on));
  }
  assert.ok(JSON.stringify(layout).length < 12000);
}

const def5 = defaultLayout(UUIDS);
assert.equal(def5.goods.length, 5);
assertSavable(layoutForSave(def5, UUIDS));
// 基本の部屋では、棚・机・壁の棚に置いたグッズが、その面の上にちゃんと立っている
for (const g of def5.goods.filter((g) => g.on)) {
  const s = roomSurfaces(def5.furniture).filter((s) => s.furnitureId === g.on);
  assert.ok(s.some((s) => Math.abs(s.y - g.y) < 0.6 && g.x >= s.x0 && g.x <= s.x1), `基本の置き場所が面から浮いている: ${JSON.stringify(g)}`);
}
// グッズどうしが重なっていない
for (let i = 0; i < def5.goods.length; i++) {
  for (let j = i + 1; j < def5.goods.length; j++) {
    const a = def5.goods[i], b = def5.goods[j];
    assert.ok(Math.abs(a.x - b.x) > 20 || Math.abs(a.y - b.y) > 20, "基本の置き場所が重なっている");
  }
}

// ── 推しグッズが増えた・減った ──
const two = defaultLayout(UUIDS.slice(0, 2));
const grown = mergeGoods(two, UUIDS.slice(0, 3));
assert.equal(grown.goods.length, 3);
assert.deepEqual(grown.goods.slice(0, 2), two.goods);
const shrunk = mergeGoods(def5, [UUIDS[4]]);
assert.deepEqual(shrunk.goods.map((g) => g.item), [UUIDS[4]]);

// ── 吸い付け ──
const desk = def5.furniture.find((f) => f.key === "base.desk");
const deskTop = roomSurfaces([desk])[0];
const near = snapGoods({ item: "x", x: desk.x, y: deskTop.y + 8, z: 0, s: 1, frame: "base.frame" }, def5.furniture);
assert.equal(near.goods.y, deskTop.y);
assert.equal(near.goods.on, desk.id);
const far = snapGoods({ item: "x", x: desk.x, y: deskTop.y + 40, z: 0, s: 1, frame: "base.frame" }, def5.furniture);
assert.equal(far.goods.on, null);
assert.equal(far.surface, null);

// ── 家具を動かすと、上のグッズも一緒に動く／しまうと床に下りる ──
const onDesk = def5.goods.find((g) => g.on === desk.id);
const moved = moveFurniture(def5, desk.id, { ...desk, x: desk.x - 20 });
const after = moved.goods.find((g) => g.item === onDesk.item);
assert.equal(Math.round(after.x), Math.round(onDesk.x - 20));
assert.equal(after.y, onDesk.y);
const removed = removeFurniture(def5, desk.id);
const fell = removed.goods.find((g) => g.item === onDesk.item);
assert.equal(fell.on, null);
assert.ok(fell.y > FLOOR_Y);
// 大きさを変えたら、面に載せ直す
const bigger = moveFurniture(def5, desk.id, { ...desk, s: 1.3 });
const resurf = roomSurfaces(bigger.furniture.filter((f) => f.id === desk.id))[0];
assert.equal(bigger.goods.find((g) => g.item === onDesk.item).y, resurf.y);

// ── 壁の物は壁、床の物は床に収まる ──
let many = def5;
for (let i = 0; i < 30; i++) many = placeNewFurniture(many, i % 2 ? "natsu.chochin" : "base.plant");
for (const f of many.furniture) {
  const layer = FURNITURE_DEFS[f.key].layer;
  if (layer === "wall") assert.ok(f.y <= FLOOR_Y, `壁の物が床にある: ${f.key}`);
  else assert.ok(f.y > FLOOR_Y, `床の物が壁にある: ${f.key}`);
}
const capped = layoutForSave(many, UUIDS);
assert.equal(capped.furniture.length, MAX_FURNITURE);
assertSavable(capped);

// ── 保存の形に整える（範囲の外・推しグッズでない物・重なり順） ──
const messy = {
  v: 1,
  furniture: [
    { id: "a", key: "base.desk", x: 9999, y: -50, z: 40, s: 9 },
    { id: "b", key: "base.rug", x: 10.123456, y: 500, z: 3, s: 0.1 },
  ],
  goods: [
    { item: UUIDS[0], x: -40, y: 9999, z: 9, s: 1, frame: "base.badge", on: "zzz" },
    { item: "not-oshi", x: 10, y: 10, z: 0, s: 1, frame: "base.frame", on: null },
  ],
};
const cleaned = layoutForSave(messy, UUIDS);
assertSavable(cleaned);
assert.deepEqual(cleaned.furniture.map((f) => f.z), [1, 0]);
assert.equal(cleaned.goods.length, 1);
assert.equal(cleaned.goods[0].on, null);
assert.equal(String(cleaned.furniture[1].x).split(".")[1]?.length ?? 0, 1);

// ── 壊れた layout を読んでも落ちない ──
assert.equal(parseLayout(null), null);
assert.equal(parseLayout([1, 2]), null);
const parsed = parseLayout({ furniture: [{ id: "a", key: "base.desk", x: 1, y: 2, z: 0, s: 1 }, { id: "a", key: "base.desk", x: 1, y: 2, z: 0, s: 1 }, { id: "c", key: "evil", x: 1, y: 2, z: 0, s: 1 }, "x", { id: "d", key: "base.rug", x: "1", y: 2, z: 0, s: 1 }], goods: [{ item: UUIDS[0], x: 1, y: 2, z: 0, s: 1, frame: "unknown" }] });
assert.equal(parsed.furniture.length, 1);
assert.equal(parsed.goods[0].frame, "base.frame");

// ── 重なり順 ──
const zs = [{ z: 0 }, { z: 1 }, { z: 2 }];
assert.deepEqual(bringTo(zs, 0, "forward").map((v) => v.z), [1, 0, 2]);
assert.deepEqual(bringTo(zs, 0, "front").map((v) => v.z), [2, 0, 1]);
assert.deepEqual(bringTo(zs, 2, "backward").map((v) => v.z), [0, 2, 1]);
assert.deepEqual(bringTo(zs, 2, "back").map((v) => v.z), [1, 2, 0]);

// ── 大きさ ──
assert.equal(goodsSize({ s: 1, frame: "base.badge" }).w, goodsSize({ s: 1, frame: "base.badge" }).h);
assert.ok(ROOM_W === 360 && ROOM_H === 420);

// ── 時間帯（日本時間） ──
const at = (h) => Date.parse(`2026-10-10T${String((h + 24 - 9) % 24).padStart(2, "0")}:30:00Z`);
assert.equal(timeOfDayJst(at(4)), "night");
assert.equal(timeOfDayJst(at(5)), "morning");
assert.equal(timeOfDayJst(at(9)), "morning");
assert.equal(timeOfDayJst(at(10)), "day");
assert.equal(timeOfDayJst(at(15)), "day");
assert.equal(timeOfDayJst(at(16)), "evening");
assert.equal(timeOfDayJst(at(18)), "evening");
assert.equal(timeOfDayJst(at(19)), "night");
assert.equal(timeOfDayJst(at(0)), "night");

console.log("oshi-room: all tests passed");
