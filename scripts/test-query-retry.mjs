// 読み込みの再試行のきまり（src/utils/queryRetry.ts）の確認。  npm run test:query-retry
import assert from "node:assert/strict";
import { isTransientError, shouldRetryQuery, queryRetryDelay, MAX_QUERY_RETRIES } from "../src/utils/queryRetry.ts";

// 本番で出ていた時間切れ（PostgREST が 500 で返す statement_timeout）
const timeout = { code: "57014", message: "canceling statement due to statement timeout", details: null, hint: null };
assert.equal(isTransientError(timeout), true);

// 通信の失敗（Safari / Chrome / supabase-js が包んだもの）
assert.equal(isTransientError(new TypeError("Load failed")), true);
assert.equal(isTransientError(new TypeError("Failed to fetch")), true);
assert.equal(isTransientError({ message: "TypeError: Failed to fetch", details: "", hint: "", code: "" }), true);
assert.equal(isTransientError({ message: "fetch failed" }), true);
// DB に接続できない（503）・混雑
assert.equal(isTransientError({ code: "PGRST001", message: "Database client error" }), true);
assert.equal(isTransientError({ code: "53300", message: "too many connections" }), true);
// HTTP の状態が分かるもの（Edge Function など）
assert.equal(isTransientError({ status: 503, message: "x" }), true);
assert.equal(isTransientError({ context: { status: 502 }, message: "Edge Function returned a non-2xx status code" }), true);
assert.equal(isTransientError({ status: 429, message: "rate limited" }), true);

// 何度やっても同じもの: 再試行しない
assert.equal(isTransientError({ code: "42501", message: "permission denied for function get_collection_progress" }), false);
assert.equal(isTransientError({ code: "PGRST202", message: "Could not find the function" }), false);
assert.equal(isTransientError({ code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }), false);
assert.equal(isTransientError({ code: "PGRST301", message: "JWT expired" }), false);
assert.equal(isTransientError({ code: "22P02", message: "invalid input syntax for type uuid" }), false);
assert.equal(isTransientError({ status: 404, message: "Not found" }), false);
assert.equal(isTransientError({ status: 401, message: "timeout" }), false); // 状態が 4xx ならそちらを優先
assert.equal(isTransientError(new Error("Cannot read properties of undefined")), false);
assert.equal(isTransientError(null), false);
assert.equal(isTransientError(undefined), false);

// 回数: 一時的な失敗は2回まで（最初と合わせて3回）、それ以外は0回
assert.equal(MAX_QUERY_RETRIES, 2);
assert.equal(shouldRetryQuery(0, timeout), true);
assert.equal(shouldRetryQuery(1, timeout), true);
assert.equal(shouldRetryQuery(2, timeout), false);
assert.equal(shouldRetryQuery(0, { code: "42501", message: "permission denied" }), false);

// 間隔: 1秒 → 2秒 → 4秒（上限）に 0〜30% のゆらぎ
assert.equal(queryRetryDelay(0, () => 0), 1000);
assert.equal(queryRetryDelay(1, () => 0), 2000);
assert.equal(queryRetryDelay(2, () => 0), 4000);
assert.equal(queryRetryDelay(5, () => 0), 4000);
assert.equal(queryRetryDelay(0, () => 1), 1300);
for (let i = 0; i < 100; i++) {
  const d = queryRetryDelay(1);
  assert.ok(d >= 2000 && d <= 2600, `delay ${d}`);
}

console.log("query-retry: all tests passed");
