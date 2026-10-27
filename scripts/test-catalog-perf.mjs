// カタログの作り置き（supabase/migrations/20261028010000_catalog_perf.sql）の確認。  npm run test:catalog-perf
//
// 手元の PGlite（WASM の Postgres）に小さな表を作り、マイグレーションをそのまま流す。本番にはつながない。
//  - 作り置きを読む新しい関数が、前の定義（その場で数える。前のマイグレーションから取り出して old_ を付ける）と
//    同じ行を返すか（統合済み・一覧から外したグッズ、「なし」・空のタグ、同じ作品の同名キャラタグ、本人の所持数、ゲストは 0）
//  - 作り置きの前・作り置きに無い作品でも、前と同じ結果になるか（その場で数える）
//  - サムネの待ち行列が、前の「全件をなめる」条件と同じ画像を持ち続けるか（追加・画像の変更・統合・削除・サムネができた・消した）
//  - cron のコマンドの置き換え（正規表現）が想定どおりか
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mig = (name) => readFileSync(resolve(root, "supabase/migrations", name), "utf8");

/** マイグレーションから関数の定義を 1 つ取り出し、名前に old_ を付ける */
function oldFunction(file, name) {
  const sql = mig(file);
  const start = sql.search(new RegExp(`create or replace function public\\.${name}\\(`, "i"));
  assert.ok(start >= 0, `${file} に ${name} が無い`);
  const tag = sql.slice(start).match(/\bas\s+(\$[a-z_]*\$)/i)[1];
  const bodyStart = sql.indexOf(tag, start) + tag.length;
  const end = sql.indexOf(tag, bodyStart) + tag.length;
  return sql.slice(start, end).replace(`public.${name}(`, `public.old_${name}(`) + ";";
}

const db = new PGlite();
const q = async (sql, params) => (await db.query(sql, params)).rows;

// ── 本番に似せた最小の表 ──
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create table public.content_names (id uuid primary key default gen_random_uuid(), name text not null unique);
create table public.tags (
  id uuid primary key default gen_random_uuid(), name text, category text, content_id uuid references public.content_names(id),
  created_at timestamptz not null default now(), usage_count integer not null default 0);
create table public.official_items (
  id uuid primary key default gen_random_uuid(), title text, image text, content_name text, release_date date,
  merged_into uuid references public.official_items(id), exclude_from_lists boolean not null default false,
  created_at timestamptz not null default now());
create index official_items_image_base_idx on public.official_items (split_part(image, '?', 1));
create table public.item_tags (
  id uuid primary key default gen_random_uuid(), official_item_id uuid not null references public.official_items(id) on delete cascade,
  tag_id uuid not null references public.tags(id), unique (official_item_id, tag_id));
create table public.user_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, official_item_id uuid references public.official_items(id),
  image text, created_at timestamptz not null default now());
