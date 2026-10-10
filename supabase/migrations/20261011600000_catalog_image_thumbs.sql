-- カタログ画像のサムネイル（サーバー側で縮小した WebP）
--
-- 【なぜ】
-- official_items.image の大半は外部サイトの画像URL（cdn.shopify.com, shop.nijisanji.jp など）で、
-- 一覧ではそれを Edge Function の proxy-image 経由で表示していた。
-- 計測すると、proxy-image は Supabase の CDN に一切キャッシュされず（cf-cache-status: DYNAMIC）、
-- 毎回「関数の起動 → 外部サイトから原寸画像を取得 → そのまま返す」になっていた。
-- 一覧の 150px 程度のマスに 1000〜2000px・100KB〜1.2MB の原寸画像を、1枚 1.3〜2.6 秒かけて取っていた。
--
-- 【どうする】
-- catalog-thumbs 関数が外部画像を一度だけ取りに行き、480px 以内の WebP に縮めて
-- 公開バケット catalog-thumbs に置く。パスは「元URLの md5」で決まるので、
-- 画面側は DB を引かずに URL からサムネのURLを計算できる（src/utils/optimized-image.ts）。
-- 置いたサムネは Storage の CDN から長期キャッシュつきで配信される。
-- サムネがまだ無い・作れなかった画像は、画面側が onError で従来の経路に戻す。
--
-- 画像変換（/render/image）は「変換した元画像の枚数」で課金されるので、
-- 5.6 万枚を毎回変換させるより、縮めた実体を置いて /object/public で配るほうが安い。

-- ─── 置き場所 ───
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-thumbs', 'catalog-thumbs', true, 1048576, array['image/webp'])
on conflict (id) do nothing;

