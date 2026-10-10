// あいまい一致（src/utils/fuzzy.ts）の確認。  npm run test:fuzzy
import assert from "node:assert/strict";
import { fuzzyRank, fuzzyScore, normalizeForSearch } from "../src/utils/fuzzy.ts";

// 表記ゆれ: 全角/半角・大文字小文字・カタカナ/ひらがな・記号・空白
assert.equal(normalizeForSearch("ＭＲＳ. Green Apple"), "mrsgreenapple");
assert.equal(normalizeForSearch("ミセス・グリーン"), normalizeForSearch("みせす グリーン"));
assert.equal(normalizeForSearch("ﾁｲｶﾜ"), "ちいかわ");

// 完全一致 1 / 前方一致 / 含む / 打ち間違い
assert.equal(fuzzyScore("ヒロアカ", "ひろあか"), 1);
assert.ok(fuzzyScore("ミセス", "ミセスグリーンアップル") >= 0.9);
assert.ok(fuzzyScore("グリーン", "ミセスグリーンアップル") >= 0.75);
assert.ok(fuzzyScore("ブルーロッグ", "ブルーロック") >= 0.6);
assert.ok(fuzzyScore("ミセスグリンアップル", "ミセスグリーンアップル") >= 0.6);
assert.ok(fuzzyScore("chiikaw", "Chiikawa") >= 0.7);

// 関係ないものは低い
assert.ok(fuzzyScore("zzqq", "ハイキュー") < 0.3);
assert.equal(fuzzyScore("", "ハイキュー"), 0);
assert.equal(fuzzyScore("あ", "ハイキュー"), 0);

// 並べ替え: 近い順、足切り、件数
const names = ["ブルーロック", "ブルーロック×サンリオ", "ハイキュー!!", "呪術廻戦"];
const ranked = fuzzyRank("ブルーロッグ", names, (n) => [n], { min: 0.45, limit: 2 });
assert.equal(ranked.length, 2);
assert.equal(ranked[0].item, "ブルーロック");
assert.deepEqual(fuzzyRank("zzzz", names, (n) => [n]), []);

console.log("fuzzy: all tests passed");