create function public.can_view_collection(uuid) returns boolean language sql stable as $$ select true $$;
create table public.catalog_image_thumbs (
  src_hash text primary key, src_url text not null,
  status text not null default 'processing' check (status in ('processing', 'ok', 'failed')),
  width int, height int, bytes int, orig_bytes int, error text, attempts int not null default 0,
  claimed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant select on public.content_names, public.tags, public.official_items, public.item_tags, public.user_items to anon, authenticated;
`);

// ── データ ──
const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
await db.exec(`insert into content_names(name) values ('ちいかわ'), ('ナガノ'), ('空の作品')`);
const cid = async (n) => (await q(`select id from content_names where name = $1`, [n]))[0].id;
const C1 = await cid("ちいかわ");
const C2 = await cid("ナガノ");
const tag = async (name, category, contentId = null) =>
  (await q(`insert into tags(name, category, content_id) values ($1, $2, $3) returning id`, [name, category, contentId]))[0].id;
const T = {
  usagi1: await tag("うさぎ", "character", C1),
  usagi2: await tag("うさぎ", "character", C1), // 同じ作品の同名キャラタグ（まとめて 1 人）
  usagi3: await tag("うさぎ", "character", C2), // 別の作品の同名（別のキャラ）
  hachi: await tag("ハチワレ", "character", C1),
  lonely: await tag("ひとり", "character", C1), // グッズの無いキャラ
  noContent: await tag("名無し", "character", null),
  s1a: await tag("S1", "series", C1),
  s1b: await tag(" S1 ", "series", C2), // 前後の空白は同じシリーズ
  s2: await tag("S2", "series", C1),
  none: await tag("なし", "series", C1),
  blank: await tag("  ", "series", C1),
  badge: await tag("缶バッジ", "type"),
  acsta: await tag("アクスタ", "type"),
  noneType: await tag("なし", "type"),
  gacha: await tag("ガチャ", "source"),
  work: await tag("ちいかわ", "content"),
};

let n = 0;
const item = async ({ content = "ちいかわ", image, release = null, excluded = false, created = null } = {}) => {
  n += 1;
  const img = image === undefined ? `https://example.com/img/${n}.jpg` : image;
  return (
    await q(
      `insert into official_items(title, image, content_name, release_date, exclude_from_lists, created_at)
       values ($1, $2, $3, $4, $5, coalesce($6::timestamptz, now())) returning id`,
      [`item${n}`, img, content, release, excluded, created]
    )
  )[0].id;
};
const link = async (itemId, ...tagIds) => {
  for (const t of tagIds) await q(`insert into item_tags(official_item_id, tag_id) values ($1, $2)`, [itemId, t]);
};

const I = [];
// ちいかわ
I[0] = await item({ release: "2026-01-01" }); await link(I[0], T.usagi1, T.s1a, T.badge, T.work);
I[1] = await item({ release: "2026-02-01" }); await link(I[1], T.usagi1, T.usagi2, T.s1a, T.acsta); // 同じキャラの重複タグ → 1 件
I[2] = await item({ release: "2026-03-01" }); await link(I[2], T.usagi2, T.hachi, T.s2, T.badge, T.gacha);
I[3] = await item({ release: "2026-04-01" }); await link(I[3], T.hachi, T.none, T.blank, T.noneType); // 「なし」・空は数えない
I[4] = await item({ release: "2026-05-01", excluded: true }); await link(I[4], T.usagi1, T.s1a, T.badge); // 一覧から外した
I[5] = await item({ release: "2026-06-01" }); await link(I[5], T.usagi1, T.s1a); // あとで統合される
I[6] = await item({ release: "2026-07-01", image: "https://example.com/img/1.jpg" }); await link(I[6], T.hachi, T.s2); // 同じ画像
I[7] = await item({ release: null }); await link(I[7], T.usagi2, T.badge); // 発売日なし（表紙に出ない）
I[8] = await item({ release: "2026-08-01", image: "https://proj.supabase.co/storage/v1/object/public/x.jpg" }); await link(I[8], T.hachi);
I[9] = await item({ release: "2026-09-01", image: "/placeholder.svg" }); await link(I[9], T.acsta);
I[10] = await item({ release: "2026-10-01", image: "http://example.com/insecure.jpg" }); await link(I[10], T.s2, T.badge);
// ナガノ
I[11] = await item({ content: "ナガノ", release: "2025-01-01" }); await link(I[11], T.usagi3, T.s1b, T.badge);
I[12] = await item({ content: "ナガノ", release: "2025-02-01" }); await link(I[12], T.usagi3, T.acsta);
// 作品名なし・空
I[13] = await item({ content: null, release: "2025-03-01" }); await link(I[13], T.noContent, T.s1a, T.badge);
I[14] = await item({ content: "", release: "2025-04-01" }); await link(I[14], T.s2);
// 統合
await q(`update official_items set merged_into = $1 where id = $2`, [I[0], I[5]]);
// 既にサムネのある画像
await q(`insert into catalog_image_thumbs(src_hash, src_url, status) values (md5($1), $1, 'ok')`, [`https://example.com/img/3.jpg`]);

