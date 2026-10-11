-- 「データの読み込みに失敗しました」（時間切れ）の原因になっていた2つの重い処理を軽くする。
--
-- 1) get_collection_progress（コンプ進捗）: 毎回カタログ全体（約5.6万件＋シリーズタグ）を
--    UNION で並べ直して全作品の総数を数えていた（約5秒。ログインユーザーの上限 8 秒の手前で、時々時間切れ）。
--    自分が持っているグッズの作品・シリーズだけを先に決めて、その総数だけを索引で数える。
-- 2) search_official_items: 1文字（「ミ」など）の検索は、ほぼ全件に当たって数え直すため 3 秒近くかかっていた。
--    合わせて2文字未満の言葉では検索しない（アプリ側も2文字から検索する）。

create index if not exists official_items_series_key_idx
  on public.official_items (lower(btrim(content_name)))
  where merged_into is null;

create index if not exists tags_series_key_idx
  on public.tags (lower(btrim(name)))
  where category = 'series';

create or replace function public.get_collection_progress(_user_id uuid default null)
returns table(series_label text, owned integer, total integer, last_added_at timestamptz, cover_image text)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  target uuid := coalesce(_user_id, auth.uid());
begin
  if target is null or not public.can_view_collection(target) then
    return;
  end if;

  return query
  with my as (
    -- 自分の持っているカタログのグッズ（統合済みのものは数えない）
    select ui.official_item_id, ui.created_at, coalesce(ui.image, oi.image) as img, oi.content_name
      from public.user_items ui
      join public.official_items oi on oi.id = ui.official_item_id
     where ui.user_id = target
       and oi.merged_into is null
  ),
  my_series as (
    -- 作品名（content_name）とシリーズタグの両方を「シリーズ」とみなす（official_item_series と同じ考え方）
    select m.official_item_id, btrim(m.content_name) as label, lower(btrim(m.content_name)) as key, m.created_at, m.img
      from my m
     where m.content_name is not null and btrim(m.content_name) not in ('', 'なし')
    union
    select m.official_item_id, btrim(t.name), lower(btrim(t.name)), m.created_at, m.img
      from my m
      join public.item_tags it on it.official_item_id = m.official_item_id
      join public.tags t on t.id = it.tag_id and t.category = 'series'
     where t.name is not null and btrim(t.name) not in ('', 'なし')
  ),
  keys as (
    select distinct ms.key from my_series ms
  ),
  totals as (
    -- 自分に関係のあるシリーズだけ、カタログ全体での数を数える（索引で引ける）
    select x.key, min(x.label) as label, count(distinct x.id)::integer as total
      from (
        select oi.id, btrim(oi.content_name) as label, lower(btrim(oi.content_name)) as key
          from public.official_items oi
         where oi.merged_into is null
           and lower(btrim(oi.content_name)) in (select k.key from keys k)
        union
        select oi.id, btrim(t.name), lower(btrim(t.name))
          from public.tags t
          join public.item_tags it on it.tag_id = t.id
          join public.official_items oi on oi.id = it.official_item_id and oi.merged_into is null
         where t.category = 'series'
           and lower(btrim(t.name)) in (select k.key from keys k)
      ) x
     group by x.key
  ),
  mine as (
    select ms.key,
           count(distinct ms.official_item_id)::integer as owned,
           max(ms.created_at) as last_added_at,
           (array_agg(ms.img order by ms.created_at desc) filter (where ms.img is not null))[1] as cover_image
      from my_series ms
     group by ms.key
  )
  select t.label, m.owned, greatest(t.total, m.owned), m.last_added_at, m.cover_image
    from mine m
    join totals t on t.key = m.key
   order by m.owned desc, t.total desc, t.label;
end;
$function$;

create or replace function public.search_official_items(_q text, _limit integer default 200, _offset integer default 0)
returns table(id uuid, total bigint)
language plpgsql
stable security definer
set search_path to 'public', 'extensions'
as $function$
declare
  _nq text := public.search_norm(_q);
  _tokens text[];
  _t text;
  _exact text := '';
  _fuzzy text := '';
  _score text := '0';
  _like text;
  _cnt bigint;
begin
  select coalesce(array_agg(replace(tk, ' ', '')), array[]::text[]) into _tokens
    from (select tk from unnest(string_to_array(_nq, ' ')) as tk where tk <> '' limit 6) s;
  if array_length(_tokens, 1) is null then return; end if;
  -- 1文字だけの言葉は、ほぼ全件に当たって数え直しが重く、時間切れになっていた。2文字から探す
  if char_length(array_to_string(_tokens, '')) < 2 then return; end if;

  foreach _t in array _tokens loop
    _like := '%' || replace(replace(replace(_t, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    _exact := _exact || format(' AND o.search_text LIKE %L', _like);
    if char_length(_t) >= 3 then
      _fuzzy := _fuzzy || format(' AND (o.search_text LIKE %L OR %L <%% o.search_text)', _like, _t);
      _score := _score || format(' + word_similarity(%L, o.search_text)', _t);
    else
      _fuzzy := _fuzzy || format(' AND o.search_text LIKE %L', _like);
    end if;
  end loop;

  -- まず、含む（表記ゆれは正規化済み）で探す。少なければ、打ち間違いも許して探し直す
  execute 'SELECT count(*) FROM public.official_items o WHERE o.merged_into IS NULL' || _exact into _cnt;
  if _cnt >= 8 then
    return query execute
      'SELECT o.id, count(*) OVER () FROM public.official_items o WHERE o.merged_into IS NULL' || _exact ||
      ' ORDER BY o.release_date DESC, o.created_at DESC, o.id LIMIT $1 OFFSET $2'
      using _limit, _offset;
  else
    perform set_config('pg_trgm.word_similarity_threshold', '0.5', true);
    return query execute
      'SELECT o.id, count(*) OVER () FROM public.official_items o WHERE o.merged_into IS NULL' || _fuzzy ||
      ' ORDER BY (' || _score || ') DESC, o.release_date DESC, o.created_at DESC, o.id LIMIT $1 OFFSET $2'
      using _limit, _offset;
  end if;
end $function$;
