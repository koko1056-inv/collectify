// カタログ一覧の keyset ページ送り（supabase/migrations/20261028030000_catalog_keyset_paging.sql と
// src/utils/catalogKeyset.ts）の確認。  npm run test:catalog-keyset
//
// 手元の PGlite（WASM の Postgres）に本番に似せた official_items を作り、マイグレーションをそのまま流す。本番にはつながない。
//  - 発売日・登録日が同じ行（同点）が多いデータで、keyset のページ（1 / 7 / 200 / 1000 件ずつ）をつなげたものが、
//    前の OFFSET の問い合わせ（release_date desc, created_at desc, id asc）の全件とまったく同じ並び・同じ行か
//    （作品ごと・すべての作品、統合済み・一覧から外したグッズは出ない）
//  - 境目（catalog_page_cursors）＋並列で読むやり方（画面と同じ fetchAllByCursors）が同じ結果か。
//    境目を取った後にグッズが増えた・境目の行が消えた・統合されたときも、重複・すき間が無いか
//  - anon が実行でき、RLS が効く（SECURITY INVOKER）
//  - EXPLAIN で、索引を読んでソートが無いこと（作品あり・すべて・カーソルあり・境目・全体の件数）
//  - 全体の件数（catalog_listed_total）が作り置き＋作品の無いグッズで、count=exact の Seq Scan をしないこと
//  - 並びの列が NULL を許す表では、マイグレーションが止まること
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { cursorOf, fetchAllByCursors, fetchKeysetRange } from "../src/utils/catalogKeyset.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migration = readFileSync(resolve(root, "supabase/migrations/20261028030000_catalog_keyset_paging.sql"), "utf8");

const SCHEMA = `
create role anon; create role authenticated; create role service_role;
create table public.official_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image text not null default '',
  price text not null default '',
  release_date date not null,
  created_at timestamptz not null default now(),
  created_by uuid,
  content_name text,
  description text,
  item_type text not null default 'goods',
  quantity integer not null default 1,
  merged_into uuid references public.official_items(id),
  exclude_from_lists boolean not null default false,
  exclude_reason text);
alter table public.official_items enable row level security;
-- RLS が効くかを見るため、題名が hidden で始まる行は anon には見せない
create policy official_items_read on public.official_items for select using (title not like 'hidden%' or current_user <> 'anon');
grant select on public.official_items to anon, authenticated, service_role;
-- 作り置き（20261028010000_catalog_perf.sql と同じ形。中身は refresh_catalog_caches の代わりにテストで入れる）
create table public.catalog_cache_meta (id boolean primary key default true check (id), refreshed_at timestamptz not null default now(), took_ms integer);
create table public.catalog_content_count_cache (content_name text primary key, item_count integer not null);
grant select on public.catalog_cache_meta, public.catalog_content_count_cache to anon, authenticated;
`;

// ── 1) 並びの列が NULL を許すと止まる ──
{
  const bad = new PGlite();
  await bad.exec(SCHEMA.replace("release_date date not null", "release_date date"));
  await assert.rejects(bad.exec(migration), /release_date/);
  await bad.close();
}

const db = new PGlite();
const q = async (sql, params) => (await db.query(sql, params)).rows;
await db.exec(`set timezone = 'UTC';`);
await db.exec(SCHEMA);

