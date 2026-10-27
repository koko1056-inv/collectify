// カタログへの申請（src/utils/catalogItemRequests.ts）の確認。  npm run test:catalog-item-requests
import assert from "node:assert/strict";
import {
  normalizeProposedChange,
  buildRequestDiff,
  collectTagIds,
  currentValuesFromItem,
  isValidDate,
  isValidImageUrl,
  requestErrorKey,
} from "../src/utils/catalogItemRequests.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const T1 = "33333333-3333-4333-8333-333333333333";
const T2 = "44444444-4444-4444-8444-444444444444";

const current = {
  title: "アクリルスタンド ちいかわ",
  content_name: "ちいかわ",
  character_tag_ids: [A],
  type_tag_id: T1,
  release_date: "2026-10-01",
  price: "1650",
  image: "https://example.com/a.jpg",
};

// 日付・URL
assert.equal(isValidDate("2026-02-28"), true);
assert.equal(isValidDate("2026-02-30"), false);
assert.equal(isValidDate("2026/02/01"), false);
assert.equal(isValidImageUrl("https://example.com/x.png"), true);
assert.equal(isValidImageUrl("javascript:alert(1)"), false);
assert.equal(isValidImageUrl("https://exa mple.com"), false);

// 何も変えていなければ empty
{
  const { changes, errors } = normalizeProposedChange(current, {
    title: "  アクリルスタンド ちいかわ ",
    content_name: "ちいかわ",
    character_tag_ids: [A],
    type_tag_id: T1,
    release_date: "2026-10-01",
    price: "1650",
    image: "https://example.com/a.jpg",
  });
  assert.deepEqual(changes, {});
  assert.deepEqual(errors, ["empty"]);
}

// 空欄は「変えない」
{
  const { changes, errors } = normalizeProposedChange(current, { title: "", price: "  ", image: "", release_date: "" });
  assert.deepEqual(changes, {});
  assert.deepEqual(errors, ["empty"]);
}

// 変えた項目だけが入る（前後の空白は外す）
{
  const { changes, errors } = normalizeProposedChange(current, {
    title: " アクリルスタンド ハチワレ ",
    price: "1,980円",
    type_tag_id: T2,
    character_tag_ids: [B, B],
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(changes, {
    title: "アクリルスタンド ハチワレ",
    price: "1,980円",
    type_tag_id: T2,
    character_tag_ids: [B],
  });
}

// キャラは並び順を問わず、同じ組み合わせなら入れない。空にするのは「外す」申請
{
  const cur = { ...current, character_tag_ids: [A, B] };
  assert.deepEqual(normalizeProposedChange(cur, { character_tag_ids: [B, A] }).errors, ["empty"]);
  assert.deepEqual(normalizeProposedChange(cur, { character_tag_ids: [] }).changes, { character_tag_ids: [] });
}

// まちがった値は errors に出る
{
  const { errors } = normalizeProposedChange(current, {
    release_date: "2026-13-01",
    image: "ftp://example.com/a.png",
    title: "あ".repeat(201),
    character_tag_ids: ["not-a-uuid"],
  });
  assert.deepEqual(errors.sort(), ["character_tag_ids", "image", "release_date", "title"]);
}

// 作品が未設定のグッズに作品を入れる
{
  const { changes } = normalizeProposedChange({ ...current, content_name: null }, { content_name: "ちいかわ" });
  assert.deepEqual(changes, { content_name: "ちいかわ" });
}

// 差分: 申請に含まれる項目だけ、画面の順に。タグは名前に直す
{
  const names = { [A]: "ちいかわ", [B]: "ハチワレ", [T1]: "アクリルスタンド", [T2]: "缶バッジ" };
  const rows = buildRequestDiff(
    current,
    { image: "https://example.com/b.jpg", type_tag_id: T2, character_tag_ids: [B, A], title: "新しい名前" },
    names
  );
  assert.deepEqual(
    rows.map((r) => r.field),
    ["title", "character_tag_ids", "type_tag_id", "image"]
  );
  assert.deepEqual(rows[1], { field: "character_tag_ids", before: "ちいかわ", after: "ちいかわ、ハチワレ" });
  assert.deepEqual(rows[2], { field: "type_tag_id", before: "アクリルスタンド", after: "缶バッジ" });
  assert.equal(buildRequestDiff(current, null).length, 0);
  // 名前が分からないタグは id のまま
  assert.equal(buildRequestDiff(current, { type_tag_id: T2 })[0].after, T2);
}

// タグ id の収集
assert.deepEqual(collectTagIds(current, { character_tag_ids: [B], type_tag_id: T2 }).sort(), [A, B, T1, T2].sort());

// item_tags の形から比べる元を作る
{
  const v = currentValuesFromItem({
    title: "x",
    content_name: "ちいかわ",
    release_date: "2026-01-01",
    price: "",
    image: null,
    item_tags: [
      { tags: { id: A, category: "character" } },
      { tags: { id: T1, category: "type" } },
      { tags: { id: B, category: "series" } },
      { tags: null },
    ],
  });
  assert.deepEqual(v.character_tag_ids, [A]);
  assert.equal(v.type_tag_id, T1);
}

// DB のエラー文字列 → 文言キー
assert.equal(requestErrorKey({ message: "catalog_item_request_rate_limited" }), "rateLimited");
assert.equal(requestErrorKey({ message: "catalog_item_request_duplicate" }), "duplicatePending");
assert.equal(requestErrorKey({ message: "catalog_item_request_merge_failed", details: "forbidden" }), "mergeForbidden");
assert.equal(requestErrorKey({ message: "catalog_item_request_invalid", details: "image" }), "invalid");
assert.equal(requestErrorKey(new Error("network")), "failed");

console.log("catalog item requests: ok");
