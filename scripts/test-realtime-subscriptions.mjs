// Realtime の購読と公開（supabase_realtime）の確認。  npm run test:realtime
//
//  - マイグレーションを順に読んで最後の公開を出し、src の postgres_changes がすべてその中の表を聞いているか
//    （公開に入っていない表を聞くと一度も届かず、購読だけが DB に残る）
//  - カタログのカード（useOfficialGoodsCard）が購読を開かないか
//  - 取引の購読が sender_id / receiver_id で絞られ、ユーザーごとに1本にまとめられているか
//  - 1本にまとめる入れ物（src/lib/realtime/refCountedChannels.ts）の数え方
//  - 公開から外すマイグレーションを PGlite で2回流して、外す表だけが外れるか（公開が無い環境でも落ちないか）
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { createRefCountedRegistry } from "../src/lib/realtime/refCountedChannels.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLEANUP = "20261028020000_realtime_publication_cleanup.sql";

// ── 1. 最後の公開をマイグレーションから出す ──
// 本番の公開は、ダッシュボードから足したもの（マイグレーションに無い）も含めて次の11表だった（2026-10-27 時点）。
// ここを出発点にして、マイグレーションの ADD / DROP を名前順に当てていく。
const PROD_PUBLICATION_2026_10_27 = [
  "greeting_stamps", "item_post_comments", "item_post_likes", "item_posts", "item_room_messages",
  "match_actions", "messages", "notifications", "post_comments", "room_reactions", "trade_requests",
];

/** 1つのマイグレーションの中の、supabase_realtime への ADD / DROP を順に返す */
export function publicationOps(sql) {
  const ops = [];
  // 直接書いたもの: ALTER PUBLICATION supabase_realtime ADD TABLE public.x[, public.y]
  const direct = /alter\s+publication\s+supabase_realtime\s+(add|drop)\s+table\s+([^;]+);/gi;
  for (const m of sql.matchAll(direct)) {
    for (const t of m[2].split(",")) {
      const name = t.trim().replace(/^public\./i, "").replace(/"/g, "");
      if (/^\w+$/.test(name)) ops.push({ at: m.index, op: m[1].toLowerCase(), table: name });
    }
  }
  // DO ブロックで配列を回すもの: FOREACH tbl IN ARRAY ARRAY['a','b'] ... format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl)
  const loop = /array\s*\[([^\]]+)\][\s\S]*?alter\s+publication\s+supabase_realtime\s+(add|drop)\s+table\s+public\.%I/gi;
  for (const m of sql.matchAll(loop)) {
    for (const t of m[1].matchAll(/'(\w+)'/g)) ops.push({ at: m.index, op: m[2].toLowerCase(), table: t[1] });
  }
  return ops.sort((a, b) => a.at - b.at);
}

const migDir = resolve(root, "supabase/migrations");
const migrations = readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
assert.ok(migrations.includes(CLEANUP), `${CLEANUP} が無い`);
const publication = new Set(PROD_PUBLICATION_2026_10_27);
for (const file of migrations) {
  for (const { op, table } of publicationOps(readFileSync(join(migDir, file), "utf8"))) {
    if (op === "add") publication.add(table);
    else publication.delete(table);
  }
}
assert.deepEqual(
  [...publication].sort(),
  ["item_room_messages", "messages", "notifications", "post_comments", "room_reactions", "trade_requests"],
  "最後の公開が想定と違う"
);
// 取り出し方そのものの確認（前のマイグレーションの2つの書き方を読めているか）
assert.deepEqual(
  publicationOps(readFileSync(join(migDir, "20260424025041_e5103ea0-f65f-49c5-9a7b-f34a130961b9.sql"), "utf8")).map((o) => o.table),
  ["item_room_messages", "greeting_stamps", "match_actions"]
);
assert.deepEqual(
  publicationOps(readFileSync(join(migDir, "20261008100000_trade_requests_reservation_and_notifications.sql"), "utf8")).map((o) => `${o.op}:${o.table}`),
  ["add:trade_requests", "add:messages", "add:notifications"]
);

// ── 2. src の postgres_changes を全部拾う ──
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