// ── データ（決まった並びの擬似乱数で、同点を多く）──
let seed = 42;
const rand = (n) => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed % n;
};
const DATES = Array.from({ length: 25 }, (_, i) => `2025-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`);
// 小数秒のある・無い・末尾が 0 の登録日（JSON の文字列にしてから戻しても同じ値になるか）
const CREATED = [
  "2026-01-01 00:00:00+00",
  "2026-01-01 00:00:00.5+00",
  "2026-01-01 00:00:00.123456+00",
  "2026-01-01 00:00:00.12+00",
  "2026-01-01 00:00:01+00",
  "2026-03-04 05:06:07.000001+00",
  "2026-03-04 05:06:07.999999+00",
  "2026-10-27 12:00:00.1+00",
];
const rows = [];
const addItems = (content, count, prefix = "item") => {
  for (let i = 0; i < count; i += 1) {
    rows.push([`${prefix}-${content ?? "none"}-${i}`, content, DATES[rand(DATES.length)], CREATED[rand(CREATED.length)]]);
  }
};
addItems("ちいかわ", 2600);
addItems("ナガノ", 420);
addItems(null, 60);
addItems("", 15, "blank"); // 作品名が空文字
addItems("ちいかわ", 40, "hidden"); // anon には見えない（RLS）
for (let i = 0; i < rows.length; i += 500) {
  const chunk = rows.slice(i, i + 500);
  const values = chunk.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}::date, $${j * 4 + 4}::timestamptz)`).join(",");
  await db.query(`insert into official_items(title, content_name, release_date, created_at) values ${values}`, chunk.flat());
}
// 統合済み・一覧から外したグッズ
await db.exec(`
update official_items set exclude_from_lists = true where id in (select id from official_items where content_name = 'ちいかわ' and title like 'item-%' order by title limit 150);
update official_items o set merged_into = t.target
  from (select id, (select id from official_items where content_name = 'ちいかわ' order by title desc limit 1) as target
          from official_items where content_name = 'ちいかわ' and title like 'item-%' and not exclude_from_lists order by title limit 120 offset 200) t
 where o.id = t.id;
`);

await db.exec(migration);
await db.exec(migration); // 2 回流しても大丈夫
await db.exec(`analyze official_items;`);

// ── 前の OFFSET の問い合わせ（PostgREST の order=release_date.desc,created_at.desc,id.asc と同じ）──
const KEY_COLS = `id, release_date::text as release_date, to_json(created_at) #>> '{}' as created_at`;
async function oldOffsetAll(content, role = "anon", limit = null) {
  await db.exec(`set role ${role}`);
  try {
    return await q(
      `select ${KEY_COLS} from official_items
        where merged_into is null and exclude_from_lists = false and ($1::text is null or content_name = $1)
        order by release_date desc, created_at desc, id asc limit $2`,
      [content, limit]
    );
  } finally {
    await db.exec(`reset role`);
  }
}

// 画面と同じ形の読み込み（PostgREST が返す JSON の文字列のキー）
const rpcCalls = { items: 0 };
const fetchAfterAs = (role, content) => async ({ after, until, limit }) => {
  rpcCalls.items += 1;
  await db.exec(`set role ${role}`);
  try {
    return await q(
      `select ${KEY_COLS} from catalog_items_after($1, $2::date, $3::timestamptz, $4::uuid, $5, $6::date, $7::timestamptz, $8::uuid)`,
      [content, after?.release_date ?? null, after?.created_at ?? null, after?.id ?? null, limit, until?.release_date ?? null, until?.created_at ?? null, until?.id ?? null]
    );
  } finally {
    await db.exec(`reset role`);
  }
};
async function cursorsAs(role, content, pageSize, maxRows = null) {
  await db.exec(`set role ${role}`);
  try {
    return await q(
      `select page_no, after_release::text as after_release, to_json(after_created) #>> '{}' as after_created, after_id, total
         from catalog_page_cursors($1, $2, $3)`,
      [content, pageSize, maxRows]
    );
  } finally {
    await db.exec(`reset role`);
  }
}
/** 無限スクロールと同じ: 前のページの最後の行の次から、limit 件ずつ最後まで */
async function scrollAll(content, pageSize, role = "anon") {
  const fetchAfter = fetchAfterAs(role, content);
  const out = [];
  let after = null;
  for (;;) {
    const page = await fetchAfter({ after, until: null, limit: pageSize });
    assert.ok(page.length <= pageSize);
    out.push(...page);
    if (page.length < pageSize) break;
    after = cursorOf(page[page.length - 1]);
  }
  return out;
}
const ids = (list) => list.map((r) => r.id);
const assertUnique = (list, label) => assert.equal(new Set(ids(list)).size, list.length, `${label}: 重複がある`);

// ── 2) 同点の多いデータが本当にあるか（テストの前提）──
{
  const [{ groups, biggest }] = await q(`
    select count(*)::int as groups, max(n)::int as biggest from (
      select count(*) as n from official_items where content_name = 'ちいかわ' and merged_into is null and not exclude_from_lists
       group by release_date, created_at) g`);
  assert.ok(biggest >= 5, `同じ (発売日, 登録日) の行が少ない: ${biggest}`);
  assert.ok(groups < 2600, "同点の組が無い");
}

