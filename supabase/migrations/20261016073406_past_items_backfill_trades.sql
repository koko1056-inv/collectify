-- ---------------------------------------------------------------------------
-- これまでに成立した交換で渡したグッズも、手放した記録に入れる（コレクションに残っているものは除く）
-- ---------------------------------------------------------------------------
insert into public.past_items (user_id, official_item_id, title, image, content_name, quantity, reason, trade_id, released_at)
select g.user_id, g.official_item_id, left(coalesce(g.title, oi.title, '交換で渡したグッズ'), 300), coalesce(g.image, oi.image),
       oi.content_name, 1, 'trade', g.trade_id, g.applied_at
  from (
    select t.id as trade_id, t.sender_id as user_id, t.offered_official_item_id as official_item_id,
           t.offered_title as title, t.offered_image as image, t.offered_item_id as item_id, t.sender_applied_at as applied_at
      from public.trade_requests t
     where t.status = 'completed' and t.sender_applied_at is not null
    union all
    select t.id, t.receiver_id, t.requested_official_item_id, t.requested_title, t.requested_image, t.requested_item_id, t.receiver_applied_at
      from public.trade_requests t
     where t.status = 'completed' and t.receiver_applied_at is not null
  ) g
  left join public.official_items oi on oi.id = g.official_item_id
 where g.user_id is not null
   and not exists (select 1 from public.user_items u where u.id = g.item_id)
   and not exists (select 1 from public.past_items p where p.trade_id = g.trade_id and p.user_id = g.user_id);
