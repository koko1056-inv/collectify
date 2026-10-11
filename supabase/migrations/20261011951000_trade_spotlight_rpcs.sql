-- 交換の「注目」: 判定・購入・状態の関数（テーブルは 20261011950000_trade_spotlight.sql）

-- 3) 並び替えで使う判定。どちらも一覧系の RPC（SECURITY DEFINER）の中から呼ぶだけ。
-- その品がいま注目中か（持ち主の注目が有効で、範囲に含まれている）
CREATE OR REPLACE FUNCTION public.trade_spotlight_covers(_owner uuid, _item uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.trade_spotlights s
    WHERE s.user_id = _owner
      AND s.starts_at <= now() AND s.ends_at > now()
      AND (s.item_ids IS NULL OR _item = ANY (s.item_ids))
  );
$function$;

-- その人がいま注目中か（交換に出している品のどれかに注目が効いている）
CREATE OR REPLACE FUNCTION public.trade_spotlight_user(_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.trade_spotlights s
    WHERE s.user_id = _owner
      AND s.starts_at <= now() AND s.ends_at > now()
      AND EXISTS (
        SELECT 1 FROM public.user_items ui
        WHERE ui.user_id = _owner AND ui.for_trade
          AND (s.item_ids IS NULL OR ui.id = ANY (s.item_ids))
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.trade_spotlight_covers(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trade_spotlight_user(uuid) FROM PUBLIC, anon, authenticated;

-- 4) 購入
-- 残高の確認と減算は user_points の行をロックしてから行う（同時に押しても二重に引かれない）。
-- すでに注目中なら、いまの終わりから続けて延長する。先の予約は「今から7日先」まで。
-- 7日を超える分は切り捨てて請求するのではなく、断る。
CREATE OR REPLACE FUNCTION public.buy_trade_spotlight(_duration text, _item_ids uuid[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _plan public.trade_spotlight_plans%ROWTYPE;
  _ids uuid[];
  _balance integer;
  _start timestamptz;
  _end timestamptz;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _plan FROM public.trade_spotlight_plans
   WHERE duration = _duration AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;

  -- 品の指定。空の配列は「全部」と同じに扱う
  IF _item_ids IS NOT NULL THEN
    SELECT array_agg(DISTINCT x) INTO _ids
      FROM unnest(_item_ids) AS x WHERE x IS NOT NULL;
  END IF;

  IF _ids IS NOT NULL THEN
    IF cardinality(_ids) > 50 THEN
      RAISE EXCEPTION 'Too many items';
    END IF;
    -- 自分の品で、交換に出しているものだけ
    IF EXISTS (
      SELECT 1 FROM unnest(_ids) AS x
      WHERE NOT EXISTS (
        SELECT 1 FROM public.user_items ui
        WHERE ui.id = x AND ui.user_id = _uid AND ui.for_trade
      )
    ) THEN
      RAISE EXCEPTION 'Item not offered for trade';
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.user_items ui WHERE ui.user_id = _uid AND ui.for_trade
  ) THEN
    -- 何も出していないのに買っても、どこにも効かない
    RAISE EXCEPTION 'No items offered for trade';
  END IF;

  -- ここから先は同じ人の購入を1つずつ通す
  SELECT total_points INTO _balance
    FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_balance, 0) < _plan.price THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  SELECT max(s.ends_at) INTO _start
    FROM public.trade_spotlights s
   WHERE s.user_id = _uid AND s.ends_at > now();
  _start := GREATEST(COALESCE(_start, now()), now());
  _end := _start + make_interval(hours => _plan.hours);

  IF _end > now() + interval '7 days' THEN
    RAISE EXCEPTION 'Spotlight limit reached';
  END IF;

  INSERT INTO public.trade_spotlights (user_id, starts_at, ends_at, item_ids, duration, points_spent)
  VALUES (_uid, _start, _end, _ids, _plan.duration, _plan.price)
  RETURNING id INTO _id;

  UPDATE public.user_points
     SET total_points = total_points - _plan.price, updated_at = now()
   WHERE user_id = _uid;

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description, reference_id)
  VALUES (_uid, -_plan.price, 'trade_spotlight',
          '交換の注目（' || _plan.hours || '時間）', _id);

  RETURN jsonb_build_object(
    'id', _id,
    'starts_at', _start,
    'ends_at', _end,
    'price', _plan.price,
    'new_points', _balance - _plan.price
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.buy_trade_spotlight(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_trade_spotlight(text, uuid[]) TO authenticated;

-- 5) 自分の注目の状態とプラン
-- ends_at は、続けて買った分も含めた「注目が切れる時刻」。注目していなければ NULL。
CREATE OR REPLACE FUNCTION public.get_my_trade_spotlight()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'active', EXISTS (
      SELECT 1 FROM public.trade_spotlights s
      WHERE s.user_id = auth.uid() AND s.starts_at <= now() AND s.ends_at > now()
    ),
    'ends_at', (
      SELECT max(s.ends_at) FROM public.trade_spotlights s
      WHERE s.user_id = auth.uid() AND s.ends_at > now()
    ),
    'max_hours', 168,
    'plans', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('duration', p.duration, 'hours', p.hours, 'price', p.price)
                       ORDER BY p.sort_order)
      FROM public.trade_spotlight_plans p
      WHERE p.is_active
    ), '[]'::jsonb)
  )
  WHERE auth.uid() IS NOT NULL;
$function$;

REVOKE ALL ON FUNCTION public.get_my_trade_spotlight() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_trade_spotlight() TO authenticated;

-- 10) 画面に出ている相手のうち、いま注目中の人（「注目」の印を付けるため）
-- ブロックしている／されている相手と自分は返さない。一度に見るのは100人まで。
CREATE OR REPLACE FUNCTION public.get_trade_spotlight_users(_user_ids uuid[])
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH ids AS (
    SELECT DISTINCT x AS uid
    FROM unnest(COALESCE(_user_ids, '{}'::uuid[])) AS x
    WHERE x IS NOT NULL
    LIMIT 100
  )
  SELECT i.uid
  FROM ids i
  WHERE auth.uid() IS NOT NULL
    AND i.uid <> auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = i.uid)
         OR (b.blocker_id = i.uid AND b.blocked_id = auth.uid())
    )
    AND public.trade_spotlight_user(i.uid);
$function$;

REVOKE ALL ON FUNCTION public.get_trade_spotlight_users(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trade_spotlight_users(uuid[]) TO authenticated;
