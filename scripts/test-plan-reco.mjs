// サブスクのおすすめの「いつ・どれくらいの間隔で」（src/lib/planReco.ts）の確認。  npm run test:plan-reco
import assert from "node:assert/strict";
import {
  DAY_MS,
  MIN_GAP_DAYS,
  SNOOZE_DAYS,
  LOW_BALANCE_THRESHOLD,
  COLLECTION_MILESTONES,
  INITIAL_PLAN_RECO_STATE,
  isPlanRecoAudience,
  canShowInlinePlanHint,
  decidePlanReco,
  markShown,
  markSnoozed,
  markOptedOut,
  parsePlanRecoState,
  crossedLowBalance,
  crossedMilestone,
  jstDay,
  recordActiveDay,
  isActiveEnough,
  suggestedPlan,
} from "../src/lib/planReco.ts";
import { planReco } from "../src/translations/modules/planReco.ts";
import { PLAN_PERKS, PLAN_PRICES_JPY } from "../src/lib/planLimits.ts";

const NOW = Date.UTC(2026, 10, 1, 3, 0, 0); // 2026-11-01 12:00 JST
const free = { signedIn: true, subscriptionKnown: true, isSubscriber: false, isSample: false, canPurchase: true };
const base = { audience: free, welcomeDone: true, state: INITIAL_PLAN_RECO_STATE, trigger: "milestone", now: NOW };
const decide = (over) => decidePlanReco({ ...base, ...over });

// ── 決まりの数（ここを変えるときは、報告・コメントも揃える） ──
assert.equal(MIN_GAP_DAYS, 3);
assert.equal(SNOOZE_DAYS, 7);
assert.equal(LOW_BALANCE_THRESHOLD, 30);
assert.deepEqual([...COLLECTION_MILESTONES], [30, 100, 300]);

// ── 出してよい人 ──
assert.equal(isPlanRecoAudience(free), true);
assert.equal(isPlanRecoAudience({ ...free, isSubscriber: true }), false, "契約中には出さない");
assert.equal(isPlanRecoAudience({ ...free, isSample: true }), false, "サンプルアカウントには出さない");
assert.equal(isPlanRecoAudience({ ...free, isSample: null }), false, "サンプルか分からないあいだは出さない");
assert.equal(isPlanRecoAudience({ ...free, subscriptionKnown: false }), false, "プランが読めていないあいだは出さない");
assert.equal(isPlanRecoAudience({ ...free, canPurchase: false }), false, "アプリ内（買えない）では出さない");
assert.equal(isPlanRecoAudience({ ...free, signedIn: false }), false);
// ポイント不足のダイアログの中の案内も、同じ人には出さない
assert.equal(canShowInlinePlanHint({ ...free, isSubscriber: true }), false);
assert.equal(canShowInlinePlanHint({ ...free, isSample: true }), false);
assert.equal(canShowInlinePlanHint(free), true);

// ── 契約中・サンプルには、どのきっかけでも出ない ──
for (const trigger of ["lowBalance", "insufficient", "milestone", "activeDays"]) {
  assert.deepEqual(decide({ trigger, audience: { ...free, isSubscriber: true } }), { show: false, reason: "audience" });
  assert.deepEqual(decide({ trigger, audience: { ...free, isSample: true } }), { show: false, reason: "audience" });
  assert.deepEqual(decide({ trigger }), { show: true });
}

// ── ウェルカムの前は出さない ──
assert.deepEqual(decide({ welcomeDone: false }), { show: false, reason: "welcome" });

// ── 出したら3日あける（きっかけが違っても） ──
let s = markShown(INITIAL_PLAN_RECO_STATE, "milestone", NOW);
assert.equal(s.lastShownAt, NOW);
assert.deepEqual(decide({ state: s, trigger: "lowBalance", now: NOW + 1 * DAY_MS }), { show: false, reason: "tooSoon" });
assert.deepEqual(decide({ state: s, trigger: "insufficient", now: NOW + 3 * DAY_MS - 1 }), { show: false, reason: "tooSoon" });
assert.deepEqual(decide({ state: s, trigger: "insufficient", now: NOW + 3 * DAY_MS }), { show: true });