// 所持（U1 は統合済み・一覧から外したもの・別作品も持つ。同じグッズを 2 つ持つ）
for (const [u, it] of [
  [U1, I[0]], [U1, I[0]], [U1, I[2]], [U1, I[4]], [U1, I[5]], [U1, I[11]], [U1, I[13]],
  [U2, I[1]], [U2, I[3]], [U2, I[12]],
]) await q(`insert into user_items(user_id, official_item_id) values ($1, $2)`, [u, it]);

// ── 前の定義（old_）──
await db.exec(oldFunction("20261027235000_catalog_tag_counts.sql", "catalog_tag_counts"));
await db.exec(oldFunction("20261023210000_exclude_announcement_images.sql", "catalog_content_counts"));
await db.exec(oldFunction("20261023210000_exclude_announcement_images.sql", "catalog_content_covers"));
await db.exec(oldFunction("20261027230000_catalog_completion.sql", "get_catalog_completion"));
await db.exec(oldFunction("20261028000000_character_completion.sql", "get_character_completion"));
await db.exec(oldFunction("20261026120000_speed_up_progress_and_trade_partners.sql", "get_collection_progress"));
await db.exec(oldFunction("20261011710000_catalog_thumbs_retry_cap.sql", "claim_catalog_image_thumbs"));

// ── マイグレーション（2 回流しても壊れない）──
const migration = mig("20261028010000_catalog_perf.sql");
await db.exec(migration);
await db.exec(migration);

// ── 比べる道具 ──
const asUser = async (uid) => db.exec(`select set_config('test.uid', '${uid ?? ""}', false)`);
const canon = (rows) => rows.map((r) => JSON.stringify(r, (_k, v) => (typeof v === "bigint" ? Number(v) : v))).sort();
const same = async (label, newSql, oldSql, params = []) => {
  const a = await q(newSql, params);
  const b = await q(oldSql, params);
  assert.deepEqual(canon(a), canon(b), `${label}\n new: ${JSON.stringify(canon(a))}\n old: ${JSON.stringify(canon(b))}`);
  return a;
};

const CONTENTS = ["ちいかわ", "ナガノ", "空の作品", "無い作品", ""];
const CHAR_TAGS = [T.usagi1, T.usagi2, T.usagi3, T.hachi, T.lonely, T.noContent, T.s1a, "99999999-9999-4999-8999-999999999999"];

async function compareAll(stage) {
  for (const c of [null, ...CONTENTS]) {
    const rows = await same(`${stage} catalog_tag_counts(${c})`, `select * from catalog_tag_counts($1)`, `select * from old_catalog_tag_counts($1)`, [c]);
    // 並び順: 多い順
    for (let i = 1; i < rows.length; i++) assert.ok(Number(rows[i - 1].item_count) >= Number(rows[i].item_count));
  }
  await same(`${stage} catalog_content_counts`, `select * from catalog_content_counts()`, `select * from old_catalog_content_counts()`);
  for (const per of [null, 0, 1, 2, 3, 4, 9]) {
    await same(`${stage} catalog_content_covers(${per})`, `select * from catalog_content_covers($1)`, `select * from old_catalog_content_covers($1)`, [per]);
  }
  for (const uid of [U1, U2, null]) {
    await asUser(uid);
    for (const c of CONTENTS) {
      await same(`${stage} get_catalog_completion(${c}) uid=${uid}`, `select * from get_catalog_completion($1)`, `select * from old_get_catalog_completion($1)`, [c]);
    }
    for (const t of CHAR_TAGS) {
      await same(`${stage} get_character_completion(${t}) uid=${uid}`, `select * from get_character_completion($1)`, `select * from old_get_character_completion($1)`, [t]);
    }
    for (const target of [U1, U2, null]) {
      // 並び順も同じ（owned desc, total desc, label）
      const a = await q(`select * from get_collection_progress($1)`, [target]);
      const b = await q(`select * from old_get_collection_progress($1)`, [target]);
      assert.deepEqual(a, b, `${stage} get_collection_progress(${target}) uid=${uid}`);
    }
  }
  await asUser(null);
}