-- ─── 進み具合の記録（1つの元URLにつき1行） ───
create table if not exists public.catalog_image_thumbs (
  -- 元URL（official_items.image の文字列そのまま）の md5。サムネのパスにも使う
  src_hash text primary key,
  src_url text not null,
  -- processing: 取得中 / ok: 置いた / failed: 作れなかった
  status text not null default 'processing' check (status in ('processing', 'ok', 'failed')),
  width int,
  height int,
  bytes int,
  orig_bytes int,
  error text,
  attempts int not null default 0,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_image_thumbs_status_idx
  on public.catalog_image_thumbs (status, updated_at);

-- 関数（service_role）だけが読み書きする。画面からは触らない
alter table public.catalog_image_thumbs enable row level security;
revoke all on public.catalog_image_thumbs from anon, authenticated;

-- ─── 次に処理する画像を取る（同時に呼ばれても同じ画像を二重に取らない） ───
-- p_recent_only = true のときは、最近（2時間以内）追加されたカタログだけを見る。
-- 新しく登録されたグッズのサムネを作る定期実行はこちら。全件の作成は false で呼ぶ。
-- （一括取り込みで1時間に数千件増えることがあり、追いつかない分は全件の作成のほうで拾う）
create or replace function public.claim_catalog_image_thumbs(
  p_limit int default 10,
  p_recent_only boolean default false
)
returns table (src_hash text, src_url text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_limit int := least(greatest(coalesce(p_limit, 10), 1), 100);
begin
  -- 並列に呼ばれたとき、全員が同じ「次の N 件」を選んで取り合い、1人以外が 0 件になる。
  -- 取る処理だけを順番にして、後の呼び出しには前の呼び出しが取った残りから選ばせる。
  perform pg_advisory_xact_lock(hashtext('claim_catalog_image_thumbs'));

  return query
  with retry as (
    -- 途中で止まった取得（15分以上前）と、一時的な失敗（6時間以上前・3回まで）をやり直す
    select t.src_hash, t.src_url
      from public.catalog_image_thumbs t
     where (t.status = 'processing' and t.claimed_at < now() - interval '15 minutes')
        or (t.status = 'failed' and t.attempts < 3 and t.updated_at < now() - interval '6 hours')
     order by t.updated_at
     limit v_limit
  ),
  fresh as (
    -- 同じ画像を使うグッズが同じ回に2件入ると on conflict が同じ行を2回更新して失敗するので重複を落とす
    select distinct on (x.src_hash) x.src_hash, x.src_url
      from (
        select md5(o.image) as src_hash, o.image as src_url
          from public.official_items o
         where o.merged_into is null
           and o.image like 'https://%'
           -- 自前の Storage の画像は画像変換で縮められるので対象外（proxy-image 経由のURLは対象）
           and o.image not like '%/storage/v1/%'
           and (not p_recent_only or o.created_at > now() - interval '2 hours')
           and not exists (
             select 1 from public.catalog_image_thumbs t where t.src_hash = md5(o.image)
           )
         -- 新しいグッズほどよく見られるので先に作る（idx_official_items_not_merged で先頭から読める）
         order by o.created_at desc
         limit v_limit
      ) x
  ),
  picked as (
    select * from retry
    union
    select * from fresh
    limit v_limit
  )
  insert into public.catalog_image_thumbs as t (src_hash, src_url, status, claimed_at, attempts, updated_at)
  select p.src_hash, p.src_url, 'processing', now(), 1, now()
    from picked p
  on conflict on constraint catalog_image_thumbs_pkey do update
     set status = 'processing',
         claimed_at = now(),
         attempts = t.attempts + 1,
         updated_at = now()
   -- 別の呼び出しが取ったばかりの行や、作り終えた行は横取りしない
   where (t.status = 'processing' and t.claimed_at < now() - interval '15 minutes')
      or (t.status = 'failed' and t.attempts < 3 and t.updated_at < now() - interval '6 hours')
  returning t.src_hash, t.src_url;
end;
$$;

revoke all on function public.claim_catalog_image_thumbs(int, boolean) from public, anon, authenticated;
grant execute on function public.claim_catalog_image_thumbs(int, boolean) to service_role;

-- ─── 定期実行から関数を呼ぶための合言葉 ───
-- 関数は誰でも叩ける URL なので、cron からの呼び出しはこの合言葉で見分ける（管理者のログインでも可）。
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'catalog_thumbs_cron_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'catalog_thumbs_cron_secret',
      'catalog-thumbs 関数を cron から呼ぶための合言葉'
    );
  end if;
end;
$$;

create or replace function public.catalog_thumbs_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(length(p_secret), 0) >= 32
     and exists (
       select 1 from vault.decrypted_secrets
        where name = 'catalog_thumbs_cron_secret' and decrypted_secret = p_secret
     );
$$;

revoke all on function public.catalog_thumbs_secret_ok(text) from public, anon, authenticated;
grant execute on function public.catalog_thumbs_secret_ok(text) to service_role;

-- ─── 新しく登録されたグッズのサムネを作る定期実行（10分ごと） ───
-- 作るものが無いときは関数を呼ばない（呼び出し回数を増やさない）。
-- 既存の全件（約5.6万件）の作成はここでは始めない。始め方は
-- supabase/functions/catalog-thumbs/index.ts の先頭コメントを参照。
do $$
begin
  if exists (select 1 from cron.job where jobname = 'catalog-thumbs-recent') then
    perform cron.unschedule('catalog-thumbs-recent');
  end if;
end;
$$;

select cron.schedule(
  'catalog-thumbs-recent',
  '*/10 * * * *',
  $cron$
  select net.http_post(
    url := 'https://dmgrgzysrzzgsajwqyrh.supabase.co/functions/v1/catalog-thumbs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'catalog_thumbs_cron_secret')
    ),
    body := '{"limit": 10, "recentOnly": true}'::jsonb,
    timeout_milliseconds := 150000
  )
  where exists (
    select 1
      from public.official_items o
     where o.created_at > now() - interval '2 hours'
       and o.image like 'https://%'
       and o.image not like '%/storage/v1/%'
       and o.merged_into is null
       and not exists (select 1 from public.catalog_image_thumbs t where t.src_hash = md5(o.image))
  );
  $cron$
);
