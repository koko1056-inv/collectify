-- コンプの「小さな的」を1回で返す RPC。
--
-- いまアプリは、この RPC が無いので、的ごとに REST で件数だけを数えている（src/hooks/useCollectionTargets.ts）。
-- キャラ・キャラ×種類・シリーズ×キャラの候補が十数個あると、十数回の HEAD リクエスト（それぞれ 0.3〜1.3 秒）になる。
-- これを適用すると、コレクション画面を開いたときの問い合わせが1回になり、「あと1個」の足りないグッズも一緒に返る。
-- アプリは何も変えなくてよい（RPC があればそれを使い、無ければ REST で数える作りにしてある）。
--
-- 返すもの（1行 = 1つの的）:
--   kind       'series' | 'character' | 'character_type' | 'series_character'
--   series / character / type   的の名前（表示用。持っているグッズに付いているタグ名）
--   owned      持っている数（公式グッズの種類数。数量は数えない）
--   total      カタログ全体での数（統合済みのグッズは数えない）
--   cover_image 持っているグッズのうち最新の写真
--   missing    残りが1〜2個で、分母が60個以下のときだけ、持っていないグッズ（id, title, image）
-- 作品（content_name）とシリーズの進捗は、これまでどおり get_collection_progress が返す（ここでは返さない）。
-- 候補はアプリの buildTargets と同じ上限（キャラ6・キャラ×種類8・シリーズ×キャラ4）＋ 目標（collection_goals）。
-- 先に 20261016100000_collection_goals.sql を適用しておくこと。

-- タグを「種類＋名前（小文字）」で引くための索引（シリーズだけは tags_series_key_idx が既にある）
create index if not exists tags_category_key_idx
  on public.tags (category, lower(btrim(name)));

-- 的に入っている公式グッズ。タグ1つ（シリーズ・キャラ）か、2つの組み合わせ（キャラ×種類・シリーズ×キャラ）
create or replace function public.collection_target_members(_c1 text, _k1 text, _c2 text default null, _k2 text default null)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $function$
  select distinct it1.official_item_id
    from public.tags t1
    join public.item_tags it1 on it1.tag_id = t1.id
    join public.official_items oi on oi.id = it1.official_item_id and oi.merged_into is null
   where t1.category = _c1
     and lower(btrim(t1.name)) = _k1
     and (
       _k2 is null
       or exists (
         select 1
           from public.item_tags it2
           join public.tags t2 on t2.id = it2.tag_id
          where it2.official_item_id = it1.official_item_id
            and t2.category = _c2
            and lower(btrim(t2.name)) = _k2
       )
     );
$function$;

-- 中で使うだけ。外から呼ばせない
revoke all on function public.collection_target_members(text, text, text, text) from public, anon, authenticated;

