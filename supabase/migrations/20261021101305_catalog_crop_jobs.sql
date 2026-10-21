-- crop モード（catalog-crop-upload の mode: "crop"）のジョブ待ち行列。
--
-- 【なぜ】
-- 既存の catalog_upload_staging はオフラインで切り出し済みの画像（base64）を取り込むだけだった。
-- ここでは、元画像のURL（Shopify CDN）と切り出し範囲だけを渡して、切り出し・パディング・
-- リサイズをサーバー側（Edge Function）で行う。official_items は一切更新しない。
--
-- 【どうする】
-- batch 単位で catalog_crop_jobs に行を入れ、run_catalog_crop_jobs(batch, limit) を呼ぶと、
-- Edge Function（catalog-crop-upload, mode: "crop"）が pending の行を拾って running にし、
-- 1件ずつ処理して done/failed を書き戻す。

create table if not exists public.catalog_crop_jobs (
  id bigserial primary key,
  batch text not null,
  official_item_id uuid not null,
  source_url text not null,
  crop_x int not null,
  crop_y int not null,
  crop_w int not null,
  crop_h int not null,
  pad_color text not null default '#ffffff',
  dest_path text not null,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  constraint catalog_crop_jobs_crop_x_check check (crop_x >= 0),
  constraint catalog_crop_jobs_crop_y_check check (crop_y >= 0),
  constraint catalog_crop_jobs_crop_w_check check (crop_w > 0),
  constraint catalog_crop_jobs_crop_h_check check (crop_h > 0),
  constraint catalog_crop_jobs_pad_color_check check (pad_color ~ '^#[0-9a-f]{6}$'),
  constraint catalog_crop_jobs_dest_path_check
    check (dest_path ~ '^catalog-crops/[A-Za-z0-9._/-]+\.jpg$'),
  constraint catalog_crop_jobs_dest_path_no_dotdot check (dest_path !~ '\.\.'),
  constraint catalog_crop_jobs_dest_path_no_double_slash check (dest_path !~ '//'),
  constraint catalog_crop_jobs_status_check check (status in ('pending', 'running', 'done', 'failed')),
  constraint catalog_crop_jobs_dest_path_unique unique (dest_path)
);

create index if not exists catalog_crop_jobs_status_idx
  on public.catalog_crop_jobs (status, batch, created_at);

-- service_role だけが読み書きする。画面（anon/authenticated）からは触らない
alter table public.catalog_crop_jobs enable row level security;
revoke all on public.catalog_crop_jobs from anon, authenticated;

-- ─── SQL エディタ / service_role から呼ぶ crop 実行 ───
-- 合言葉は既存の catalog_crop_upload_secret を使い回す（run_catalog_crop_upload と同じ関数が
-- mode: "crop" のときは crop ジョブを処理する）。
create or replace function public.run_catalog_crop_jobs(p_batch text, p_limit int default 10)
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
    body := jsonb_build_object('mode', 'crop', 'batch', p_batch, 'limit', p_limit),
    timeout_milliseconds := 120000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.run_catalog_crop_jobs(text, int) from public, anon, authenticated;
grant execute on function public.run_catalog_crop_jobs(text, int) to service_role;
