// 絞り込みのタグの数のきまり（src/utils/tag/catalog-tag-counts.ts）の確認。  npm run test:catalog-tag-counts
import assert from "node:assert/strict";
import {
  rowsToCountedTags,
  countTagIds,
  attachTagInfo,
  mergeAlwaysShown,
  remainingPageOffsets,
  chunk,
  isMissingRpcError,
  sortTagsByCount,
  ID_CHUNK,
} from "../src/utils/tag/catalog-tag-counts.ts";

// RPC の行: bigint が文字列で来ても数になる
const rows = rowsToCountedTags([
  { id: "a", name: "うさぎ", category: "character", content_id: "c1", created_at: "x", item_count: "12" },
  { id: "b", name: "缶バッジ", category: "type", content_id: null, created_at: "x", item_count: 3 },
]);
assert.deepEqual(rows.map((r) => [r.id, r.count]), [["a", 12], ["b", 3]]);

// tag_id を数え、中身を付ける。中身の無い（消された）タグは出さない
const counts = countTagIds(["a", "b", "a", "z", "a"]);
assert.equal(counts.get("a"), 3);
assert.equal(counts.get("z"), 1);
const attached = attachTagInfo(counts, [
  { id: "a", name: "ちいかわ", category: "character" },
  { id: "b", name: "ハチワレ", category: "character", content_id: "c1" },
]);
assert.deepEqual(attached.map((t) => [t.name, t.count]).sort(), [["ちいかわ", 3], ["ハチワレ", 1]]);

// グッズタイプ・入手方法は 0件でも足す。すでにあるものは重ねない。多い順・同数は名前順
const merged = mergeAlwaysShown(
  [{ id: "a", name: "ちいかわ", category: "character", content_id: null, count: 3 }],
  [
    { id: "a", name: "ちいかわ", category: "character" },
    { id: "t2", name: "ぬいぐるみ", category: "type" },
    { id: "t1", name: "アクスタ", category: "type" },
  ],
);
assert.deepEqual(merged.map((t) => [t.id, t.count]), [["a", 3], ["t1", 0], ["t2", 0]]);
assert.deepEqual(sortTagsByCount([{ name: "b", count: 1 }, { name: "a", count: 1 }, { name: "c", count: 5 }]).map((t) => t.name), ["c", "a", "b"]);

// ページ分け: ちいかわのグッズ（10,816 件）は 1000 件ずつ 11 回
const offsets = remainingPageOffsets(10816);
assert.equal(offsets.length + 1, 11);
assert.equal(offsets[0], 1000);
assert.equal(offsets.at(-1), 10000);
assert.deepEqual(remainingPageOffsets(1000), []);
assert.deepEqual(remainingPageOffsets(0), []);

// タグの id を並べる URL が長くなりすぎない（uuid 36字 + 区切り）
const ids = Array.from({ length: 401 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
const parts = chunk(ids, ID_CHUNK);
assert.equal(parts.length, 3);
assert.equal(parts.flat().length, 401);
for (const p of parts) assert.ok(p.join(",").length < 8000, "1回の id の並びは 8KB 未満");

// RPC がまだ無い（マイグレーション前）ときだけ予備に切り替える
assert.equal(isMissingRpcError({ code: "PGRST202", message: "Could not find the function public.catalog_tag_counts" }), true);
assert.equal(isMissingRpcError({ code: "42883", message: "function does not exist" }), true);
assert.equal(isMissingRpcError({ status: 404 }), true);
assert.equal(isMissingRpcError({ code: "57014", message: "canceling statement due to statement timeout" }), false);
assert.equal(isMissingRpcError({ code: "42501", message: "permission denied" }), false);
assert.equal(isMissingRpcError(null), false);
assert.equal(isMissingRpcError(new TypeError("Failed to fetch")), false);

console.log("catalog-tag-counts: ok");
