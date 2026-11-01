// 「あなたのこと」（src/lib/profileExtras.ts）の確認。  npm run test:profile-extras
//   - 選択肢がマイグレーションの CHECK と食い違っていないか（食い違うと保存ごと失敗する）
//   - 選択肢ごとの文言が ja / en にあるか
//   - 整え方・チップの押し方・すでに使っている人への案内の出し方
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GENDERS,
  AGE_RANGES,
  OSHI_YEARS,
  MONTHLY_BUDGETS,
  GOODS_TYPES,
  TRADE_FREQUENCIES,
  PREFECTURES,
  EMPTY_PROFILE_EXTRAS,
  sanitizeProfileExtras,
  hasAnyAnswer,
  answeredCount,
  toggleSingle,
  toggleMulti,
  shouldNudgeProfileExtras,
} from "../src/lib/profileExtras.ts";
import { aboutYou } from "../src/translations/modules/aboutYou.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ── マイグレーションの CHECK と揃っているか ──
const migName = readdirSync(resolve(root, "supabase/migrations")).find((f) => f.endsWith("_profile_private.sql"));
assert.ok(migName, "profile_private のマイグレーションが無い");
const sql = readFileSync(resolve(root, "supabase/migrations", migName), "utf8");

function checkValues(column) {
  const m = sql.match(new RegExp(`CHECK \\(${column} IN \\(([^)]*)\\)\\)`));
  assert.ok(m, `${column} の CHECK が見つからない`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
assert.deepEqual(checkValues("gender"), [...GENDERS]);
assert.deepEqual(checkValues("age_range"), [...AGE_RANGES]);
assert.deepEqual(checkValues("oshi_years"), [...OSHI_YEARS]);
assert.deepEqual(checkValues("monthly_budget"), [...MONTHLY_BUDGETS]);
assert.deepEqual(checkValues("trade_frequency"), [...TRADE_FREQUENCIES]);
const goodsArr = sql.match(/goods_types <@ ARRAY\[([^\]]*)\]/);
assert.ok(goodsArr, "goods_types の CHECK が見つからない");
assert.deepEqual([...goodsArr[1].matchAll(/'([^']+)'/g)].map((x) => x[1]), [...GOODS_TYPES]);
assert.ok(sql.includes(`cardinality(goods_types) <= ${GOODS_TYPES.length}`));

// 都道府県: 47、番号順、DB の正規表現に全部合う
assert.equal(PREFECTURES.length, 47);
assert.equal(PREFECTURES[0].code, "JP-01");
assert.equal(PREFECTURES[0].ja, "北海道");
assert.equal(PREFECTURES[12].ja, "東京都");
assert.equal(PREFECTURES[46].code, "JP-47");
assert.equal(PREFECTURES[46].ja, "沖縄県");
assert.equal(new Set(PREFECTURES.map((p) => p.code)).size, 47);
const prefRe = sql.match(/prefecture ~ '([^']+)'/);
assert.ok(prefRe, "prefecture の CHECK が見つからない");
const re = new RegExp(prefRe[1]);
for (const p of PREFECTURES) assert.ok(re.test(p.code), `${p.code} が DB の CHECK に合わない`);
for (const bad of ["JP-00", "JP-48", "JP-1", "tokyo"]) assert.ok(!re.test(bad), `${bad} が DB の CHECK を通ってしまう`);

// 本人だけ: RLS と、anon に何も渡していないこと、公開プロフィールに足していないこと
assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
for (const op of ["SELECT", "INSERT", "UPDATE"]) {
  assert.match(sql, new RegExp(`FOR ${op} TO authenticated[^;]*auth\\.uid\\(\\) = user_id`), `${op} のポリシーが本人限定になっていない`);
}
assert.match(sql, /REVOKE ALL ON public\.profile_private FROM anon/);
assert.ok(!/ALTER TABLE public\.profiles/i.test(sql), "profiles（公開）に列を足してはいけない");
assert.ok(!/NOT NULL\s+DEFAULT\s+'/i.test(sql), "答えの列に既定値を強制しない");
// 年代は利用規約（13歳未満は不可）に合わせる
assert.ok(!AGE_RANGES.some((a) => /under|12/.test(a)));

// ── 文言 ──
for (const lang of ["ja", "en"]) {
  const d = aboutYou[lang];
  for (const g of GENDERS) assert.ok(d.gender[g], `${lang}: aboutYou.gender.${g}`);
  for (const a of AGE_RANGES) assert.ok(d.age[a], `${lang}: aboutYou.age.${a}`);
  for (const y of OSHI_YEARS) assert.ok(d.oshiYears[y], `${lang}: aboutYou.oshiYears.${y}`);
  for (const b of MONTHLY_BUDGETS) assert.ok(d.budget[b], `${lang}: aboutYou.budget.${b}`);
  for (const g of GOODS_TYPES) assert.ok(d.goodsTypes[g], `${lang}: aboutYou.goodsTypes.${g}`);
  for (const f of TRADE_FREQUENCIES) assert.ok(d.trade[f], `${lang}: aboutYou.trade.${f}`);
}
function keys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}
assert.deepEqual(keys(aboutYou.ja).sort(), keys(aboutYou.en).sort(), "aboutYou の ja と en のキーが揃っていない");

// ── 整え方 ──
assert.deepEqual(sanitizeProfileExtras(null), EMPTY_PROFILE_EXTRAS);
assert.deepEqual(sanitizeProfileExtras({}), EMPTY_PROFILE_EXTRAS);
assert.deepEqual(
  sanitizeProfileExtras({
    gender: "female",
    age_range: "under_13",
    prefecture: "JP-13",
    oshi_years: "1_3y",
    monthly_budget: "lots",
    goods_types: ["trading_card", "can_badge", "nope", "can_badge"],
    trade_frequency: "often",
  }),
  {
    gender: "female",
    age_range: null,
    prefecture: "JP-13",
    oshi_years: "1_3y",
    monthly_budget: null,
    goods_types: ["can_badge", "trading_card"],
    trade_frequency: "often",
  }
);
assert.equal(sanitizeProfileExtras({ prefecture: "JP-48" }).prefecture, null);
assert.deepEqual(sanitizeProfileExtras({ goods_types: null }).goods_types, []);

assert.equal(hasAnyAnswer(EMPTY_PROFILE_EXTRAS), false);
assert.equal(answeredCount(EMPTY_PROFILE_EXTRAS), 0);
assert.equal(hasAnyAnswer({ ...EMPTY_PROFILE_EXTRAS, prefecture: "JP-01" }), true);
assert.equal(answeredCount({ ...EMPTY_PROFILE_EXTRAS, gender: "no_answer", goods_types: ["plush"], trade_frequency: "never" }), 3);

// ── チップ ──
assert.equal(toggleSingle(null, "male"), "male");
assert.equal(toggleSingle("male", "male"), null, "もう一度押したら外れる");
assert.equal(toggleSingle("male", "female"), "female");
assert.deepEqual(toggleMulti([], "plush"), ["plush"]);
assert.deepEqual(toggleMulti(["plush"], "can_badge"), ["can_badge", "plush"], "並びは選択肢の順");
assert.deepEqual(toggleMulti(["can_badge", "plush"], "can_badge"), ["plush"]);

// ── すでに使っている人への案内（1回きり） ──
const ok = { signedIn: true, welcomeDone: true, isSample: false, row: "missing", dismissedLocally: false };
assert.equal(shouldNudgeProfileExtras(ok), true);
assert.equal(shouldNudgeProfileExtras({ ...ok, row: "exists" }), false, "もう聞いた（答えた・閉じた・ウェルカムで聞いた）");
assert.equal(shouldNudgeProfileExtras({ ...ok, row: "unknown" }), false, "読めないとき（テーブルがまだ無い等）は出さない");
assert.equal(shouldNudgeProfileExtras({ ...ok, isSample: true }), false, "サンプルアカウントには出さない");
assert.equal(shouldNudgeProfileExtras({ ...ok, isSample: null }), false);
assert.equal(shouldNudgeProfileExtras({ ...ok, welcomeDone: false }), false, "ウェルカムの中ではそちらで聞く");
assert.equal(shouldNudgeProfileExtras({ ...ok, dismissedLocally: true }), false, "この端末で閉じた");
assert.equal(shouldNudgeProfileExtras({ ...ok, signedIn: false }), false);

console.log("test-profile-extras: ok");
