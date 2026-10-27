// グッズのカテゴリ分類表（src/lib/goodsTaxonomy.ts）と、同じ表を持つマイグレーション・dry-run の確認。
//   npm run test:taxonomy
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  GOODS_GROUPS,
  LEFT_ALONE_TAGS,
  NULL_JUNK_TAGS,
  NULL_TAG_TO_CHARACTER,
  NULL_TAG_TO_TYPE,
  TYPE_TAG_MERGES,
  TYPE_TAG_TO_SOURCE,
  canonicalTypeLeaf,
  countChipFacets,
  groupOfTypeTag,
  isChipFilterActive,
  matchesChipFilter,
} from "../src/lib/goodsTaxonomy.ts";

const MIGRATION = "supabase/migrations/20261027220000_category_tag_cleanup.sql";
const DRYRUN = "supabase/manual/20261027_category_tag_cleanup_dryrun.sql";

// 本番の type タグ（2026-10-27 時点のスナップショット。80件）
const SNAPSHOT_TYPE_TAGS = [
  "カード", "アクリルスタンド", "キーホルダー", "その他", "インテリア", "ステッカー", "フィギュア", "缶バッジ", "ぬいぐるみ",
  "ポーチ", "マスコット", "セット", "タオル", "バッグ", "Tシャツ", "クリアファイル", "ウェア", "マグカップ", "ケース",
  "アクセサリー", "CD", "キッチン用品", "筆記具", "コスメ", "ポスター", "日用品", "靴下", "おもちゃ", "付箋", "ヘアアクセサリー",
  "ノート", "スマホケース", "パーカー", "クッション", "マグネット", "カードホルダー", "タンブラー", "キャップ", "ピンズ",
  "バス用品", "ブロマイド", "スマホリング", "雑誌", "文房具", "充電グッズ", "ワッペン", "傘", "映像", "ミニ色紙", "ラバー",
  "ブランケット", "ジャケット", "スウェット", "ペンライト", "ハンカチ", "レコード", "ペット用品", "ニット", "うちわ", "ガチャ",
  "アクリルフォト", "フォトカード", "スカーフ", "ペン", "バンド", "グラス", "アルバム", "バインダー", "ブローチ", "レターセット",
  "ブレスレット", "ハンディファン", "コースター", "プレート", "スノードーム", "ネイル", "プラモデル", "アクスタンプ",
  "ネッククーラー", "ブロマイド（生写真）",
];
// 本番のカテゴリ未設定タグ（名前。同名が複数あるものもある）
const SNAPSHOT_NULL_TAGS = [
  "うさぎ", "ちいかわマスコット", "クリアファイル", "ちいかわ（キャラクター名）", "フィギュア", "タオル", "バッグ", "モモンガ",
  "ステッカー", "ワッペン", "ホワイトラウンジ", "ちいかわ", "なし", "ミセスグリーンアップルa", "マスコット", "ハチワレ", "tシャツ",
  "ちいかわ寿司", "アクリルスタンド", "ポーチ",
];

assert.equal(new Set(SNAPSHOT_TYPE_TAGS).size, 80);

// --- 1. 分類表そのもの ---
const allLeaves = GOODS_GROUPS.flatMap((g) => g.leaves);
assert.equal(new Set(allLeaves).size, allLeaves.length, "小分類が2つの大分類に入っている");
assert.equal(new Set(GOODS_GROUPS.map((g) => g.key)).size, GOODS_GROUPS.length);
const leafSet = new Set(allLeaves);

// スナップショットの type タグは、どれも「ちょうど1つの大分類」か「入手方法へ移す」のどちらか
for (const name of SNAPSHOT_TYPE_TAGS) {
  const inGroups = GOODS_GROUPS.filter((g) => g.leaves.includes(canonicalTypeLeaf(name)));
  if (name in TYPE_TAG_TO_SOURCE) {
    assert.equal(groupOfTypeTag(name), null, `${name} は入手方法へ移すのでカテゴリに入れない`);
    assert.equal(inGroups.length, 0);
    continue;
  }
  assert.equal(inGroups.length, 1, `${name} が大分類にちょうど1つ入っていない`);
  assert.equal(groupOfTypeTag(name), inGroups[0].key);
}
// 分類表の小分類は、どれも本番にある（またはマイグレーションで統合先になる）名前
for (const leaf of allLeaves) assert.ok(SNAPSHOT_TYPE_TAGS.includes(leaf), `${leaf} は本番の type タグに無い`);
// 表に無い新しいタグは「その他」
assert.equal(groupOfTypeTag("まだ無いタグ"), "other");