// 1) 作り置きの前（meta の行が無い）は、その場で数える＝前と同じ
await db.exec(`delete from catalog_cache_meta`);
await compareAll("作り置きの前");

// 2) 作り置きの後
await db.exec(`select refresh_catalog_caches()`);
assert.equal((await q(`select count(*)::int as n from catalog_cache_meta`))[0].n, 1);
await compareAll("作り置きの後");

// 作り置きの中身のいくつかを直接確かめる（同名キャラタグはまとめる・別作品の同名は別・統合／一覧外は数えない）
{
  const rows = await q(`select kind, label, total from catalog_character_total_cache where content_key = $1 and char_name = 'うさぎ' order by kind, label`, [C1]);
  assert.deepEqual(rows, [
    { kind: "series", label: "S1", total: 2 },
    { kind: "series", label: "S2", total: 1 },
    { kind: "type", label: "アクスタ", total: 1 },
    { kind: "type", label: "缶バッジ", total: 3 },
    { kind: "work", label: "うさぎ", total: 4 },
  ]);
  await asUser(U1);
  const mine = await q(`select kind, label, owned, total from get_character_completion($1) order by kind, label`, [T.usagi2]);
  assert.deepEqual(mine.find((r) => r.kind === "work"), { kind: "work", label: "うさぎ", owned: 2, total: 4 });
  await asUser(null);
  const guest = await q(`select owned from get_catalog_completion('ちいかわ')`);
  assert.ok(guest.length > 0 && guest.every((r) => r.owned === 0), "ゲストは 0");
}

// 3) ゲスト（anon）でも読める。書けない・作り直せない
{
  await db.exec(`set role anon`);
  const rows = await q(`select * from catalog_tag_counts('ちいかわ')`);
  assert.ok(rows.length > 0);
  assert.ok((await q(`select * from get_catalog_completion('ちいかわ')`)).length > 0);
  await assert.rejects(db.exec(`insert into catalog_tag_count_cache values ('x', gen_random_uuid(), 1)`));
  await db.exec(`reset role`);
  await db.exec(`set role anon`);
  await assert.rejects(db.exec(`select refresh_catalog_caches()`));
  await db.exec(`reset role`);
  await db.exec(`set role anon`);
  await assert.rejects(db.exec(`select * from catalog_image_thumb_pending`));
  await db.exec(`reset role`);
}

// 4) 作り置きの後に増えたグッズ・作品: 新しい作品はその場で数える（前と同じ）。既にある作品の数は次の作り置きまで前のまま
{
  const newWork = await item({ content: "新作", release: "2026-10-20" });
  await link(newWork, T.badge);
  await asUser(U1);
  await q(`insert into user_items(user_id, official_item_id) values ($1, $2)`, [U1, newWork]);
  await same("新作 tag counts", `select * from catalog_tag_counts('新作')`, `select * from old_catalog_tag_counts('新作')`);
  await same("新作 completion", `select * from get_catalog_completion('新作')`, `select * from old_get_catalog_completion('新作')`);
  // 新作のシリーズ（作品名）は作り置きに無いので、その場で数える
  assert.deepEqual(await q(`select * from get_collection_progress($1)`, [U1]), await q(`select * from old_get_collection_progress($1)`, [U1]));
  // 既にある作品に足したグッズは、作り置きまで数に入らない。所持数は総数を超えない
  const extra = await item({ release: "2026-10-21" });
  await link(extra, T.usagi1, T.badge);
  await q(`insert into user_items(user_id, official_item_id) values ($1, $2)`, [U1, extra]);
  const work = (await q(`select * from get_catalog_completion('ちいかわ') where kind = 'work'`))[0];
  const oldWork = (await q(`select * from old_get_catalog_completion('ちいかわ') where kind = 'work'`))[0];
  assert.equal(work.total, oldWork.total - 1, "作り置きの総数は 1 つ前のまま");
  assert.ok(work.owned <= work.total);
  await asUser(null);
  // 作り直すと同じになる
  await db.exec(`select refresh_catalog_caches()`);
  await compareAll("追加して作り直した後");
}