const old = {
  chiikawa: await oldOffsetAll("ちいかわ"),
  nagano: await oldOffsetAll("ナガノ"),
  all: await oldOffsetAll(null),
  empty: await oldOffsetAll("空の作品"),
};
assert.ok(old.chiikawa.length > 2000 && old.chiikawa.length < 2600, `ちいかわ ${old.chiikawa.length}`);
assert.equal(old.empty.length, 0);
assert.ok((await q(`select count(*)::int as n from official_items where title like 'hidden%' and merged_into is null and not exclude_from_lists`))[0].n === 40);

// ── 3) keyset のページをつなげる == OFFSET の全件（1 / 7 / 200 / 1000 件ずつ）──
for (const size of [1, 7, 200, 1000]) {
  for (const [content, expected] of [["ちいかわ", old.chiikawa], ["ナガノ", old.nagano], [null, old.all], ["空の作品", old.empty]]) {
    const got = await scrollAll(content, size);
    assertUnique(got, `scroll ${content} ${size}`);
    assert.deepEqual(ids(got), ids(expected), `scroll ${content ?? "すべて"} × ${size} 件ずつ`);
  }
}
// 統合済み・一覧から外した・RLS で見えない行は出ない
{
  const hidden = new Set(
    (await q(`select id from official_items where merged_into is not null or exclude_from_lists or title like 'hidden%'`)).map((r) => r.id)
  );
  assert.ok(hidden.size > 300);
  assert.ok(old.all.every((r) => !hidden.has(r.id)));
}
// ログイン済み（authenticated）は RLS で hidden も見える。SECURITY INVOKER なので呼んだ人の RLS になる
{
  const asUser = await scrollAll("ちいかわ", 1000, "authenticated");
  assert.deepEqual(ids(asUser), ids(await oldOffsetAll("ちいかわ", "authenticated")));
  assert.equal(asUser.length - old.chiikawa.length, 40);
}
// p_limit は 1〜1000 に丸める。空文字の作品は「すべて」
{
  const big = await fetchAfterAs("anon", null)({ after: null, until: null, limit: 5000 });
  assert.equal(big.length, 1000);
  const zero = await fetchAfterAs("anon", null)({ after: null, until: null, limit: 0 });
  assert.equal(zero.length, 1);
  const blank = await fetchAfterAs("anon", " ")({ after: null, until: null, limit: 30 });
  assert.deepEqual(ids(blank), ids(old.all.slice(0, 30)));
  // カーソルが半端（id だけ）なら 22023
  await assert.rejects(
    db.query(`select * from catalog_items_after(null, null, null, gen_random_uuid(), 10)`),
    /3 つそろえて/
  );
}

// ── 4) 境目＋並列（useOfficialItems と同じ）== OFFSET の全件 ──
for (const size of [1, 7, 200, 1000]) {
  for (const [content, expected] of [["ちいかわ", old.chiikawa], ["ナガノ", old.nagano], [null, old.all], ["空の作品", old.empty]]) {
    const cursors = await cursorsAs("anon", content, size);
    assert.equal(cursors[0].page_no, 0);
    assert.equal(cursors[0].after_id, null);
    assert.equal(Number(cursors[0].total), expected.length);
    assert.equal(cursors.length, Math.max(1, Math.ceil(expected.length / size)));
    // 境目は k × size 件目の行
    for (const c of cursors.slice(1)) assert.equal(c.after_id, expected[c.page_no * size - 1].id);
    rpcCalls.items = 0;
    const { rows: got, total } = await fetchAllByCursors(cursors, fetchAfterAs("anon", content), { pageSize: size, concurrency: 4 });
    assert.equal(total, expected.length);
    assertUnique(got, `cursors ${content} ${size}`);
    assert.deepEqual(ids(got), ids(expected), `cursors ${content ?? "すべて"} × ${size}`);
    // 変更が無ければ、ページ 1 つにつき 1 回だけ読む（最後のページがちょうど埋まったときだけ、増えた分が無いかをもう 1 回見る）
    const lastFull = expected.length > 0 && expected.length % size === 0 ? 1 : 0;
    assert.equal(rpcCalls.items, expected.length === 0 ? 0 : cursors.length + lastFull);
  }
}
// 作品を選ばない「新しい順に 1500 件」（maxRows）
{
  const expected = await oldOffsetAll(null, "anon", 1500);
  const cursors = await cursorsAs("anon", null, 1000, 1500);
  assert.equal(Number(cursors[0].total), 1500);
  assert.equal(cursors.length, 2);
  const { rows: got } = await fetchAllByCursors(cursors, fetchAfterAs("anon", null), { pageSize: 1000, concurrency: 4, maxRows: 1500 });
  assert.deepEqual(ids(got), ids(expected));
  // 全体が maxRows より少ないとき
  const small = await cursorsAs("anon", "ナガノ", 1000, 1500);
  assert.equal(Number(small[0].total), old.nagano.length);
}