// --- 2. 統合表の健全性 ---
for (const [src, dst] of Object.entries(TYPE_TAG_MERGES)) {
  assert.ok(!leafSet.has(src), `統合元 ${src} が小分類に残っている`);
  assert.ok(leafSet.has(dst), `統合先 ${dst} が小分類に無い`);
  assert.notEqual(src, dst);
}
for (const [src, dst] of Object.entries(NULL_TAG_TO_TYPE)) {
  assert.ok(leafSet.has(dst), `未分類 ${src} の統合先 ${dst} が小分類に無い`);
  assert.ok(SNAPSHOT_NULL_TAGS.includes(src));
}
for (const src of [...Object.keys(NULL_TAG_TO_CHARACTER), ...NULL_JUNK_TAGS]) assert.ok(SNAPSHOT_NULL_TAGS.includes(src));
// 同じ未分類タグを2通りに扱わない／触らないものは対象表に入れない
const handledNull = [...Object.keys(NULL_TAG_TO_TYPE), ...Object.keys(NULL_TAG_TO_CHARACTER), ...NULL_JUNK_TAGS];
assert.equal(new Set(handledNull).size, handledNull.length, "未分類タグが2つの扱いに入っている");
for (const name of LEFT_ALONE_TAGS) {
  assert.ok(!handledNull.includes(name), `${name} は触らない一覧と対象表の両方にある`);
  assert.ok(!(name in TYPE_TAG_MERGES) && !(name in TYPE_TAG_TO_SOURCE), `${name} は触らない一覧と統合表の両方にある`);
}
// 未分類タグは、どれも「扱う」か「触らない」のどちらか
for (const name of SNAPSHOT_NULL_TAGS) {
  assert.ok(handledNull.includes(name) || LEFT_ALONE_TAGS.includes(name), `未分類 ${name} の扱いが決まっていない`);
}

// --- 3. SQL と同じ内容か ---
const sql = readFileSync(MIGRATION, "utf8");
const dry = readFileSync(DRYRUN, "utf8");
const between = (s, name) => {
  const b = s.indexOf(`-- >>> ${name}:begin`);
  const e = s.indexOf(`-- <<< ${name}:end`);
  assert.ok(b >= 0 && e > b, `${name} ブロックが見つからない`);
  return s.slice(b, e);
};
const tuples = (s) => [...s.matchAll(/\('([^']+)'(?:,\s*'([^']+)')?(?:,\s*(\d+))?\)/g)].map((m) => m.slice(1).filter((x) => x !== undefined));

// 大分類の表
const sqlTaxonomy = tuples(between(sql, "taxonomy")).map(([leaf, key]) => `${leaf}=${key}`).sort();
const tsTaxonomy = GOODS_GROUPS.flatMap((g) => g.leaves.map((l) => `${l}=${g.key}`)).sort();
assert.deepEqual(sqlTaxonomy, tsTaxonomy, "goods_type_groups と GOODS_GROUPS が違う");
// 大分類の並び（sort_order）が画面の並びと同じ
const orderOf = new Map(tuples(between(sql, "taxonomy")).map(([, key, order]) => [key, Number(order)]));
const orders = GOODS_GROUPS.map((g) => orderOf.get(g.key));
assert.deepEqual(orders, [...orders].sort((a, b) => a - b), "sort_order の並びが GOODS_GROUPS と違う");

// 対応表（plan ブロックの values）
const plan = between(sql, "plan");
const mapOf = (cte) => {
  const m = plan.match(new RegExp(`${cte}\\([^)]*\\) as \\(\\s*values([\\s\\S]*?)\\n\\),`));
  assert.ok(m, `${cte} が plan に無い`);
  return Object.fromEntries(tuples(m[1]).map(([a, b]) => [a, b ?? a]));
};
assert.deepEqual(mapOf("type_merge_map"), { ...TYPE_TAG_MERGES });
assert.deepEqual(mapOf("type_to_source_map"), { ...TYPE_TAG_TO_SOURCE });
assert.deepEqual(mapOf("null_type_map"), { ...NULL_TAG_TO_TYPE });
assert.deepEqual(mapOf("null_char_map"), { ...NULL_TAG_TO_CHARACTER });
assert.deepEqual(Object.keys(mapOf("null_junk")), [...NULL_JUNK_TAGS]);