// ── 「あとで」・閉じた → 7日休む（3日より長いほうが効く） ──
s = markSnoozed(markShown(INITIAL_PLAN_RECO_STATE, "lowBalance", NOW), NOW);
assert.equal(s.snoozeUntil, NOW + 7 * DAY_MS);
assert.deepEqual(decide({ state: s, now: NOW + 4 * DAY_MS }), { show: false, reason: "snoozed" });
assert.deepEqual(decide({ state: s, now: NOW + 7 * DAY_MS - 1 }), { show: false, reason: "snoozed" });
assert.deepEqual(decide({ state: s, now: NOW + 7 * DAY_MS }), { show: true });
// 休みを短くはしない
assert.equal(markSnoozed({ ...s }, NOW - DAY_MS).snoozeUntil, NOW + 7 * DAY_MS);

// ── 「もう表示しない」はずっと ──
s = markOptedOut(INITIAL_PLAN_RECO_STATE);
assert.deepEqual(decide({ state: s, now: NOW + 365 * DAY_MS }), { show: false, reason: "optedOut" });
for (const trigger of ["lowBalance", "insufficient", "milestone", "activeDays"]) {
  assert.equal(decide({ state: s, trigger }).show, false);
}

// ── 「たくさん使ってくれて」は1回きり ──
s = markShown(INITIAL_PLAN_RECO_STATE, "activeDays", NOW);
assert.equal(s.activeDaysShownAt, NOW);
assert.deepEqual(decide({ state: s, trigger: "activeDays", now: NOW + 30 * DAY_MS }), { show: false, reason: "alreadyShown" });
assert.deepEqual(decide({ state: s, trigger: "milestone", now: NOW + 30 * DAY_MS }), { show: true });

// ── ウェルカムの「プランもあるよ」を見せた直後（shown + snooze）は、アプリの中では7日出ない ──
s = markSnoozed(markShown(INITIAL_PLAN_RECO_STATE, "onboarding", NOW), NOW);
assert.equal(decide({ state: s, trigger: "lowBalance", now: NOW + 6 * DAY_MS }).show, false);
assert.equal(decide({ state: s, trigger: "lowBalance", now: NOW + 7 * DAY_MS }).show, true);

// ── 保存した値の読み直し（壊れていても既定値） ──
assert.deepEqual(parsePlanRecoState(null), INITIAL_PLAN_RECO_STATE);
assert.deepEqual(parsePlanRecoState("{oops"), INITIAL_PLAN_RECO_STATE);
assert.deepEqual(parsePlanRecoState("null"), INITIAL_PLAN_RECO_STATE);
assert.deepEqual(parsePlanRecoState('{"lastShownAt":"x","snoozeUntil":-5,"optedOut":"yes"}'), INITIAL_PLAN_RECO_STATE);
const round = { lastShownAt: NOW, snoozeUntil: NOW + DAY_MS, optedOut: true, activeDaysShownAt: NOW };
assert.deepEqual(parsePlanRecoState(JSON.stringify(round)), round);

// ── 残高が少なくなった瞬間だけ ──
assert.equal(crossedLowBalance(50, 20), true, "使って30を下回った");
assert.equal(crossedLowBalance(30, 29), true);
assert.equal(crossedLowBalance(29, 10), false, "はじめから少ない人には毎回言わない");
assert.equal(crossedLowBalance(null, 10), false, "読み込んだばかりでは言わない");
assert.equal(crossedLowBalance(10, 40), false, "増えたときは言わない");
assert.equal(crossedLowBalance(100, 30), false, "ちょうど30はまだ少なくない");

