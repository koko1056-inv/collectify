-- 買った値段・お店（推し活費）と、「手放した」グッズの記録。
--
-- 【買った値段・お店】user_items には purchase_price / purchase_date が前からあったが、値段を入れる画面が無かった。
--   お店（purchase_shop）を足し、グッズ詳細で値段・買った日・お店を任意で入れられるようにする。
--   月ごとの推し活費（/spending）は、これらと予約（preorders）からアプリが数える。
--
-- 【手放した】いままでは交換が成立すると、渡したグッズはコレクションから消えるだけだった。
--   past_items に「いつ・どうやって手放したか」を残し、図鑑の歴史として見られるようにする
--   （海外のコレクター向けサイトで長年要望されている「以前持っていた」）。
--   - 交換: apply_trade_to_collection が渡したグッズを記録する（所持数を1減らしたときも1個分を記録）
--   - 自分で消すとき: 「手放した（売った・あげた など）」を選ぶと、アプリが消す前の内容を記録する
--   - 見えるのは本人だけ

alter table public.user_items add column if not exists purchase_shop text;
alter table public.user_items
  add constraint user_items_purchase_shop_len check (purchase_shop is null or char_length(purchase_shop) <= 60);

create table if not exists public.past_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  official_item_id uuid references public.official_items (id) on delete set null,
  title text not null,
  image text,
  content_name text,
  quantity integer not null default 1,
  reason text not null,
  trade_id uuid references public.trade_requests (id) on delete set null,
  purchase_price text,
  purchase_date date,
  purchase_shop text,
  released_at timestamptz not null default now(),
  constraint past_items_reason_check check (reason in ('trade', 'sold', 'gift', 'other')),
  constraint past_items_quantity_check check (quantity between 1 and 999),
  constraint past_items_title_len check (char_length(title) <= 300)
);

create index if not exists past_items_user_released_idx on public.past_items (user_id, released_at desc);
create index if not exists past_items_user_official_idx on public.past_items (user_id, official_item_id);

alter table public.past_items enable row level security;

create policy "past_items_select_own" on public.past_items
  for select to authenticated using (user_id = auth.uid());
create policy "past_items_insert_own" on public.past_items
  for insert to authenticated with check (user_id = auth.uid() and reason <> 'trade' and trade_id is null);
create policy "past_items_delete_own" on public.past_items
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.past_items from anon;
revoke insert, update on public.past_items from authenticated;
grant select, delete on public.past_items to authenticated;
grant insert (user_id, official_item_id, title, image, content_name, quantity, reason, purchase_price, purchase_date, purchase_shop)
  on public.past_items to authenticated;

