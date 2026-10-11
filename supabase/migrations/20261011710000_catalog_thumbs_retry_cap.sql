-- カタログ画像のサムネ作り: 重すぎて関数ごと落ちる画像を、10分ごとに取り直し続けていたのを止める。
-- ・3回取っても終わらなかった画像は failed にして、もう取らない
-- ・途中で止まった画像のやり直しは1件ずつ（巻き添えで他の画像まで止まらないように）
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

  -- 3回取っても作り終わらなかった（関数ごと CPU・メモリの上限で落ちた）画像は、もう取らない。
  -- 以前はここに上限が無く、重すぎる画像を10分ごとに取り直しては落ち続けていた。
  update public.catalog_image_thumbs t
     set status = 'failed', updated_at = now()
   where t.status = 'processing'
     and t.claimed_at < now() - interval '15 minutes'
     and t.attempts >= 3;

  return query
  with stalled as (
    -- 途中で止まった取得（15分以上前）は1件ずつやり直す。
    -- 重すぎて関数ごと落ちる画像が混ざると、同じ回の他の画像まで巻き添えで止まるため
    select t.src_hash, t.src_url
      from public.catalog_image_thumbs t
     where t.status = 'processing' and t.claimed_at < now() - interval '15 minutes' and t.attempts < 3
     order by t.updated_at
     limit 1
  ),
  retry as (
    -- 一時的な失敗（6時間以上前・3回まで）をやり直す
    select * from stalled
    union all
    select t.src_hash, t.src_url
      from public.catalog_image_thumbs t
     where t.status = 'failed' and t.attempts < 3 and t.updated_at < now() - interval '6 hours'
       and not exists (select 1 from stalled)
     order by 1
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
    -- 止まった画像をやり直す回は、その1件だけにする
    select * from fresh where not exists (select 1 from stalled)
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
   where (t.status = 'processing' and t.claimed_at < now() - interval '15 minutes' and t.attempts < 3)
      or (t.status = 'failed' and t.attempts < 3 and t.updated_at < now() - interval '6 hours')
  returning t.src_hash, t.src_url;
end;
$$;
