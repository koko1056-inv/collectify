// カタログの図鑑表示（src/utils/zukan.ts）の確認。  npm run test:zukan
import assert from "node:assert/strict";
import {
  completionPercent,
  isComplete,
  summarizeCompletion,
  computeCompletionRows,
  groupBySeries,
  seriesNamesOf,
  NO_SERIES_KEY,
  releaseYear,
  yearBuckets,
  parseYearParam,
  filterByYear,
  filterMissing,
  compareByRelease,
} from "../src/utils/zukan.ts";

const tag = (category, name) => ({ tags: { category, name } });

// ---- 所持率 ----
assert.equal(completionPercent(0, 0), 0);
assert.equal(completionPercent(0, 10), 0);
assert.equal(completionPercent(10, 10), 100);
assert.equal(completionPercent(12, 10), 100); // 数がずれても 100 を超えない
assert.equal(completionPercent(1, 1000), 1); // 持っていれば 0% と出さない
assert.equal(completionPercent(999, 1000), 99); // 足りなければ 100% と出さない
assert.equal(completionPercent(3, 8), 37); // 切り捨て
assert.equal(completionPercent(-1, 8), 0);
assert.equal(isComplete(8, 8), true);
assert.equal(isComplete(7, 8), false);
assert.equal(isComplete(0, 0), false); // 0 件はコンプ扱いしない

// ---- RPC の行をまとめる（文字列の数字も読む・多い順） ----
const summary = summarizeCompletion([
  { kind: "series", label: "A弾", owned: 1, total: 3 },
  { kind: "work", label: "ちいかわ", owned: "5", total: "20" },
  { kind: "series", label: "B弾", owned: 2, total: 8 },
  { kind: "character", label: "ハチワレ", owned: 0, total: 4 },
  { kind: "type", label: "缶バッジ", owned: 1, total: 4 },
  { kind: "type", label: "アクリルスタンド", owned: 2, total: 4 },
  { kind: "bogus", label: "x", owned: 1, total: 1 },
]);
assert.deepEqual(summary.work, { kind: "work", label: "ちいかわ", owned: 5, total: 20 });
assert.deepEqual(summary.series.map((r) => r.label), ["B弾", "A弾"]);
assert.deepEqual(summary.type.map((r) => r.label), ["アクリルスタンド", "缶バッジ"]); // 同数なら持っている数の多い順
assert.equal(summary.character.length, 1);
assert.equal(summarizeCompletion([]).work, null);

// ---- 手元の一覧から数える（RPC が無いときの代わり） ----
const items = [
  { id: "1", release_date: "2024-03-01", created_at: "2024-01-01", item_tags: [tag("series", "A弾"), tag("character", "ちいかわ"), tag("type", "缶バッジ")] },
  { id: "2", release_date: "2024-03-01", created_at: "2024-01-02", item_tags: [tag("series", "A弾"), tag("character", "ハチワレ"), tag("type", "缶バッジ")] },
  { id: "3", release_date: "2023-12-10", created_at: "2023-11-01", item_tags: [tag("series", "B弾"), tag("series", "A弾"), tag("source", "ガチャ")] },
  { id: "4", release_date: "2022-05-05", created_at: "2022-01-01", item_tags: [tag("type", "ぬいぐるみ"), tag("series", "なし")] },
  { id: "5", release_date: null, created_at: "2025-01-01", item_tags: null },
  { id: "1", release_date: "2024-03-01", created_at: "2024-01-01", item_tags: [tag("series", "A弾")] }, // 同じグッズが2回来ても1回
];
const owned = new Set(["1", "3", "zzz"]);
const rows = computeCompletionRows(items, owned, "ちいかわ");
const s2 = summarizeCompletion(rows);
assert.deepEqual(s2.work, { kind: "work", label: "ちいかわ", owned: 2, total: 5 });
assert.deepEqual(s2.series, [
  { kind: "series", label: "A弾", owned: 2, total: 3 },
  { kind: "series", label: "B弾", owned: 1, total: 1 },
]);
assert.deepEqual(s2.type.find((r) => r.label === "缶バッジ"), { kind: "type", label: "缶バッジ", owned: 1, total: 2 });
assert.ok(!rows.some((r) => r.label === "ガチャ")); // 入手方法は内訳に出さない
assert.ok(!rows.some((r) => r.label === "なし")); // 「なし」は未設定扱い
// ゲスト（所持が分からない）: 合計だけ
assert.deepEqual(summarizeCompletion(computeCompletionRows(items, null, "x")).work, { kind: "work", label: "x", owned: 0, total: 5 });

// ---- シリーズでまとめる ----
assert.deepEqual(seriesNamesOf(items[2]), ["B弾", "A弾"]);
assert.deepEqual(seriesNamesOf({ id: "x", item_tags: [tag("series", " A弾 "), tag("series", "a弾")] }), ["A弾"]);
const groups = groupBySeries(items.slice(0, 5), owned);
assert.deepEqual(
  groups.map((g) => [g.label, g.owned, g.total, g.items.map((i) => i.id).join(",")]),
  [
    ["A弾", 2, 3, "1,2,3"], // 最新の発売日 2024-03-01 → 先頭
    ["B弾", 1, 1, "3"],
    ["", 0, 2, "4,5"], // シリーズ無しは最後
  ]
);
assert.equal(groups.at(-1).key, NO_SERIES_KEY);
assert.equal(groups[0].latestRelease, "2024-03-01");
assert.deepEqual(groupBySeries([], owned), []);
// 所持が分からないときは 0 所持
assert.equal(groupBySeries(items.slice(0, 2))[0].owned, 0);

// ---- 発売年 ----
assert.equal(releaseYear("2024-03-15"), 2024);
assert.equal(releaseYear("2024-03-15T00:00:00Z"), 2024);
assert.equal(releaseYear(""), null);
assert.equal(releaseYear(null), null);
assert.equal(releaseYear("令和6年"), null);
assert.deepEqual(yearBuckets(items.slice(0, 5)), [
  { year: 2024, count: 2 },
  { year: 2023, count: 1 },
  { year: 2022, count: 1 },
]);
assert.equal(parseYearParam("2024"), 2024);
assert.equal(parseYearParam("24"), null);
assert.equal(parseYearParam("abcd"), null);
assert.equal(parseYearParam(null), null);
assert.deepEqual(filterByYear(items.slice(0, 5), 2024).map((i) => i.id), ["1", "2"]);
assert.equal(filterByYear(items, null), items);

// ---- 未所持だけ ----
assert.deepEqual(filterMissing(items.slice(0, 5), owned).map((i) => i.id), ["2", "4", "5"]);
assert.equal(filterMissing(items, null), items); // ゲスト・読み込み中は絞らない

// ---- 発売日順 ----
const five = items.slice(0, 5);
const desc = [...five].sort((a, b) => compareByRelease(a, b, "desc")).map((i) => i.id);
const asc = [...five].sort((a, b) => compareByRelease(a, b, "asc")).map((i) => i.id);
assert.deepEqual(desc, ["2", "1", "3", "4", "5"]); // 同じ日は登録の新しい順、発売日無しは最後
assert.deepEqual(asc, ["4", "3", "2", "1", "5"]);

console.log("test-zukan: ok");
