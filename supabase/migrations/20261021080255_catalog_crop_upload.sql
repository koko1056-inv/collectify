-- オフラインで切り出したカタログ画像を、公開バケット kuji_images に取り込む
--
-- 【なぜ】
-- 画像の切り出し（クロップ）作業はオフラインの端末で行う。そこから Supabase に
-- 置くには、サービスロールキーをその端末に渡すしかなかったが、鍵が外に出るのは避けたい。
--
-- 【どうする】
-- 切り出した本人（または取り込みスクリプト）が、まず catalog_upload_staging に
-- 「置きたいパスと、base64 にした画像データ」を1行ずつ入れる（service_role のみ書ける
-- テーブルなので、実際には SQL エディタや service_role 経由で入れる）。
-- その後 run_catalog_crop_upload を呼ぶと、Edge Function（catalog-crop-upload）が
-- 溜まった行を取り、パス・種類・サイズ・先頭バイト（マジックナンバー）を検査し直してから
-- kuji_images に upload する。service_role キー自体は Edge Function の中（Supabase の中）
-- にしか無く、呼び出し側（オフライン端末）には一切渡らない。
--
-- 本番の schema_migrations.version は 20261021080255（name: catalog_crop_upload）。
-- このファイルはその適用済み SQL と同じ内容。再適用しても合言葉は作り直さない。

create table if not exists public.catalog_upload_staging (
  id bigserial primary key,
  path text not null,
  content_type text not null,
  data_b64 text,
  bytes int,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  constraint catalog_upload_staging_path_check
    check (path ~ '^catalog-crops/[A-Za-z0-9._/-]+\.(jpg|png|webp)$'),
  constraint catalog_upload_staging_path_no_dotdot check (path !~ '\.\.'),
  constraint catalog_upload_staging_path_no_double_slash check (path !~ '//'),
  constraint catalog_upload_staging_content_type_check
    check (content_type in ('image/jpeg', 'image/png', 'image/webp'))
);

create index if not exists catalog_upload_staging_status_idx
  on public.catalog_upload_staging (status, created_at);

-- service_role だけが読み書きする。画面（anon/authenticated）からは触らない
alter table public.catalog_upload_staging enable row level security;
revoke all on public.catalog_upload_staging from anon, authenticated;

-- ─── 関数を叩くための合言葉 ───
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'catalog_crop_upload_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'catalog_crop_upload_secret',
      'catalog-crop-upload 関数をオフライン端末から呼ぶための合言葉'
    );
  end if;
end;
$$;

create or replace function public.catalog_crop_upload_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(length(p_secret), 0) >= 32
     and exists (
       select 1 from vault.decrypted_secrets
        where name = 'catalog_crop_upload_secret' and decrypted_secret = p_secret
     );
$$;

revoke all on function public.catalog_crop_upload_secret_ok(text) from public, anon, authenticated;
grant execute on function public.catalog_crop_upload_secret_ok(text) to service_role;

-- ─── SQL エディタ / service_role から呼ぶ取り込みの実行 ───
-- 呼び出し側（オフライン端末・人）は catalog_upload_staging に行を入れたあと、
-- SQL エディタで select public.run_catalog_crop_upload(); を実行するだけでよい。
-- 合言葉は vault から読むので、呼び出し側は何の鍵も持たずに済む。
create or replace function public.run_catalog_crop_upload(p_limit int default 20)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id bigint;
begin
  select net.http_post(
    url := 'https://dmgrgzysrzzgsajwqyrh.supabase.co/functions/v1/catalog-crop-upload',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-upload-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'catalog_crop_upload_secret')
    ),
    body := jsonb_build_object('limit', p_limit),
    timeout_milliseconds := 120000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.run_catalog_crop_upload(int) from public, anon, authenticated;
grant execute on function public.run_catalog_crop_upload(int) to service_role;