// ── サムネの待ち行列 ──
// 前の claim / cron が「全件をなめて」探していた画像の集まり
const oldUniverse = async () =>
  (
    await q(`
      select distinct md5(o.image) as h from official_items o
       where o.merged_into is null and o.image like 'https://%' and o.image not like '%/storage/v1/%'
         and not exists (select 1 from catalog_image_thumbs t where t.src_hash = md5(o.image))`)
  )
    .map((r) => r.h)
    .sort();
const pending = async () => (await q(`select src_hash as h from catalog_image_thumb_pending`)).map((r) => r.h).sort();
const md5 = async (s) => (await q(`select md5($1) as h`, [s]))[0].h;
const samePending = async (label) => assert.deepEqual(await pending(), await oldUniverse(), label);

await samePending("詰めた直後");
assert.ok(!(await pending()).includes(await md5("https://example.com/img/3.jpg")), "サムネのある画像は入らない");
assert.ok(!(await pending()).includes(await md5("http://example.com/insecure.jpg")), "https 以外は入らない");

// 追加 → 入る
const added = await item({ image: "https://example.com/new.jpg" });
assert.ok((await pending()).includes(await md5("https://example.com/new.jpg")), "追加したグッズの画像が入る");
await item({ image: "https://proj.supabase.co/storage/v1/object/public/y.jpg" });
await samePending("追加の後");

// 画像を変えた → 前の画像は外れ、新しい画像が入る
await q(`update official_items set image = 'https://example.com/new2.jpg' where id = $1`, [added]);
assert.ok(!(await pending()).includes(await md5("https://example.com/new.jpg")));
assert.ok((await pending()).includes(await md5("https://example.com/new2.jpg")));
await samePending("画像を変えた後");

// 統合 → 外れる。ただし同じ画像を使うグッズが残っていれば残る（img/1.jpg は I[0] と I[6]）
await q(`update official_items set merged_into = $1 where id = $2`, [I[1], added]);
assert.ok(!(await pending()).includes(await md5("https://example.com/new2.jpg")), "統合したら外れる");
await q(`update official_items set merged_into = $1 where id = $2`, [I[1], I[6]]);
assert.ok((await pending()).includes(await md5("https://example.com/img/1.jpg")), "同じ画像のグッズが残っていれば外さない");
await samePending("統合の後");
// 統合を戻す → また入る
await q(`update official_items set merged_into = null where id = $1`, [added]);
await samePending("統合を戻した後");

// 削除 → 外れる
const gone = await item({ image: "https://example.com/gone.jpg" });
await q(`delete from official_items where id = $1`, [gone]);
await samePending("削除の後");

// claim: 前と同じ形で返し、取った画像は待ち行列から消える。recentOnly は 2 時間以内だけ
{
  const old = await item({ image: "https://example.com/old.jpg", created: "2020-01-01T00:00:00Z" });
  assert.ok(old);
  const recent = await q(`select * from claim_catalog_image_thumbs(100, true)`);
  assert.ok(recent.length > 0);
  assert.ok(!recent.some((r) => r.src_url === "https://example.com/old.jpg"), "recentOnly は古い画像を取らない");
  assert.deepEqual(Object.keys(recent[0]).sort(), ["src_hash", "src_url"]);
  for (const r of recent) assert.equal(r.src_hash, await md5(r.src_url));
  await samePending("recentOnly の claim の後");
  const rest = await q(`select * from claim_catalog_image_thumbs(100, false)`);
  assert.ok(rest.some((r) => r.src_url === "https://example.com/old.jpg"));
  assert.deepEqual(await pending(), [], "全部取ったら空");
  await samePending("claim の後");
  // もう一度呼んでも二重に取らない
  assert.deepEqual(await q(`select * from claim_catalog_image_thumbs(100, false)`), []);
  // 並び順: 新しいグッズから（limit 1 で一番新しいもの）
  const a = await item({ image: "https://example.com/a.jpg", created: "2026-01-01T00:00:00Z" });
  const b = await item({ image: "https://example.com/b.jpg", created: "2026-02-01T00:00:00Z" });
  assert.ok(a && b);
  const first = await q(`select * from claim_catalog_image_thumbs(1, false)`);
  assert.deepEqual(first.map((r) => r.src_url), ["https://example.com/b.jpg"]);
  // 前の claim でも同じものを取る（a.jpg）
  const oldFirst = await q(`select * from old_claim_catalog_image_thumbs(1, false)`);
  assert.deepEqual(oldFirst.map((r) => r.src_url), ["https://example.com/a.jpg"]);
  await samePending("前の claim の後（トリガーは前の claim でも効く）");
}

