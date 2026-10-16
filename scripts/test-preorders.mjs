// 「予約中」の並べ方と金額の読み取り（src/utils/preorders.ts）の確認。  npm run test:preorders
import assert from "node:assert/strict";
import { parseYen, isDue, lineTotal, groupPreorders, monthParts, formatYen } from "../src/utils/preorders.ts";

// カタログの値段の表記から円を読む
assert.equal(parseYen("¥1,650"), 1650);
assert.equal(parseYen("1,650円(税込)"), 1650);
assert.equal(parseYen("１６５０円"), null); // 全角の数字はカタログに無いので読まない（空欄にする）
assert.equal(parseYen("価格未定"), null);
assert.equal(parseYen(""), null);
assert.equal(parseYen(null), null);
assert.equal(parseYen("0"), null);

// 発売日を過ぎたか（今日を含む）
assert.equal(isDue({ releaseDate: "2026-10-16" }, "2026-10-16"), true);
assert.equal(isDue({ releaseDate: "2026-10-17" }, "2026-10-16"), false);
assert.equal(isDue({ releaseDate: null }, "2026-10-16"), false);

assert.equal(lineTotal({ price: 1650, quantity: 2 }), 3300);
assert.equal(lineTotal({ price: null, quantity: 3 }), 0);
assert.equal(formatYen(12345), "¥12,345");

// 並べ方: 発売日を過ぎたもの → 月の早い順 → 未定。月ごとの合計は値段を入れた分だけ
const items = [
  { id: "a", quantity: 1, price: 3000, releaseDate: "2026-12-05" },
  { id: "b", quantity: 2, price: 1500, releaseDate: "2026-11-20" },
  { id: "c", quantity: 1, price: null, releaseDate: "2026-11-01" },
  { id: "d", quantity: 1, price: 800, releaseDate: "2026-10-10" },
  { id: "e", quantity: 1, price: 500, releaseDate: null },
];
const groups = groupPreorders(items, "2026-10-16");
assert.deepEqual(groups.map((g) => g.key), ["due", "2026-11", "2026-12", "unknown"]);
assert.deepEqual(groups[0].items.map((i) => i.id), ["d"]);
assert.deepEqual(groups[1].items.map((i) => i.id), ["c", "b"]);
assert.equal(groups[1].total, 3000);
assert.equal(groups[1].unpriced, 1);
assert.equal(groups[2].total, 3000);
assert.deepEqual(groupPreorders([], "2026-10-16"), []);

assert.deepEqual(monthParts("2026-11"), { year: 2026, month: 11 });
assert.equal(monthParts("due"), null);

console.log("preorders: すべて通過");

// ---- 推し活費（src/utils/spending.ts） ----
const sp = await import("../src/utils/spending.ts");
assert.deepEqual(sp.lastMonths("2026-01-20", 3), ["2025-11", "2025-12", "2026-01"]);
assert.equal(sp.jstDate("2026-10-15T16:00:00Z"), "2026-10-16");
assert.deepEqual(sp.toEntry({ purchase_price: "1650", purchase_date: "2026-10-01", quantity: 2, content_name: " ちいかわ " }), { date: "2026-10-01", amount: 3300, contentName: "ちいかわ" });
assert.equal(sp.toEntry({ purchase_price: null, purchase_date: "2026-10-01", content_name: null }), null);
assert.equal(sp.toEntry({ purchase_price: "500", purchase_date: null, created_at: "2026-09-30T20:00:00Z", content_name: null }).date, "2026-10-01");
const entries = [
  { date: "2026-10-01", amount: 3300, contentName: "ちいかわ" },
  { date: "2026-10-12", amount: 1000, contentName: "ミセス" },
  { date: "2026-09-05", amount: 700, contentName: "ちいかわ" },
  { date: "2025-12-31", amount: 9999, contentName: "ちいかわ" },
];
const months = sp.monthlyTotals(entries, "2026-10-16", 12);
assert.equal(months.length, 12);
assert.deepEqual(months.at(-1), { key: "2026-10", total: 4300, count: 2 });
assert.deepEqual(months.at(-2), { key: "2026-09", total: 700, count: 1 });
assert.equal(months[0].key, "2025-11");
assert.equal(months.find((m) => m.key === "2025-12").total, 9999);
assert.equal(sp.totalIn(entries, "2026"), 5000);
assert.deepEqual(sp.byWork(entries, "2026"), [{ name: "ちいかわ", total: 4000 }, { name: "ミセス", total: 1000 }]);
assert.deepEqual(sp.byWork(entries, "2026", 1), [{ name: "ちいかわ", total: 4000 }, { name: "__other", total: 1000 }]);

console.log("spending: すべて通過");
