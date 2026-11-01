// 運営向け「あなたのこと」集計（src/lib/profileExtrasAggregate.ts）の確認。  npm run test:profile-extras-aggregate
//   - 小さい数の保護（1つ選びのまとめ・二次秘匿）が DB の profile_private_suppress_single と同じ手順か
//   - 戻り値の整え方: 5 未満の数・知らない選択肢・分母が小さいときは画面に出さない
//   - マイグレーションが profile_private の RLS を広げず、管理者だけが実行できる形になっているか（文字列で確認）
//   - 画面の文言が ja / en にあるか
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SMALL_CELL_K,
  AGGREGATE_FIELDS,
  AGGREGATE_OPTIONS,
  suppressSingleChoice,
  toAggregateView,
  formatRate,
} from "../src/lib/profileExtrasAggregate.ts";
import { aboutYou } from "../src/translations/modules/aboutYou.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
};

// ── suppressSingleChoice ──
test("k は 5", () => assert.equal(SMALL_CELL_K, 5));

test("5 以上だけなら、そのまま多い順", () => {
  assert.deepEqual(suppressSingleChoice({ female: 12, male: 7 }), {
    buckets: [{ value: "female", count: 12 }, { value: "male", count: 7 }],
    other: null,
  });
});

test("5 未満が合わせて 5 以上なら、その他にまとめる", () => {
  assert.deepEqual(suppressSingleChoice({ female: 12, male: 3, other: 2, no_answer: 1 }), {
    buckets: [{ value: "female", count: 12 }],
    other: 6,
  });
});

test("まとめが 5 未満なら、出ている中で一番少ないものもまとめへ移す（逆算させない）", () => {
  // male 3 だけ伏せると 20 - 12 - 5 = 3 で逆算できてしまう
  const r = suppressSingleChoice({ female: 12, other: 5, male: 3 });
  assert.deepEqual(r, { buckets: [{ value: "female", count: 12 }], other: 8 });
});

test("二次秘匿は 5 以上になるまで続ける", () => {
  // 1 → +5(=6) で止まる
  assert.deepEqual(suppressSingleChoice({ a: 20, b: 6, c: 5, d: 1 }), {
    buckets: [{ value: "a", count: 20 }, { value: "b", count: 6 }],
    other: 6,
  });
});

test("全部まとめても 5 未満なら、まとめも出さない", () => {
  assert.deepEqual(suppressSingleChoice({ a: 2, b: 1 }), { buckets: [], other: null });
});

test("0 人・不正な数は数えない", () => {
  assert.deepEqual(suppressSingleChoice({ a: 6, b: 0, c: -1, d: 1.5 }), {
    buckets: [{ value: "a", count: 6 }],
    other: null,
  });
});

test("同数は値の文字順（DB の ORDER BY と同じ）", () => {
  assert.deepEqual(suppressSingleChoice({ b: 5, a: 5, c: 1 }).buckets, [{ value: "a", count: 5 }]);
});

test("まとめには 2 つ以上の選択肢が入る（1 つだけだと実数が分かってしまう）", () => {
  const cases = [
    { a: 9, b: 4 },
    { a: 9, b: 4, c: 5 },
    { a: 30, b: 1, c: 1, d: 1, e: 1, f: 1 },
    { a: 5, b: 1 },
  ];
  for (const c of cases) {
    const r = suppressSingleChoice(c);
    const pooled = Object.values(c).filter((n) => n > 0).length - r.buckets.length;
    if (r.other !== null) assert.ok(pooled >= 2, JSON.stringify(c));
    // 見えている数はすべて 5 以上
    for (const b of r.buckets) assert.ok(b.count >= 5);
    // 答えた人 − 見えている合計 が 1〜4 になることはない
    const total = Object.values(c).reduce((s, n) => s + n, 0);
    const rest = total - r.buckets.reduce((s, b) => s + b.count, 0);
    assert.ok(rest === 0 || rest >= 5, JSON.stringify(c));
  }
});