// ── 5) 境目を取った後にグッズが増えた・消えた・統合された ──
{
  const size = 200;
  const cursors = await cursorsAs("anon", "ちいかわ", size);
  const boundary = cursors[3]; // ページ 2 の終わり / ページ 3 の始まり
  // 境目と同じ (発売日, 登録日) で id が前後する行を足す（ページの途中に割り込む）。1 ページに 250 件足して、1 回では読み切れないようにする
  await db.query(
    `insert into official_items(id, title, content_name, release_date, created_at)
     select gen_random_uuid(), 'added-' || g, 'ちいかわ', $1::date, $2::timestamptz from generate_series(1, 250) g`,
    [boundary.after_release, boundary.after_created]
  );
  // 先頭より新しいもの・いちばん古いものも足す
  await db.exec(`
    insert into official_items(title, content_name, release_date, created_at) values
      ('newest', 'ちいかわ', '2030-01-01', '2030-01-01'), ('oldest', 'ちいかわ', '2000-01-01', '2000-01-01');`);
  // 別の境目の行そのものを消し、もう 1 つの境目の行は統合済みにする
  await q(`delete from official_items where id = $1`, [cursors[5].after_id]);
  await q(`update official_items set merged_into = $2 where id = $1`, [cursors[7].after_id, old.chiikawa[0].id]);

  const now = await oldOffsetAll("ちいかわ");
  rpcCalls.items = 0;
  const { rows: got } = await fetchAllByCursors(cursors, fetchAfterAs("anon", "ちいかわ"), { pageSize: size, concurrency: 4 });
  assertUnique(got, "変更の後");
  assert.deepEqual(ids(got), ids(now), "境目を取った後の変更も、今の全件と同じ");
  assert.ok(rpcCalls.items > cursors.length, "増えたページは続きを読んでいる");
  // 無限スクロールも今の全件と同じ
  assert.deepEqual(ids(await scrollAll("ちいかわ", 7)), ids(now));
}
// fetchKeysetRange: until に届いたら止まる（limit ちょうどで終わる範囲で、余計に読まない）
{
  const now = await oldOffsetAll("ナガノ");
  let calls = 0;
  const fetchAfter = async (r) => {
    calls += 1;
    return fetchAfterAs("anon", "ナガノ")(r);
  };
  const got = await fetchKeysetRange(fetchAfter, { after: cursorOf(now[9]), until: cursorOf(now[19]), limit: 10, exhaust: true });
  assert.deepEqual(ids(got), ids(now.slice(10, 20)));
  assert.equal(calls, 1);
}

// ── 6) 権限 ──
{
  const grants = await q(`
    select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as auth,
           p.prosecdef, p.provolatile
      from pg_proc p where p.proname in ('catalog_items_after', 'catalog_page_cursors', 'catalog_listed_total') order by 1`);
  assert.equal(grants.length, 3);
  for (const g of grants) {
    assert.equal(g.anon, true, `${g.proname} anon`);
    assert.equal(g.auth, true, `${g.proname} authenticated`);
    assert.equal(g.prosecdef, false, `${g.proname} は SECURITY INVOKER`);
    assert.equal(g.provolatile, "s", `${g.proname} は STABLE`);
  }
}