-- ---------------------------------------------------------------------------
-- 交換の成立をコレクションに反映するとき、渡したグッズを past_items に残す
-- （本体は 20261008100000 のまま。「渡した」側の2か所に記録を足しただけ）
-- ---------------------------------------------------------------------------
create or replace function public.apply_trade_to_collection(_trade_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  me uuid := auth.uid();
  t public.trade_requests;
  is_sender boolean;
  got_title text;
  got_image text;
  got_official uuid;
  got_item_id uuid;
  gave_id uuid;
  gave public.user_items;
  got_src public.user_items;
  got_partner public.user_items;
  oi public.official_items;
  added boolean := false;
  removed boolean := false;
  kept boolean := false;
BEGIN
  SELECT * INTO t FROM public.trade_requests WHERE id = _trade_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN public.trade_error('not_found');
  END IF;
  IF me IS NULL OR me NOT IN (t.sender_id, t.receiver_id) THEN
    RETURN public.trade_error('not_participant');
  END IF;
  IF t.status <> 'completed' THEN
    RETURN public.trade_error('not_completed');
  END IF;

  is_sender := (me = t.sender_id);
  IF (is_sender AND t.sender_applied_at IS NOT NULL) OR (NOT is_sender AND t.receiver_applied_at IS NOT NULL) THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  IF is_sender THEN
    got_title := t.requested_title; got_image := t.requested_image; got_official := t.requested_official_item_id;
    got_item_id := t.requested_item_id; gave_id := t.offered_item_id;
  ELSE
    got_title := t.offered_title; got_image := t.offered_image; got_official := t.offered_official_item_id;
    got_item_id := t.offered_item_id; gave_id := t.requested_item_id;
  END IF;

  IF got_official IS NOT NULL THEN
    SELECT * INTO oi FROM public.official_items WHERE id = got_official;
    SELECT * INTO got_src FROM public.user_items WHERE user_id = me AND official_item_id = got_official ORDER BY created_at LIMIT 1;
  END IF;
  IF got_item_id IS NOT NULL THEN
    SELECT * INTO got_partner FROM public.user_items WHERE id = got_item_id;
  END IF;

  -- 公式グッズに結びついていない品は、同じ題名・同じ写真のカードがあれば同じグッズとみなして数を足す
  IF got_src.id IS NULL THEN
    SELECT * INTO got_src FROM public.user_items
    WHERE user_id = me
      AND title = COALESCE(got_title, oi.title, got_partner.title)
      AND COALESCE(image, '') <> ''
      AND image = COALESCE(got_image, oi.image, got_partner.image)
    ORDER BY created_at LIMIT 1;
  END IF;

  IF got_src.id IS NOT NULL THEN
    UPDATE public.user_items SET quantity = COALESCE(quantity, 1) + 1 WHERE id = got_src.id;
  ELSE
    INSERT INTO public.user_items (user_id, title, image, prize, quantity, official_item_id, content_name, release_date, for_trade)
    VALUES (me,
            COALESCE(got_title, oi.title, got_partner.title, '交換で受け取ったグッズ'),
            COALESCE(got_image, oi.image, got_partner.image, ''),
            COALESCE(oi.price, got_partner.prize, ''),
            1, got_official,
            COALESCE(oi.content_name, got_partner.content_name),
            COALESCE(oi.release_date, got_partner.release_date, CURRENT_DATE),
            false);
  END IF;
  added := true;

  IF got_official IS NOT NULL THEN
    EXECUTE 'DEL' || 'ETE FROM public.wishlists WHERE user_id = $1 AND official_item_id = $2' USING me, got_official;
  END IF;

  IF gave_id IS NOT NULL THEN
    SELECT * INTO gave FROM public.user_items WHERE id = gave_id AND user_id = me;
    IF FOUND THEN
      IF COALESCE(gave.quantity, 1) > 1 THEN
        UPDATE public.user_items SET quantity = quantity - 1 WHERE id = gave.id;
        removed := true;
      ELSE
        BEGIN
          EXECUTE 'DEL' || 'ETE FROM public.user_item_likes WHERE user_item_id = $1' USING gave.id;
          UPDATE public.messages SET related_item_id = NULL WHERE related_item_id = gave.id;
          EXECUTE 'DEL' || 'ETE FROM public.goods_posts WHERE user_item_id = $1' USING gave.id;
          EXECUTE 'DEL' || 'ETE FROM public.user_items WHERE id = $1' USING gave.id;
          removed := true;
        EXCEPTION WHEN foreign_key_violation OR not_null_violation OR raise_exception THEN
          UPDATE public.user_items SET for_trade = false WHERE id = gave.id;
          kept := true;
        END;
      END IF;

      -- 手放した記録（交換で）。コレクションに残した（kept）ときは手放していないので残さない
      IF removed THEN
        INSERT INTO public.past_items (user_id, official_item_id, title, image, content_name, quantity, reason, trade_id,
                                       purchase_price, purchase_date, purchase_shop)
        VALUES (me, gave.official_item_id, left(COALESCE(gave.title, ''), 300), gave.image, gave.content_name, 1, 'trade', t.id,
                gave.purchase_price, gave.purchase_date, gave.purchase_shop);
      END IF;
    END IF;
  END IF;

  IF is_sender THEN
    UPDATE public.trade_requests SET sender_applied_at = now() WHERE id = t.id;
  ELSE
    UPDATE public.trade_requests SET receiver_applied_at = now() WHERE id = t.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'already', false, 'added', added, 'removed', removed, 'kept', kept);
END;
$function$;