// dry-run はマイグレーションと同じ条件で、読み取りだけ
assert.equal(between(dry, "plan"), plan, "dry-run の plan ブロックがマイグレーションと違う");
assert.equal(between(dry, "links"), between(sql, "links"), "dry-run の links ブロックがマイグレーションと違う");
const dryCode = dry.replace(/--[^\n]*/g, "").toLowerCase();
for (const w of ["insert", "update", "delete", "create", "alter", "drop", "truncate", "grant", "revoke", "into", "do", "call", "copy"]) {
  assert.ok(!new RegExp(`\\b${w}\\b`).test(dryCode), `dry-run に書き込み（${w}）がある`);
}
// マイグレーションは INSERT で item_tags に紐付けを足さない（通知トリガーを動かさない）
assert.ok(!/insert\s+into\s+public\.item_tags\s*\(/i.test(sql), "item_tags に INSERT している");
assert.ok(!/delete\s+from\s+public\.(tags|official_items)\b/i.test(sql), "tags / official_items を消している");

// --- 4. 絞り込みチップ ---
const item = (...tags) => ({ item_tags: tags.map(([category, name]) => ({ tags: { name, category } })) });
const items = [
  item(["content", "ちいかわ"], ["character", "うさぎ"], ["type", "缶バッジ"], ["source", "一番くじ"]),
  item(["content", "ちいかわ"], ["character", "ハチワレ"], ["type", "ピンズ"]),
  item(["content", "ちいかわ"], ["character", "うさぎ"], ["type", "アクリルスタンド"], ["type", "ガチャ"]),
  item(["content", "ちいかわ"], ["character", "うさぎ"], ["type", "tシャツ"]),
  { item_tags: [{ tags: null }] },
  {},
];
assert.equal(isChipFilterActive({}), false);
assert.equal(isChipFilterActive({ source: "ガチャ" }), true);
assert.equal(items.filter((i) => matchesChipFilter(i, {})).length, items.length);
assert.equal(items.filter((i) => matchesChipFilter(i, { group: "badge" })).length, 2);
assert.equal(items.filter((i) => matchesChipFilter(i, { group: "badge", leaf: "ピンズ" })).length, 1);
assert.equal(items.filter((i) => matchesChipFilter(i, { character: "うさぎ", group: "badge" })).length, 1);
// type の「ガチャ」は入手方法のガチャとして見る（マイグレーション前でも）
assert.equal(items.filter((i) => matchesChipFilter(i, { source: "ガチャ" })).length, 1);
// 表記ゆれ（tシャツ）は正しい小分類（Tシャツ）で引ける
assert.equal(items.filter((i) => matchesChipFilter(i, { group: "fashion", leaf: "Tシャツ" })).length, 1);

const c = countChipFacets(items, { character: "うさぎ" });
// キャラの件数は、キャラ以外の絞り込みだけをかけて数える
assert.equal(c.characters.get("うさぎ"), 3);
assert.equal(c.characters.get("ハチワレ"), 1);
// カテゴリ・入手方法の件数は、うさぎで絞ったうえで数える
assert.equal(c.groups.get("badge"), 1);
assert.equal(c.groups.get("acrylic"), 1);
assert.equal(c.groups.get("fashion"), 1);
assert.equal(c.sources.get("ガチャ"), 1);
assert.equal(c.sources.get("一番くじ"), 1);
assert.equal(c.leaves.size, 0, "大分類を選ぶまで小分類は数えない");
const c2 = countChipFacets(items, { group: "badge" });
assert.equal(c2.leaves.get("缶バッジ"), 1);
assert.equal(c2.leaves.get("ピンズ"), 1);
assert.equal(c2.leaves.has("アクリルスタンド"), false, "選んだ大分類の外の小分類は数えない");
assert.equal(c2.groups.get("acrylic"), 1, "大分類の件数は、大分類の絞り込みをかけずに数える");

console.log("taxonomy: all tests passed");