// サムネの行を消した（作り直し）→ まだ使われていれば戻る
await q(`delete from catalog_image_thumbs where src_url = 'https://example.com/img/3.jpg'`);
assert.ok((await pending()).includes(await md5("https://example.com/img/3.jpg")));
await samePending("サムネの行を消した後");

// ── cron のコマンドの置き換え（マイグレーションの正規表現をそのまま使う）──
{
  const pat = migration.match(/pat constant text :=\s*'([^']+)'/)[1];
  const recentCmd = mig("20261016060411_catalog_thumbs_catch_up.sql").match(/\$cron\$([\s\S]*?)\$cron\$/)[1];
  const oldRecentOnly = mig("20261011600000_catalog_image_thumbs.sql").match(/\$cron\$([\s\S]*?)\$cron\$/)[1];
  const replace = async (cmd) =>
    (
      await q(
        `select regexp_replace($1, $2, case when substring($1 from $2) ~* 'interval\\s+''2 hours''' then 'exists (select 1 from public.catalog_image_thumb_pending p where p.created_at > now() - interval ''2 hours'')' else 'exists (select 1 from public.catalog_image_thumb_pending p)' end, 'gi') as c`,
        [cmd, pat]
      )
    )[0].c;
  const a = await replace(recentCmd);
  assert.ok(a.includes("exists (select 1 from public.catalog_image_thumb_pending p)"), a);
  assert.ok(!/md5\(\s*o\.image/i.test(a) && !/official_items/.test(a), a);
  assert.ok(a.includes("vault.decrypted_secrets where name = 'catalog_thumbs_cron_secret'"), "合言葉は名前で引いたまま");
  assert.ok(a.includes("from generate_series(1, 3)") && a.includes('"recentOnly": false'));
  const b = await replace(oldRecentOnly);
  assert.ok(b.includes("p.created_at > now() - interval '2 hours'"), b);
  assert.ok(!/official_items/.test(b), b);
  // 失敗のやり直しの条件が続く形（retry ジョブの想定）でも、待ち行列の部分だけを置き換える
  const retryLike = recentCmd.replace(
    /\);\s*$/,
    ") or exists (select 1 from public.catalog_image_thumbs t where t.status = 'failed' and t.attempts < 3 and t.updated_at < now() - interval '6 hours');\n"
  );
  const c = await replace(retryLike);
  assert.ok(c.includes("catalog_image_thumb_pending") && c.includes("t.status = 'failed'") && !/official_items/.test(c), c);
}

// 作り直しは 2 回目以降、変わらない行を書き換えない（行の版が変わらない）
{
  await db.exec(`select refresh_catalog_caches()`); // 上のテストで統合などをしたので、まず追いつかせる
  await compareAll("サムネのテストの後");
  const before = await q(`select xmin::text as x from catalog_tag_count_cache order by content_name, tag_id`);
  await db.exec(`select refresh_catalog_caches()`);
  const after = await q(`select xmin::text as x from catalog_tag_count_cache order by content_name, tag_id`);
  assert.deepEqual(after, before);
}

console.log("test-catalog-perf: ok");
