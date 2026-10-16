-- カタログ画像のサムネ作り: 一度に大量に登録されたグッズのサムネが、作られないまま残るのを直す
--
-- 【なぜ】
-- catalog-thumbs-recent は「最近 2 時間に登録されたグッズ」だけを、10 分ごとに 10 枚ずつ作っていた（2 時間で最大 120 枚）。
-- 2026-10-13 に雑誌など 162 件を一度に登録したとき、2 時間のうちに 75 件しか作れず、残りの 87 件は
-- 2 時間を過ぎて対象から外れ、2 日たってもサムネが無いままだった（画面は毎回 proxy-image 経由の原寸に戻っていた）。
--
-- 【どうする】
-- 登録からの時間で区切らず、サムネの無いグッズがあれば作る（新しいグッズから先に作るのは claim_catalog_image_thumbs の並び順のまま）。
-- 1 回に 3 本呼ぶ（取り合いは claim 側の advisory lock で起きない。backfill のときは 4〜6 本でも上限に当たらなかった）。
-- 作るものが無いときは関数を呼ばない。
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
    body := '{"limit": 10, "recentOnly": false}'::jsonb,
    timeout_milliseconds := 150000
  )
  from generate_series(1, 3)
  where exists (
    select 1
      from public.official_items o
     where o.merged_into is null
       and o.image like 'https://%'
       and o.image not like '%/storage/v1/%'
       and not exists (select 1 from public.catalog_image_thumbs t where t.src_hash = md5(o.image))
  );
  $cron$
);