// ── toAggregateView ──
const okField = (over = {}) => ({ answered: 20, suppressed: false, buckets: [], other: null, other_hidden: false, ...over });
const sample = (over = {}) => ({
  k: 5,
  generated_at: "2026-11-01T00:00:00Z",
  suppressed: false,
  target_users: 100,
  respondents: 40,
  any_answered: 30,
  fields: {
    gender: okField({ buckets: [{ value: "male", count: 6 }, { value: "female", count: 9 }], other: 5 }),
    age_range: okField({ answered: null, suppressed: true }),
    prefecture: okField({ buckets: [{ value: "JP-13", count: 5 }, { value: "JP-27", count: 8 }] }),
    oshi_years: okField(),
    monthly_budget: okField(),
    goods_types: okField({ buckets: [{ value: "can_badge", count: 15 }], other_hidden: true }),
    trade_frequency: okField(),
  },
  ...over,
});

test("形が違えば null", () => {
  assert.equal(toAggregateView(null), null);
  assert.equal(toAggregateView([]), null);
  assert.equal(toAggregateView("x"), null);
});

test("回答率は対象ユーザー数で割る・選択肢の割合は答えた人で割る", () => {
  const v = toAggregateView(sample());
  assert.equal(v.suppressed, false);
  assert.equal(v.targetUsers, 100);
  assert.equal(v.respondentRate, 0.4);
  assert.equal(v.anyAnsweredRate, 0.3);
  const g = v.fields.find((f) => f.field === "gender");
  assert.equal(g.answeredRate, 0.2);
  // 選択肢の並び順（female → male）
  assert.deepEqual(g.buckets.map((b) => b.value), ["female", "male"]);
  assert.equal(g.buckets[0].share, 9 / 20);
  assert.deepEqual(g.other, { count: 5, share: 0.25 });
  assert.equal(v.fields.length, AGGREGATE_FIELDS.length);
});

test("都道府県は多い順", () => {
  const p = toAggregateView(sample()).fields.find((f) => f.field === "prefecture");
  assert.deepEqual(p.buckets.map((b) => b.value), ["JP-27", "JP-13"]);
});

test("伏せた項目・まとめも伏せた項目", () => {
  const v = toAggregateView(sample());
  const a = v.fields.find((f) => f.field === "age_range");
  assert.equal(a.suppressed, true);
  assert.equal(a.answered, null);
  assert.deepEqual(a.buckets, []);
  const g = v.fields.find((f) => f.field === "goods_types");
  assert.equal(g.other, null);
  assert.equal(g.otherHidden, true);
});

test("5 未満の数が紛れ込んでも出さない（念のための再確認）", () => {
  const v = toAggregateView(
    sample({
      fields: {
        ...sample().fields,
        gender: okField({ buckets: [{ value: "female", count: 15 }, { value: "male", count: 3 }], other: 2 }),
        oshi_years: okField({ answered: 4 }),
      },
    }),
  );
  const g = v.fields.find((f) => f.field === "gender");
  assert.deepEqual(g.buckets.map((b) => b.value), ["female"]);
  assert.equal(g.other, null);
  assert.equal(g.otherHidden, true);
  assert.equal(v.fields.find((f) => f.field === "oshi_years").suppressed, true);
});

test("知らない選択肢は出さない", () => {
  const v = toAggregateView(
    sample({ fields: { ...sample().fields, gender: okField({ buckets: [{ value: "<script>", count: 50 }] }) } }),
  );
  assert.deepEqual(v.fields.find((f) => f.field === "gender").buckets, []);
});

test("対象ユーザーが 5 未満（または suppressed）なら全部伏せる", () => {
  for (const raw of [sample({ suppressed: true }), sample({ target_users: 4 }), sample({ target_users: null })]) {
    const v = toAggregateView(raw);
    assert.equal(v.suppressed, true);
    assert.equal(v.targetUsers, null);
    assert.equal(v.respondents, null);
    assert.ok(v.fields.every((f) => f.suppressed && f.buckets.length === 0 && f.other === null));
  }
});

