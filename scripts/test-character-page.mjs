// キャラページと「ほしい」ボタン（src/utils/characterPage.ts）の確認。  npm run test:character-page
import assert from "node:assert/strict";
import {
  characterPath,
  contentCatalogPath,
  pickCharacterTagId,
  sameCharacterTagIds,
  characterCompletionRows,
  wishButtonState,
  withWish,
} from "../src/utils/characterPage.ts";

const tag = (id, category, name) => ({ tags: { id, category, name } });

// URL
assert.equal(characterPath("abc-1"), "/character/abc-1");
assert.equal(contentCatalogPath("ちいかわ"), "/search?content=%E3%81%A1%E3%81%84%E3%81%8B%E3%82%8F");
assert.equal(contentCatalogPath("A&B"), "/search?content=A%26B");

// pickCharacterTagId: 同名タグが複数あるときは多く付いている方。名前の前後の空白は無視
{
  const items = [
    { id: "1", item_tags: [tag("t1", "character", "うさぎ"), tag("s", "series", "うさぎ")] },
    { id: "2", item_tags: [tag("t2", "character", "うさぎ"), tag("t2", "character", "うさぎ")] },
    { id: "3", item_tags: [tag("t2", "character", " うさぎ ")] },
    { id: "4", item_tags: [tag("t3", "character", "ハチワレ")] },
    { id: "5", item_tags: null },
  ];
  assert.equal(pickCharacterTagId(items, "うさぎ"), "t2");
  assert.equal(pickCharacterTagId(items, "ハチワレ"), "t3");
  assert.equal(pickCharacterTagId(items, "モモンガ"), null);
  assert.equal(pickCharacterTagId(items, ""), null);
  assert.equal(pickCharacterTagId(items, null), null);
  // 同数なら id の小さい方（毎回同じ）
  const tie = [
    { id: "1", item_tags: [tag("b", "character", "X")] },
    { id: "2", item_tags: [tag("a", "character", "X")] },
  ];
  assert.equal(pickCharacterTagId(tie, "X"), "a");
}

// sameCharacterTagIds: 同じ作品・同じ名前だけ
{
  const base = { id: "a1", name: "うさぎ", category: "character", content_id: "A" };
  const all = [
    base,
    { id: "a2", name: "うさぎ", category: "character", content_id: "A" },
    { id: "b1", name: "うさぎ", category: "character", content_id: "B" },
    { id: "a3", name: "うさぎ", category: "series", content_id: "A" },
    { id: "a4", name: "ハチワレ", category: "character", content_id: "A" },
  ];
  assert.deepEqual(sameCharacterTagIds(base, all).sort(), ["a1", "a2"]);
  assert.deepEqual(sameCharacterTagIds(base, []), ["a1"]);
  const nul = { id: "n1", name: "X", category: "character", content_id: null };
  assert.deepEqual(
    sameCharacterTagIds(nul, [{ id: "n2", name: "X", category: "character" }, { id: "n3", name: "X", category: "character", content_id: "A" }]).sort(),
    ["n1", "n2"]
  );
}

// characterCompletionRows: work（キャラ名）+ series/type。キャラの内訳は出さない
{
  const t = (category, name) => ({ tags: { category, name } });
  const items = [
    { id: "1", item_tags: [t("character", "うさぎ"), t("series", "S1"), t("type", "缶バッジ")] },
    { id: "2", item_tags: [t("character", "うさぎ"), t("series", "S1")] },
    { id: "3", item_tags: [t("character", "うさぎ"), t("character", "ハチワレ")] },
  ];
  const rows = characterCompletionRows(items, new Set(["1", "x"]), "うさぎ");
  const map = Object.fromEntries(rows.map((r) => [`${r.kind}:${r.label}`, [r.owned, r.total]]));
  assert.deepEqual(map, { "work:うさぎ": [1, 3], "series:S1": [1, 2], "type:缶バッジ": [1, 1] });
  // ゲスト（所持なし）
  const guest = characterCompletionRows(items, null, "うさぎ");
  assert.deepEqual(guest.find((r) => r.kind === "work"), { kind: "work", label: "うさぎ", owned: 0, total: 3 });
  assert.deepEqual(characterCompletionRows([], null, "X"), [{ kind: "work", label: "X", owned: 0, total: 0 }]);
}

// wishButtonState
{
  const wished = new Set(["a"]);
  assert.equal(wishButtonState({ isGuest: true, owned: false, wishedIds: null, id: "a" }), "guest");
  assert.equal(wishButtonState({ isGuest: false, owned: true, wishedIds: wished, id: "a" }), "hidden");
  assert.equal(wishButtonState({ isGuest: false, owned: false, wishedIds: wished, id: "a" }), "on");
  assert.equal(wishButtonState({ isGuest: false, owned: false, wishedIds: wished, id: "b" }), "off");
  assert.equal(wishButtonState({ isGuest: false, owned: false, wishedIds: null, id: "b" }), "loading");
}

// withWish: 元の Set は変えない
{
  const before = new Set(["a"]);
  const added = withWish(before, "b", true);
  assert.deepEqual([...added].sort(), ["a", "b"]);
  assert.deepEqual([...before], ["a"]);
  assert.deepEqual([...withWish(added, "a", false)], ["b"]);
  assert.deepEqual([...withWish(null, "z", true)], ["z"]);
  assert.deepEqual([...withWish(undefined, "z", false)], []);
}

console.log("test-character-page: ok");