// ── コレクションの節目 ──
assert.deepEqual(crossedMilestone(null, 120), { milestone: null, seenMax: 100 }, "この端末で初めて数えたときは言わない");
assert.deepEqual(crossedMilestone(null, 5), { milestone: null, seenMax: 0 });
assert.deepEqual(crossedMilestone(0, 29), { milestone: null, seenMax: 0 });
assert.deepEqual(crossedMilestone(0, 30), { milestone: 30, seenMax: 30 });
assert.deepEqual(crossedMilestone(30, 31), { milestone: null, seenMax: 30 });
assert.deepEqual(crossedMilestone(30, 25), { milestone: null, seenMax: 30 }, "減っても下げない");
assert.deepEqual(crossedMilestone(30, 30), { milestone: null, seenMax: 30 }, "消して入れ直しても二度は言わない");
assert.deepEqual(crossedMilestone(0, 150), { milestone: 100, seenMax: 100 }, "まとめてまたいだら大きいほうだけ");
assert.deepEqual(crossedMilestone(100, 300), { milestone: 300, seenMax: 300 });
// バッジ（collector: 1 / 10 / 50 / 200）のお祝いと重ならない
for (const m of COLLECTION_MILESTONES) assert.ok(![1, 10, 50, 200].includes(m), `節目 ${m} がバッジの段と重なる`);

// ── 使った日 ──
assert.equal(jstDay(Date.UTC(2026, 9, 31, 15, 0, 0)), "2026-11-01", "日本時間で数える（UTC 15時 = 翌日 0時）");
let days = recordActiveDay([], NOW);
assert.deepEqual(days, ["2026-11-01"]);
days = recordActiveDay(days, NOW + 1000);
assert.deepEqual(days, ["2026-11-01"], "同じ日は重ねない");
days = recordActiveDay(["2026-10-30", "bad", "2026-10-31"], NOW);
assert.deepEqual(days, ["2026-11-01", "2026-10-31", "2026-10-30"], "知らない値は捨てて新しい順");
const many = Array.from({ length: 80 }, (_, i) => jstDay(NOW - (i + 1) * DAY_MS));
assert.equal(recordActiveDay(many, NOW).length, 60, "60日分まで");

const five = ["2026-11-01", "2026-10-30", "2026-10-28", "2026-10-27", "2026-10-25"];
assert.equal(isActiveEnough(NOW - 7 * DAY_MS, five, NOW), true, "7日たって5日使った");
assert.equal(isActiveEnough(NOW - 6 * DAY_MS, five, NOW), false, "まだ7日たっていない");
assert.equal(isActiveEnough(NOW - 30 * DAY_MS, five.slice(0, 4), NOW), false, "使った日が足りない");
assert.equal(isActiveEnough(null, five, NOW), false);
assert.equal(isActiveEnough(NOW + DAY_MS, five, NOW), false, "未来の作成日は無視");

// ── はじめに選んでおくプラン ──
assert.equal(suggestedPlan("30k_plus"), "premium_plus");
assert.equal(suggestedPlan("10k_30k"), "premium_plus");
assert.equal(suggestedPlan("3k_10k"), "premium");
assert.equal(suggestedPlan("secret"), "premium");
assert.equal(suggestedPlan(null), "premium");
assert.equal(suggestedPlan(undefined), "premium");

// ── 文言: ja / en が同じ形で、数を直書きしていない（特典の正は PLAN_PERKS / PLAN_PRICES_JPY） ──
function keys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}
assert.deepEqual(keys(planReco.ja).sort(), keys(planReco.en).sort(), "planReco の ja と en のキーが揃っていない");
const literalNumbers = [
  PLAN_PERKS.premium.monthlyPoints,
  PLAN_PERKS.premium_plus.monthlyPoints,
  PLAN_PRICES_JPY.premium.monthly,
  PLAN_PRICES_JPY.premium_plus.monthly,
].flatMap((n) => [String(n), n.toLocaleString("en-US")]);
for (const lang of ["ja", "en"]) {
  const text = JSON.stringify(planReco[lang]);
  for (const n of literalNumbers) assert.ok(!text.includes(n), `planReco.${lang} に ${n} が直書きされている`);
}

console.log("test-plan-reco: ok");