test("回答者が 5 未満なら内訳は全部伏せる", () => {
  const v = toAggregateView(sample({ respondents: 3, any_answered: 3 }));
  assert.equal(v.suppressed, false);
  assert.equal(v.respondents, null);
  assert.equal(v.anyAnswered, null);
  assert.ok(v.fields.every((f) => f.suppressed && f.buckets.length === 0));
});

test("k を小さくして返されても 5 より下げない", () => {
  const v = toAggregateView(sample({ k: 1, respondents: 4 }));
  assert.equal(v.k, 5);
  assert.equal(v.respondents, null);
});

test("formatRate", () => {
  assert.equal(formatRate(null), "—");
  assert.equal(formatRate(0.4567), "45.7%");
  assert.equal(formatRate(1), "100.0%");
});

test("選択肢は「あなたのこと」と同じ（都道府県は 47）", () => {
  assert.equal(AGGREGATE_OPTIONS.prefecture.length, 47);
  assert.equal(AGGREGATE_OPTIONS.goods_types.length, 8);
});

// ── マイグレーション（文字列での確認。実行は DB 側で） ──
const migDir = resolve(root, "supabase/migrations");
const migName = readdirSync(migDir).find((f) => f.endsWith("_profile_private_aggregate.sql"));
assert.ok(migName, "profile_private_aggregate のマイグレーションが無い");
const sql = readFileSync(resolve(migDir, migName), "utf8");
const code = sql.replace(/--.*$/gm, "");

test("集計関数は SECURITY DEFINER + search_path 固定 + 中で管理者チェック", () => {
  const fn = code.slice(code.indexOf("FUNCTION public.profile_private_aggregate()"));
  assert.match(fn, /SECURITY DEFINER/);
  assert.match(fn, /SET search_path = public, pg_temp/);
  assert.match(fn, /IF _uid IS NULL OR NOT public\.has_role\(_uid, 'admin'::public\.app_role\) THEN\s+RAISE EXCEPTION 'forbidden'/);
  assert.match(fn, /_k constant integer := 5;/);
});

test("実行権限: PUBLIC / anon から外し、authenticated だけ", () => {
  assert.match(code, /REVOKE ALL ON FUNCTION public\.profile_private_aggregate\(\) FROM PUBLIC, anon;/);
  assert.match(code, /GRANT EXECUTE ON FUNCTION public\.profile_private_aggregate\(\) TO authenticated;/);
  assert.match(code, /REVOKE ALL ON FUNCTION public\.profile_private_suppress_single\(jsonb, integer\) FROM PUBLIC, anon, authenticated;/);
  assert.doesNotMatch(code, /GRANT[^;]*profile_private_suppress_single/);
});

test("profile_private の RLS・権限には触らない", () => {
  assert.doesNotMatch(code, /POLICY/i);
  assert.doesNotMatch(code, /ALTER TABLE/i);
  assert.doesNotMatch(code, /(GRANT|REVOKE)[^;]*ON (TABLE )?public\.profile_private\b/i);
});

test("サンプルアカウントは分母・分子とも除く", () => {
  assert.match(code, /SELECT count\(\*\) INTO _targets FROM public\.profiles p WHERE NOT p\.is_sample;/);
  assert.match(code, /JOIN public\.profiles p ON p\.id = pp\.user_id WHERE NOT p\.is_sample/);
});

// ── 文言 ──
test("画面の文言が ja / en にある", () => {
  for (const lang of ["ja", "en"]) {
    const a = aboutYou[lang].admin;
    for (const key of ["tab", "title", "desc", "refresh", "loadFailed", "forbidden", "generatedAt", "allSuppressed",
      "targetUsers", "respondents", "anyAnswered", "answered", "fieldSuppressed", "lessThanK", "other", "otherHidden",
      "multiNote", "people"]) {
      assert.equal(typeof a[key], "string", `${lang}.admin.${key}`);
    }
    for (const f of AGGREGATE_FIELDS) assert.equal(typeof a.fields[f], "string", `${lang}.admin.fields.${f}`);
  }
});

console.log(`profile-extras-aggregate: ${passed} passed`);
