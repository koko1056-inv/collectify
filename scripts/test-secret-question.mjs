// 秘密の質問の答えの正規化（src/utils/secretAnswerNormalize.ts）の確認。  npm run test:secret-question
//
// supabase/migrations/20261020200000_secret_question_reset.sql の secret_answer_normalize()
// と同じアルゴリズムであることが前提。SQL側は DB 無しでは直接テストできないため、
// このテストはクライアント側の実装（アルゴリズムの仕様そのもの）を固定する。
import assert from "node:assert/strict";
import { normalizeSecretAnswer } from "../src/utils/secretAnswerNormalize.ts";

// 全角半角・前後の空白・ひらがなカタカナの違いを無視して同じになる
assert.equal(normalizeSecretAnswer("ミセス"), normalizeSecretAnswer("みせす"));
assert.equal(normalizeSecretAnswer("ミセス"), normalizeSecretAnswer("ﾐｾｽ"));
assert.equal(normalizeSecretAnswer("ミセス"), normalizeSecretAnswer(" ミセス "));
assert.equal(normalizeSecretAnswer("みせす"), "ミセス");

// 英字の大文字小文字・全角半角の違いを無視して同じになる
assert.equal(normalizeSecretAnswer("Mrs."), normalizeSecretAnswer("MRS."));
assert.equal(normalizeSecretAnswer("Mrs."), normalizeSecretAnswer("ｍｒｓ．"));

// 連続する空白は1つにまとまる
assert.equal(normalizeSecretAnswer("green   apple"), "green apple");
assert.equal(normalizeSecretAnswer("ｇｒｅｅｎ　　ａｐｐｌｅ"), "green apple");

// 長音符ー・中点・は変換しない（意味を持ちうるためそのまま残る）
assert.equal(normalizeSecretAnswer("ラーメン"), normalizeSecretAnswer("らーめん"));
assert.equal(normalizeSecretAnswer("ハイ・キュー"), normalizeSecretAnswer("はい・きゅー"));

// 違う答えは違う
assert.notEqual(normalizeSecretAnswer("ポチ"), normalizeSecretAnswer("タマ"));

console.log("secret-question normalize: all tests passed");
