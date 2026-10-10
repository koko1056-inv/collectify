// 相棒の成長とフォトの連続日数の計算（src/utils/companion.ts）の確認。  npm run test:companion
import assert from "node:assert/strict";
import { levelFromXp, levelProgress, streakFromDates, MAX_LEVEL } from "../src/utils/companion.ts";

// レベル: DB の companion_level と同じ段階（0,3,8,15,25,40,60,85,115,150）
assert.equal(levelFromXp(0), 1);
assert.equal(levelFromXp(2), 1);
assert.equal(levelFromXp(3), 2);
assert.equal(levelFromXp(24), 4);
assert.equal(levelFromXp(25), 5);
assert.equal(levelFromXp(149), 9);
assert.equal(levelFromXp(150), MAX_LEVEL);
assert.equal(levelFromXp(9999), MAX_LEVEL);
assert.equal(levelFromXp(-5), 1);

const p = levelProgress(5); // Lv2（3〜8）
assert.equal(p.level, 2);
assert.equal(p.into, 2);
assert.equal(p.needed, 5);
assert.ok(Math.abs(p.ratio - 0.4) < 1e-9);
assert.equal(levelProgress(200).isMax, true);

// 連続日数（日本時間）
const now = Date.parse("2026-10-10T03:00:00Z"); // JST 12:00 の 10/10
assert.deepEqual(streakFromDates(["2026-10-10", "2026-10-09", "2026-10-08"], now), { streak: 3, today: true });
// 今日まだでも、昨日までの連続は続いている
assert.deepEqual(streakFromDates(["2026-10-09", "2026-10-08"], now), { streak: 2, today: false });
// 一昨日までしかなければ途切れた
assert.deepEqual(streakFromDates(["2026-10-08"], now), { streak: 0, today: false });
// 日付が抜けたらそこまで
assert.deepEqual(streakFromDates(["2026-10-10", "2026-10-08"], now), { streak: 1, today: true });
// JST の日付またぎ（UTC 15:00 = JST 翌日 0:00）
assert.deepEqual(streakFromDates(["2026-10-11"], Date.parse("2026-10-10T15:30:00Z")), { streak: 1, today: true });

console.log("companion: all tests passed");