/** ファイルの中の postgres_changes の購読（表・フィルタ・行番号）を返す */
export function findSubscriptions(src) {
  const subs = [];
  for (const m of src.matchAll(/['"]postgres_changes['"]\s*,\s*\{((?:[^{}]|\$\{[^}]*\})*)\}/g)) {
    const body = m[1];
    const table = body.match(/table\s*:\s*['"`](\w+)['"`]/)?.[1] ?? null;
    // フィルタは文字列ならその中身、三項演算子などの式なら式のまま（「絞っているか」だけ分かればよい）
    const filter =
      body.match(/filter\s*:\s*(['"`])([^'"`]*)\1\s*,?\s*$/)?.[2] ??
      body.match(/filter\s*:\s*([\s\S]*?),?\s*$/)?.[1].replace(/\s+/g, " ").trim() ??
      null;
    const line = src.slice(0, m.index).split("\n").length;
    subs.push({ table, filter, line });
  }
  return subs;
}

const scanDirs = ["src", "api", "supabase/functions", "ios"].map((d) => resolve(root, d));
const all = [];
for (const dir of scanDirs) {
  let files = [];
  try { files = walk(dir); } catch { continue; }
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    if (!src.includes("postgres_changes")) continue;
    const rel = relative(root, file);
    const subs = findSubscriptions(src);
    // 拾い損ね（文字列の postgres_changes はあるのに、購読として読めない）が無いこと
    const mentions = [...src.matchAll(/['"]postgres_changes['"]/g)].length;
    assert.equal(subs.length, mentions, `${rel}: postgres_changes を購読として読めない箇所がある`);
    for (const s of subs) all.push({ file: rel, ...s });
  }
}

for (const s of all) {
  assert.ok(s.table, `${s.file}:${s.line} 表の名前が無い（スキーマ全体を聞く購読は使わない）`);
  assert.ok(publication.has(s.table), `${s.file}:${s.line} ${s.table} は Realtime の公開に入っていないので一度も届かない`);
  // 絞らない購読は、その表の変化のたびに購読者全員ぶんの RLS 確認が走る
  assert.ok(s.filter, `${s.file}:${s.line} ${s.table} の購読が絞られていない（filter が無い）`);
}
// 公開に入っていて、誰も聞いていない表が無いこと（あれば公開から外す）
const listened = new Set(all.map((s) => s.table));
for (const t of publication) assert.ok(listened.has(t), `${t} は公開に入っているのに誰も聞いていない`);

// ── 3. カタログのカード ──
const card = readFileSync(resolve(root, "src/components/official-goods/useOfficialGoodsCard.ts"), "utf8");
assert.ok(!/postgres_changes|\.channel\(|removeChannel/.test(card), "useOfficialGoodsCard がカードごとに購読を開いている");
for (const f of ["src/components/OfficialGoodsCard.tsx", "src/components/official-goods/MemoizedOfficialGoodsCard.tsx"]) {
  assert.ok(!/postgres_changes|\.channel\(/.test(readFileSync(resolve(root, f), "utf8")), `${f} がカードごとに購読を開いている`);
}

// ── 4. 取引 ──
const tradeSubs = all.filter((s) => s.table === "trade_requests");
assert.ok(tradeSubs.length >= 2, "取引の購読が見つからない");
for (const s of tradeSubs) {
  assert.match(s.filter ?? "", /^(sender_id|receiver_id)=eq\.\$\{userId\}$/, `${s.file}:${s.line} 取引の購読が自分の取引に絞られていない`);
}
assert.deepEqual(new Set(tradeSubs.map((s) => s.filter.split("=")[0])), new Set(["sender_id", "receiver_id"]));
assert.ok(tradeSubs.every((s) => s.file === "src/hooks/trade/useMyTrades.ts"), "取引の購読が useMyTrades の外にもある");
const myTrades = readFileSync(resolve(root, "src/hooks/trade/useMyTrades.ts"), "utf8");
assert.equal([...myTrades.matchAll(/\.channel\(/g)].length, 1, "useMyTrades のチャンネルは1か所で開く");
assert.match(myTrades, /tradesChannels\.acquire\(\s*userId/, "取引のチャンネルがユーザーごとの入れ物を通っていない");
assert.match(myTrades, /if \(!user\?\.id \|\| !enabled\) return;\s*return acquireTradesChannel/, "ゲストでも取引を購読している");

// ── 5. 1本にまとめる入れ物 ──
{
  const reg = createRefCountedRegistry();
  let opened = 0;
  let closed = 0;
  const open = () => ({ id: ++opened });
  const close = () => { closed += 1; };

  // 同じユーザーで2か所から借りても1本
  const r1 = reg.acquire("u1", open, close);
  const r2 = reg.acquire("u1", open, close);
  assert.equal(opened, 1);
  assert.equal(reg.size(), 1);
  assert.equal(reg.refCount("u1"), 2);
  // 1つ返しても残る。同じ返却を2回呼んでも1回分
  r1();
  r1();
  assert.equal(closed, 0);
  assert.equal(reg.refCount("u1"), 1);
  // 最後の1つで閉じる
  r2();
  assert.equal(closed, 1);
  assert.equal(reg.size(), 0);
  // 閉じたあとはまた開く
  const r3 = reg.acquire("u1", open, close);
  assert.equal(opened, 2);
  // 別のユーザーは別の1本
  const r4 = reg.acquire("u2", open, close);
  assert.equal(opened, 3);
  assert.equal(reg.size(), 2);
  // 古い返却（閉じる前に借りたもの）を呼んでも、開き直したものには触らない
  r2();
  assert.equal(reg.refCount("u1"), 1);
  r3();
  r4();
  assert.equal(closed, 3);
  assert.equal(reg.size(), 0);
}

// ── 6. 公開から外すマイグレーションを流す ──
{
  const sql = readFileSync(join(migDir, CLEANUP), "utf8");
  const db = new PGlite();
  // 公開が無い環境では何もしない
  await db.exec(sql);
  const tables = PROD_PUBLICATION_2026_10_27;
  await db.exec(tables.map((t) => `create table public.${t} (id int primary key);`).join("\n"));
  await db.exec(`create publication supabase_realtime for table ${tables.map((t) => `public.${t}`).join(", ")};`);
  const pub = async () =>
    (await db.query(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1`)).rows.map((r) => r.tablename);
  assert.deepEqual(await pub(), [...tables].sort());
  await db.exec(sql);
  assert.deepEqual(await pub(), [...publication].sort(), "マイグレーションのあとの公開が、静的に出したものと違う");
  // 2回目も落ちない（入っていないものは外さない）
  await db.exec(sql);
  assert.deepEqual(await pub(), [...publication].sort());
  // 外す表が一部だけ入っている環境でも落ちない
  await db.exec(`alter publication supabase_realtime add table public.match_actions;`);
  await db.exec(sql);
  assert.deepEqual(await pub(), [...publication].sort());
  // FOR ALL TABLES の公開には触らない
  const db2 = new PGlite();
  await db2.exec(`create table public.item_posts (id int primary key); create publication supabase_realtime for all tables;`);
  await db2.exec(sql);
  await db.close();
  await db2.close();
}

console.log("realtime subscriptions: ok");
for (const s of all) console.log(`  ${s.table.padEnd(20)} ${s.file}:${s.line}${s.filter ? `  (${s.filter})` : ""}`);