// ── 6b) 全体の件数（catalog_listed_total。作品を選ばない一覧の 1 ページ目の「全 ○ 件」）──
{
  const listedTotal = async (role = "anon") => {
    await db.exec(`set role ${role}`);
    try {
      return Number((await q(`select catalog_listed_total() as n`))[0].n);
    } finally {
      await db.exec(`reset role`);
    }
  };
  const live = async () => (await oldOffsetAll(null)).length;
  // 作り置きがまだ無い: その場で数える（anon の RLS が効く）
  assert.equal(await listedTotal(), await live());
  assert.equal(await listedTotal("authenticated"), (await oldOffsetAll(null, "authenticated")).length);
  // 作り置きがある: 作品ごとの件数（refresh_catalog_caches と同じ数え方）の合計 ＋ 作品の無いグッズ
  await db.exec(`
    insert into catalog_content_count_cache(content_name, item_count)
    select content_name, count(*)::int from official_items
     where merged_into is null and exclude_from_lists is not true and content_name is not null and content_name <> ''
     group by content_name;
    insert into catalog_cache_meta(id) values (true);`);
  const fresh = await listedTotal();
  // 作り置きは RLS を通さずに数えているので、hidden（anon に見えない 40 件）も入る
  assert.equal(fresh, (await oldOffsetAll(null, "authenticated")).length);
  // 作品の無いグッズ（null と ''）は今の件数
  await db.exec(`insert into official_items(title, content_name, release_date, created_at) values ('no-content-new', null, '2025-01-01', now()), ('blank-new', '', '2025-01-01', now())`);
  assert.equal(await listedTotal(), fresh + 2);
  // 作品のあるグッズは次の作り直しまで変わらない（最大 10 分遅れ）
  await db.exec(`insert into official_items(title, content_name, release_date, created_at) values ('chiikawa-new', 'ちいかわ', '2025-01-01', now())`);
  assert.equal(await listedTotal(), fresh + 2);
  // 後のテストに影響しないよう戻す
  await db.exec(`delete from official_items where title in ('no-content-new', 'blank-new', 'chiikawa-new'); delete from catalog_cache_meta; delete from catalog_content_count_cache;`);
  const g = (await q(`select has_function_privilege('anon', 'public.catalog_listed_total()', 'execute') as ok`))[0];
  assert.equal(g.ok, true);
}

