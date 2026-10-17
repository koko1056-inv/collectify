-- 実績バッジ（Duolingo の実績にならう）。
--
-- バッジの段階（いくつで何段目か）と絵はアプリが持ち、ここは「いまの数」だけを返す。
-- 新しい記録の仕組みは足さず、いまある表から数える（あとから段階を変えても、過去の分まで正しく出る）。
--   items        持っているグッズの種類数（公式グッズ。数量は数えない）
--   completions  コンプした作品・シリーズの数（user_completions。2026-10-17 から記録）
--   best_streak  ポッケリングのいちばん長い連続（daily_rings。お休みの日も続いた日に数える）
--   trades       成立した交換の数（相手側でも）
--   posts        投稿の数（グッズの投稿・思い出の投稿）
--   photos       推しフォトの数
--   oshi_level   推しグッズのなかよし度のいちばん高いレベル
--   series       持っているグッズのシリーズの数（図鑑のページ数）
-- 人のプロフィールでも、見てよい相手（can_view_collection）なら見られる。

create or replace function public.get_badge_stats(_user_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  target uuid := coalesce(_user_id, auth.uid());
begin
  if target is null or not public.can_view_collection(target) then
    return null;
  end if;

  return jsonb_build_object(
    'items', (select count(distinct coalesce(official_item_id, id)) from public.user_items where user_id = target),
    'completions', (select count(*) from public.user_completions where user_id = target),
    'best_streak', (
      select coalesce(max(n), 0) from (
        select count(*) as n
          from (
            select day, day - (row_number() over (order by day))::integer as grp
              from public.daily_rings
             where user_id = target and (collect or care or social or frozen)
          ) d
         group by grp
      ) s
    ),
    'trades', (
      select count(*) from public.trade_requests
       where status = 'completed' and (sender_id = target or receiver_id = target)
    ),
    'posts', (
      (select count(*) from public.item_posts where user_id = target and not coalesce(is_hidden, false))
      + (select count(*) from public.goods_posts where user_id = target and not coalesce(is_hidden, false))
    ),
    'photos', (select count(*) from public.oshi_photos where user_id = target),
    'oshi_level', (select coalesce(max(public.companion_level(xp)), 0) from public.companion_goods where user_id = target),
    'series', (
      select count(distinct lower(btrim(t.name)))
        from public.user_items ui
        join public.item_tags it on it.official_item_id = ui.official_item_id
        join public.tags t on t.id = it.tag_id and t.category = 'series'
       where ui.user_id = target and btrim(t.name) not in ('', 'なし')
    )
  );
end;
$function$;

revoke all on function public.get_badge_stats(uuid) from public;
grant execute on function public.get_badge_stats(uuid) to anon, authenticated;