create or replace function public.get_collection_targets(_user_id uuid default null)
returns table(
  kind text,
  work text,
  series text,
  "character" text,
  type text,
  owned integer,
  total integer,
  cover_image text,
  missing jsonb
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  target uuid := coalesce(_user_id, auth.uid());
begin
  -- 見せてはいけない相手の棚なら何も返さない（get_collection_progress と同じ判定）
  if target is null or not public.can_view_collection(target) then
    return;
  end if;

  return query
  with my as (
    -- 持っている公式グッズ（統合済みは数えない）。同じグッズを2行持っていても1つ
    select distinct on (ui.official_item_id)
           ui.official_item_id as oid,
           ui.created_at,
           coalesce(nullif(ui.image, ''), oi.image) as img
      from public.user_items ui
      join public.official_items oi on oi.id = ui.official_item_id and oi.merged_into is null
     where ui.user_id = target
     order by ui.official_item_id, ui.created_at desc
  ),
  my_tags as (
    select m.oid, t.category, btrim(t.name) as name, lower(btrim(t.name)) as k
      from my m
      join public.item_tags it on it.official_item_id = m.oid
      join public.tags t on t.id = it.tag_id
     where t.category in ('series', 'character', 'type')
       and t.name is not null
       and btrim(t.name) not in ('', 'なし')
  ),
  cand as (
    -- シリーズ（すべて。分母はたいてい小さい）
    select 'series'::text as kd, 'series'::text as c1, s.k as k1, null::text as c2, null::text as k2,
           min(s.name) as n1, null::text as n2, count(distinct s.oid) as score
      from my_tags s
     where s.category = 'series'
     group by s.k
    union all
    -- キャラ（持っている数の多い6つ）
    (select 'character', 'character', c.k, null, null, min(c.name), null, count(distinct c.oid)
       from my_tags c
      where c.category = 'character'
      group by c.k
      order by count(distinct c.oid) desc, c.k
      limit 6)
    union all
    -- キャラ×種類（例: ハチワレのアクリルスタンド。8つ）
    (select 'character_type', 'character', c.k, 'type', ty.k, min(c.name), min(ty.name), count(distinct c.oid)
       from my_tags c
       join my_tags ty on ty.oid = c.oid and ty.category = 'type'
      where c.category = 'character'
      group by c.k, ty.k
      order by count(distinct c.oid) desc, c.k, ty.k
      limit 8)
    union all
    -- シリーズ×キャラ（4つ）
    (select 'series_character', 'series', s.k, 'character', c.k, min(s.name), min(c.name), count(distinct s.oid)
       from my_tags s
       join my_tags c on c.oid = s.oid and c.category = 'character'
      where s.category = 'series'
      group by s.k, c.k
      order by count(distinct s.oid) desc, s.k, c.k
      limit 4)
    union all
    -- 目標（持っている数が 0 になっていても出す）
    select g.kind,
           case when g.kind in ('series', 'series_character') then 'series' else 'character' end,
           lower(btrim(case when g.kind in ('series', 'series_character') then g.series else g."character" end)),
           case g.kind when 'character_type' then 'type' when 'series_character' then 'character' end,
           lower(btrim(case g.kind when 'character_type' then g.type when 'series_character' then g."character" end)),
           btrim(case when g.kind in ('series', 'series_character') then g.series else g."character" end),
           btrim(case g.kind when 'character_type' then g.type when 'series_character' then g."character" end),
           -1
      from public.collection_goals g
     where g.user_id = target
       and target = auth.uid()
  ),
  dedup as (
    -- 自動の候補と目標が重なったら1つに（名前は持っているグッズのタグ名を優先）
    select distinct on (c.kd, c.k1, coalesce(c.k2, '')) c.*
      from cand c
     order by c.kd, c.k1, coalesce(c.k2, ''), c.score desc
  )
  select d.kd,
         null::text,
         case when d.c1 = 'series' then d.n1 end,
         case when d.c1 = 'character' then d.n1 when d.c2 = 'character' then d.n2 end,
         case when d.c2 = 'type' then d.n2 end,
         o.owned_n,
         greatest(tt.total_n, o.owned_n),
         o.cover,
         ms.items
    from dedup d
    cross join lateral (
      select count(*)::integer as total_n
        from public.collection_target_members(d.c1, d.k1, d.c2, d.k2) x
    ) tt
    cross join lateral (
      select count(*)::integer as owned_n,
             (array_agg(m.img order by m.created_at desc) filter (where m.img is not null))[1] as cover
        from public.collection_target_members(d.c1, d.k1, d.c2, d.k2) x
        join my m on m.oid = x
    ) o
    left join lateral (
      -- あと1〜2個で、分母も小さいときだけ、足りないグッズを返す（多いと重く、画面にも出しきれない）
      select jsonb_agg(jsonb_build_object('id', oi.id, 'title', oi.title, 'image', oi.image)
                       order by oi.release_date desc nulls last, oi.id) as items
        from public.collection_target_members(d.c1, d.k1, d.c2, d.k2) x
        join public.official_items oi on oi.id = x
       where tt.total_n - o.owned_n between 1 and 2
         and tt.total_n <= 60
         and not exists (select 1 from my m where m.oid = x)
    ) ms on true
   where tt.total_n > 0 or d.score = -1;
end;
$function$;

grant execute on function public.get_collection_targets(uuid) to authenticated;