// ── 7) EXPLAIN: 索引を読み、ソートが無い ──
// 関数の中で組み立てる SQL をそのまま EXPLAIN するため、マイグレーションの関数を「SQL の代わりに EXPLAIN を返す」形に書き換えて作る
{
  const src = migration.slice(
    migration.indexOf("create or replace function public.catalog_items_after("),
    migration.indexOf("comment on function public.catalog_items_after")
  );
  const explainFn = src
    .replace("public.catalog_items_after(", "public.explain_catalog_items_after(")
    .replace("returns setof public.official_items", "returns setof text")
    .replace(/\bstable\b/, "volatile")
    .replaceAll("return query execute _from", "return query execute 'explain (costs off) ' || _from");
  assert.notEqual(explainFn, src);
  await db.exec(explainFn);

  // 本番の大きさに近い件数で計画を見る（小さい表だと全件を読んで並べる方が安いと判断される）
  await db.exec(`
    insert into official_items(title, content_name, release_date, created_at)
    select 'bulk-' || g, case when g % 4 = 0 then 'ちいかわ' else 'その他' || (g % 50) end,
           date '2020-01-01' + (g % 2000), timestamptz '2026-01-01' + (g % 977) * interval '1 second'
      from generate_series(1, 60000) g;`);
  // 本番は autovacuum が可視性マップを保っている（索引だけで読める）。手元も同じ状態にする
  await db.exec(`vacuum analyze official_items;`);
  const plan = async (sql, params) => (await q(sql, params)).map((r) => Object.values(r)[0]).join("\n");
  // 本番のちいかわと同じくらいの深さ・幅（2000 件目の次から 3000 件目まで）
  const bulkChiikawa = await oldOffsetAll("ちいかわ");
  const bulkAll = await oldOffsetAll(null);
  // 同じ (発売日, 登録日) の組の途中の行をカーソルにする（同点の中の比較が要る形）
  const midTie = (list, from) => {
    for (let i = from; i < list.length - 1; i += 1) {
      if (list[i].release_date === list[i + 1].release_date && list[i].created_at === list[i + 1].created_at) return list[i];
    }
    throw new Error("同点の組が無い");
  };
  const c = cursorOf(midTie(bulkChiikawa, 1999));
  const u = cursorOf(bulkChiikawa[2999]);
  const ca = cursorOf(midTie(bulkAll, 6000));
  const cases = {
    "作品・先頭": [`select * from explain_catalog_items_after('ちいかわ', null, null, null, 200)`],
    "作品・カーソルあり": [`select * from explain_catalog_items_after('ちいかわ', $1::date, $2::timestamptz, $3::uuid, 200)`, [c.release_date, c.created_at, c.id]],
    "作品・カーソルと終わり": [
      `select * from explain_catalog_items_after('ちいかわ', $1::date, $2::timestamptz, $3::uuid, 1000, $4::date, $5::timestamptz, $6::uuid)`,
      [c.release_date, c.created_at, c.id, u.release_date, u.created_at, u.id],
    ],
    "すべて・先頭": [`select * from explain_catalog_items_after(null, null, null, null, 200)`],
    "すべて・カーソルあり": [`select * from explain_catalog_items_after(null, $1::date, $2::timestamptz, $3::uuid, 200)`, [ca.release_date, ca.created_at, ca.id]],
  };
  const plans = {};
  for (const [label, [sql, params]] of Object.entries(cases)) {
    let p = await plan(sql, params);
    if (label === "作品・カーソルと終わり" && /\bSort\b/.test(p)) {
      // 終わりもある範囲（並列で全件を読むときの 1 ページ）は、読む範囲が両側から索引で区切られていて、ちょうど 1 ページ分しか無い。
      // PGlite（と、おそらく本番も）はこの大きさなら「ビットマップで拾って 1 ページ分だけ並べる」方を選ぶ。並べる行数はページの深さに
      // 関係ない（p_limit 前後）ので構わない。ここでは範囲が索引の両側で区切られていることを確かめ、
      // このテストの中だけ enable_bitmapscan を切って、索引の並びのまま読む計画も取れることを確かめる
      assert.match(p, /Bitmap Index Scan on official_items_listed_keyset_content_idx\n\s+Index Cond: .*release_date >= .*release_date <= /, p);
      plans[`${label}（ビットマップ）`] = p;
      await db.exec(`set enable_bitmapscan = off`);
      try {
        p = await plan(sql, params);
      } finally {
        await db.exec(`reset enable_bitmapscan`);
      }
    }
    plans[label] = p;
    // 1 つの範囲を索引の並びのまま読む: Limit → Index Scan。Sort・Bitmap・Seq Scan は無い
    assert.match(p, /^Limit\n\s+->\s+Index Scan using official_items_listed_keyset(_content)?_idx on official_items o/, `${label}: 索引の並びで読んでいない\n${p}`);
    assert.doesNotMatch(p, /\bSort\b|Bitmap|Seq Scan/, `${label}: ソート・ビットマップ・全件読みがある\n${p}`);
  }
  assert.match(plans["作品・先頭"], /official_items_listed_keyset_content_idx[\s\S]*Index Cond: \(content_name = /);
  assert.match(plans["すべて・先頭"], /official_items_listed_keyset_idx/);
  // カーソルあり: 発売日の上限が索引の範囲（Index Cond）になり、同じ発売日の中の比較だけが絞り込み（Filter）
  assert.match(plans["作品・カーソルあり"], /official_items_listed_keyset_content_idx[\s\S]*Index Cond: \(\(content_name = .*release_date <= /);
  assert.match(plans["すべて・カーソルあり"], /official_items_listed_keyset_idx[\s\S]*Index Cond: \(release_date <= /);
  assert.match(plans["作品・カーソルと終わり"], /Index Cond: .*release_date (<=|>=) .*release_date (<=|>=) /);

  // 読む行の数がページの深さに関係ない（EXPLAIN ANALYZE の索引の行数 = 返した行 ＋ カーソルと同じ発売日で前にある行だけ）
  for (const depth of [0, 2000, 6000]) {
    const list = bulkAll;
    const cur = depth === 0 ? null : cursorOf(list[depth - 1]);
    const sameDayBefore = cur ? list.slice(0, depth).filter((r) => r.release_date === cur.release_date).length : 0;
    const body = (await q(
      `select * from explain_catalog_items_after(null, $1::date, $2::timestamptz, $3::uuid, 200)`,
      [cur?.release_date ?? null, cur?.created_at ?? null, cur?.id ?? null]
    )).map((r) => Object.values(r)[0]).join("\n");
    assert.doesNotMatch(body, /\bSort\b/, body);
    const fn = await fetchAfterAs("anon", null)({ after: cur, until: null, limit: 200 });
    assert.deepEqual(ids(fn), ids(list.slice(depth, depth + 200)), `すべて・${depth} 件目の次から`);
    assert.ok(sameDayBefore < 200, `同じ発売日の行が多すぎる: ${sameDayBefore}`);
  }

  // 境目（catalog_page_cursors の作品ありの問い合わせと同じ形）は索引だけを読み、ソートが無い
  const cursorPlan = await plan(`explain (costs off)
    with ordered as (
      select k.release_date, k.created_at, k.id,
             row_number() over (order by k.release_date desc, k.created_at desc, k.id) as rn
        from (select o.release_date, o.created_at, o.id from public.official_items o
               where o.content_name = 'ちいかわ' and o.merged_into is null and o.exclude_from_lists = false
               order by o.release_date desc, o.created_at desc, o.id limit null) k
    ), cnt as (select count(*) as n from ordered)
    select 0, null::date, null::timestamptz, null::uuid, cnt.n from cnt
    union all
    select (ordered.rn / 1000)::integer, ordered.release_date, ordered.created_at, ordered.id, cnt.n
      from ordered, cnt where ordered.rn % 1000 = 0 and ordered.rn < cnt.n
    order by 1`);
  assert.match(cursorPlan, /Index Only Scan using official_items_listed_keyset_content_idx/, cursorPlan);
  assert.doesNotMatch(cursorPlan.split("\n").slice(1).join("\n"), /\bSort\b(?! Key)/, `境目の問い合わせの中にソートがある\n${cursorPlan}`);
  // 境目の関数の本体と同じ問い合わせか（ずれないように）
  assert.ok(migration.includes("row_number() over (order by k.release_date desc, k.created_at desc, k.id) as rn"));

  // 全体の件数（作り置きがまだ無いとき）は部分索引だけで数える（表の本体を Seq Scan しない）
  // ほぼ全件を数えるので、そのままだと計画は Seq Scan を選ぶ（本番で 4.3 秒だった形）。関数には enable_seqscan = off を付けている
  const [{ proconfig }] = await q(`select proconfig from pg_proc where proname = 'catalog_listed_total'`);
  assert.ok(proconfig.includes("enable_seqscan=off"), String(proconfig));
  await db.exec(`set enable_seqscan = off`);
  let countPlan;
  try {
    countPlan = await plan(`explain (costs off) select count(*) from public.official_items o
      where o.merged_into is null and o.exclude_from_lists = false`);
  } finally {
    await db.exec(`reset enable_seqscan`);
  }
  assert.match(countPlan, /Index Only Scan using official_items_listed_keyset(_content)?_idx/, countPlan);
  assert.doesNotMatch(countPlan, /Seq Scan/, countPlan);
  // 作り置きがあるとき: 作品の無いグッズ（null / ''）だけを索引の先頭から数える
  for (const cond of ["o.content_name is null", "o.content_name = ''"]) {
    const p = await plan(`explain (costs off) select count(*) from public.official_items o
      where ${cond} and o.merged_into is null and o.exclude_from_lists = false`);
    assert.match(p, /Index Only Scan using official_items_listed_keyset_content_idx/, p);
    assert.doesNotMatch(p, /Seq Scan/, p);
  }

  if (process.env.VERBOSE) {
    for (const [label, p] of Object.entries(plans)) console.log(`--- ${label}\n${p}`);
    console.log(`--- 境目\n${cursorPlan}`);
    console.log(`--- 全体の件数\n${countPlan}`);
  }
}

await db.close();
console.log("catalog keyset: ok");
