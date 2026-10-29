-- ポイントの使いみちと値段をそろえ、ポイントが増える抜け道をふさぐ
--
-- 関数の本体は本番の定義（現在の正）をもとにしている。変えたところだけ「★」で印を付けた。
--
--  1. チャレンジ: challenges の自分の行の INSERT / UPDATE / DELETE ポリシーを外す。
--     作成は create_challenge、締めは settle_challenge（どちらも SECURITY DEFINER）だけで行う。
--     以前は行を直接作る・賞金の額を書き換える → settle_challenge で「払っていない賞金」を返金として受け取れた。
--     作成時に実際に払った額を paid_pool に残し、締めの配布と返金はその額の中だけで行う。
--  2. カタログ追加の報酬（official_item_add / content_add）: 2つ合わせて日本時間の1日10回まで。
--     対象の行が作られてから24時間以内のときだけ渡す（古い行をまとめて請求できないように）。
--     created_by の意味は変えない（管理用の取り込みは service role で別の人の created_by を入れる）。
--  3. 旧ログインボーナス claim_login_bonus: アプリはもう呼んでいない（デイリーログインのカレンダーに置き換え済み）。
--     連続30日以上で1日50ptもらえてしまうので、実行権限を外す。
--  4. 招待: 招待した側のボーナスは、1人あたり日本時間の暦月で10回まで。招待された側のボーナスはそのまま。
--  5. ショップ: お部屋の単品（room:<セット>.<アイテム>）は、そのセット（room:<セット>）を持っていたら買えない。
--     セットに入っている物を買ってもポイントが無駄になるだけなので、「Already owned」で断る。
--  6. コレクション枠の拡張: +10枠 30pt → 20pt（ショップの枠パックの 2pt/枠 より高くならないように）。

-- ─────────────────────────────── 1. チャレンジ ───────────────────────────────

DROP POLICY IF EXISTS "Users can create challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can update own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can delete own challenges" ON public.challenges;

-- 作成時に実際に払った賞金の額
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS paid_pool integer;

-- 今ある行: 作成時の履歴（challenge_create）が残っていればその額、無い古い行は今の賞金の列から
UPDATE public.challenges c
   SET paid_pool = COALESCE(
         (SELECT -SUM(t.points)::integer
            FROM public.point_transactions t
           WHERE t.reference_id = c.id
             AND t.user_id = c.user_id
             AND t.transaction_type = 'challenge_create'),
         COALESCE(c.first_place_points, 0) + COALESCE(c.second_place_points, 0) + COALESCE(c.third_place_points, 0)
       )
 WHERE c.paid_pool IS NULL;

UPDATE public.challenges SET paid_pool = 0 WHERE paid_pool < 0;

-- これから作る行は create_challenge が入れる。それ以外の作り方（service role など）は払っていないので 0
ALTER TABLE public.challenges ALTER COLUMN paid_pool SET DEFAULT 0;
ALTER TABLE public.challenges ALTER COLUMN paid_pool SET NOT NULL;

COMMENT ON COLUMN public.challenges.paid_pool IS
  '作成時に実際に払った賞金の額（create_challenge が入れる）。settle_challenge の配布と返金はこの額の中だけで行う。';

CREATE OR REPLACE FUNCTION public.create_challenge(_title text, _ends_at timestamp with time zone, _description text DEFAULT NULL::text, _image_url text DEFAULT NULL::text, _official_item_id uuid DEFAULT NULL::uuid, _first integer DEFAULT 100, _second integer DEFAULT 50, _third integer DEFAULT 30)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _pool integer;
  _current integer;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _title IS NULL OR btrim(_title) = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  IF _first < 0 OR _second < 0 OR _third < 0 THEN
    RAISE EXCEPTION 'Invalid prize amount';
  END IF;

  _pool := _first + _second + _third;
  IF _pool <= 0 THEN
    RAISE EXCEPTION 'Invalid prize amount';
  END IF;

  SELECT COALESCE(total_points, 0) INTO _current
    FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_current, 0) < _pool THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  -- ★ 払った額を paid_pool に残す
  INSERT INTO public.challenges (
    user_id, title, description, image_url, official_item_id, ends_at,
    first_place_points, second_place_points, third_place_points, paid_pool
  ) VALUES (
    _uid, _title, _description, _image_url, _official_item_id, _ends_at,
    _first, _second, _third, _pool
  ) RETURNING id INTO _id;

  UPDATE public.user_points
     SET total_points = total_points - _pool, updated_at = now()
   WHERE user_id = _uid;

  INSERT INTO public.point_transactions
    (user_id, points, transaction_type, description, reference_id)
  VALUES
    (_uid, -_pool, 'challenge_create', 'チャレンジ「' || _title || '」作成（賞金プール）', _id);

  RETURN _id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_challenge(text, timestamptz, text, text, uuid, integer, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_challenge(text, timestamptz, text, text, uuid, integer, integer, integer)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.settle_challenge(_challenge_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _c RECORD;
  _pool integer;
  _awarded integer := 0;
  _place integer := 0;
  _prize integer;
  _rec RECORD;
  _winners jsonb := '[]'::jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 行をロックして、同じチャレンジの締めを1回だけにする（status を 'ended' にするまで他は待つ）
  SELECT * INTO _c FROM public.challenges WHERE id = _challenge_id FOR UPDATE;
  IF _c IS NULL THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;
  IF _c.user_id <> _uid THEN
    RAISE EXCEPTION 'Only the challenge owner can settle this challenge';
  END IF;
  IF _c.status <> 'active' THEN
    RAISE EXCEPTION 'Challenge already settled';
  END IF;

  -- ★ 配布と返金は、作成時に実際に払った額の中だけ（賞金の列は書き換えられていても上限にならない）
  _pool := GREATEST(COALESCE(_c.paid_pool, 0), 0);

  FOR _rec IN
    SELECT e.user_id, COUNT(v.id) AS votes
      FROM public.challenge_entries e
      LEFT JOIN public.challenge_votes v ON v.entry_id = e.id
     WHERE e.challenge_id = _challenge_id
     GROUP BY e.id, e.user_id
    HAVING COUNT(v.id) > 0
     ORDER BY COUNT(v.id) DESC, e.id
     LIMIT 3
  LOOP
    _place := _place + 1;
    _prize := CASE _place
                WHEN 1 THEN COALESCE(_c.first_place_points, 0)
                WHEN 2 THEN COALESCE(_c.second_place_points, 0)
                ELSE COALESCE(_c.third_place_points, 0)
              END;

    CONTINUE WHEN _prize <= 0 OR _awarded + _prize > _pool;

    PERFORM public.grant_points_internal(
      _rec.user_id, _prize, 'challenge_reward',
      'チャレンジ「' || _c.title || '」' || _place || '位入賞',
      _challenge_id
    );
    _awarded := _awarded + _prize;
    _winners := _winners || jsonb_build_object(
      'user_id', _rec.user_id, 'place', _place, 'points', _prize, 'votes', _rec.votes
    );
  END LOOP;

  IF _pool - _awarded > 0 THEN
    PERFORM public.grant_points_internal(
      _uid, _pool - _awarded, 'challenge_refund',
      'チャレンジ「' || _c.title || '」未消化の賞金を返金',
      _challenge_id
    );
  END IF;

  UPDATE public.challenges
     SET status = 'ended', updated_at = now()
   WHERE id = _challenge_id;

  RETURN jsonb_build_object(
    'success', true,
    'awarded', _awarded,
    'refunded', _pool - _awarded,
    'winners', _winners
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.settle_challenge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_challenge(uuid) TO authenticated;

-- ─────────────────────────────── 2. カタログ追加の報酬 ───────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_reward(_reason text, _reference_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _r RECORD;
  _claim_ref uuid;
  _ok boolean := true;
  -- ★ 1日の上限は日本時間の日付で数える（award_social_points と同じ）
  _day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo';
  _today integer;
  _fresh boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _r FROM public.point_rewards
   WHERE reason = _reason AND is_active;
  IF _r IS NULL THEN
    RAISE EXCEPTION 'Unknown reward: %', _reason;
  END IF;

  IF _r.once_per_reference AND _reference_id IS NULL THEN
    RAISE EXCEPTION 'reference_id is required for reward %', _reason;
  END IF;

  IF _r.once_per_reference THEN
    _ok := CASE _reason
      WHEN 'item_add' THEN EXISTS (
        SELECT 1 FROM public.user_items u
         WHERE u.user_id = _uid AND (u.id = _reference_id OR u.official_item_id = _reference_id)
      )
      WHEN 'official_item_add' THEN EXISTS (
        SELECT 1 FROM public.official_items o WHERE o.id = _reference_id AND o.created_by = _uid
      )
      WHEN 'content_add' THEN EXISTS (
        SELECT 1 FROM public.content_names c WHERE c.id = _reference_id AND c.created_by = _uid
      )
      ELSE false
    END;
    IF NOT _ok THEN
      RAISE EXCEPTION 'Invalid reference for reward %', _reason;
    END IF;
  END IF;

  -- ★ カタログ追加（グッズ・作品）は、作ってから24時間以内の行だけ。2つ合わせて1日10回まで。
  --   上限・期限切れはエラーにせず false（受け取れなかった）を返す。本体の追加は失敗させない。
  IF _reason IN ('official_item_add', 'content_add') THEN
    _fresh := CASE _reason
      WHEN 'official_item_add' THEN EXISTS (
        SELECT 1 FROM public.official_items o
         WHERE o.id = _reference_id AND o.created_at >= now() - interval '24 hours'
      )
      ELSE EXISTS (
        SELECT 1 FROM public.content_names c
         WHERE c.id = _reference_id AND c.created_at >= now() - interval '24 hours'
      )
    END;
    IF NOT _fresh THEN
      RETURN false;
    END IF;

    -- 同じ人の同時の請求を1本ずつにする（数えてから記録するまでの間に割り込ませない）
    PERFORM pg_advisory_xact_lock(hashtextextended('catalog_reward:' || _uid::text, 0));

    SELECT count(*) INTO _today FROM public.point_reward_claims
     WHERE user_id = _uid
       AND reason IN ('official_item_add', 'content_add')
       AND created_at >= _day_start;
    IF _today >= 10 THEN
      RETURN false;
    END IF;
  END IF;

  _claim_ref := CASE WHEN _r.once_per_user THEN NULL ELSE _reference_id END;

  INSERT INTO public.point_reward_claims (user_id, reason, reference_id)
  VALUES (_uid, _reason, _claim_ref)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM public.grant_points_internal(
    _uid, _r.points, _r.transaction_type, _r.description, _reference_id
  );

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_reward(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_reward(text, uuid) TO authenticated;

-- ─────────────────────────────── 3. 旧ログインボーナス ───────────────────────────────

-- 関数は残す（履歴の説明のため）。アプリ・Edge Function・他の関数からは呼ばれていない
REVOKE EXECUTE ON FUNCTION public.claim_login_bonus(uuid) FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────── 4. 招待 ───────────────────────────────

CREATE OR REPLACE FUNCTION public.redeem_invite_code(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _invite RECORD;
  _bonus integer := 100;
  _already_referred uuid;
  -- ★ 招待した側のボーナスの上限（日本時間の暦月ごと）
  _inviter_monthly_cap integer := 10;
  _month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo';
  _inviter_paid integer;
  _inviter_rewarded boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _invite FROM public.invite_codes
   WHERE code = _code FOR UPDATE;
  IF _invite IS NULL THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;
  IF _invite.creator_id = _uid THEN
    RAISE EXCEPTION 'invite_own_code';
  END IF;
  IF _invite.used_by IS NOT NULL THEN
    RAISE EXCEPTION 'invite_already_used';
  END IF;
  IF _invite.expires_at IS NOT NULL AND _invite.expires_at < now() THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;

  SELECT referred_by INTO _already_referred FROM public.profiles WHERE id = _uid;
  IF _already_referred IS NOT NULL THEN
    RAISE EXCEPTION 'invite_already_redeemed';
  END IF;

  UPDATE public.invite_codes
     SET used_by = _uid, used_at = now()
   WHERE id = _invite.id;

  UPDATE public.profiles
     SET referred_by = _invite.creator_id
   WHERE id = _uid;

  -- ★ 招待した側: 今月すでに10回受け取っていたら渡さない（招待された側は下でいつもどおり渡す）
  --   同じ招待者の別のコードが同時に使われても数えすぎないよう、招待者ごとに1本ずつにする
  PERFORM pg_advisory_xact_lock(hashtextextended('referral_inviter:' || _invite.creator_id::text, 0));

  -- 招待した側の付与は「自分が作ったコードを reference にした referral_bonus」（招待された側の付与と見分ける）
  SELECT count(*) INTO _inviter_paid
    FROM public.point_transactions t
    JOIN public.invite_codes ic ON ic.id = t.reference_id
   WHERE t.user_id = _invite.creator_id
     AND t.transaction_type = 'referral_bonus'
     AND ic.creator_id = _invite.creator_id
     AND t.created_at >= _month_start;

  IF _inviter_paid < _inviter_monthly_cap THEN
    PERFORM public.grant_points_internal(
      _invite.creator_id, _bonus, 'referral_bonus', '招待ボーナス', _invite.id
    );
    _inviter_rewarded := true;
  END IF;

  PERFORM public.grant_points_internal(
    _uid, _bonus, 'referral_bonus', '招待コード使用ボーナス', _invite.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'points', _bonus,
    'invite_id', _invite.id,
    'inviter_rewarded', _inviter_rewarded
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.redeem_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(text) TO authenticated;

-- ─────────────────────────────── 5. ショップ ───────────────────────────────

CREATE OR REPLACE FUNCTION public.purchase_shop_item(_shop_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _item RECORD;
  _current_points integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _item FROM public.point_shop_items
   WHERE id = _shop_item_id AND is_active;
  IF _item IS NULL THEN
    RAISE EXCEPTION 'Shop item not found';
  END IF;

  IF _item.item_type NOT IN ('collection_slots', 'custom_tags', 'unlock', 'streak_freeze') THEN
    RAISE EXCEPTION 'Unsupported shop item type: %', _item.item_type;
  END IF;

  SELECT COALESCE(total_points, 0) INTO _current_points
    FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  IF _item.item_type = 'unlock' AND EXISTS (
    SELECT 1 FROM public.user_unlocks
     WHERE user_id = _uid AND unlock_key = _item.unlock_key
  ) THEN
    RAISE EXCEPTION 'Already owned';
  END IF;

  -- ★ お部屋の単品（room:<セット>.<アイテム>、例 room:sakura.tree）は、そのセット（room:sakura）を
  --   持っていればもう使えるので売らない
  IF _item.item_type = 'unlock'
     AND _item.unlock_key LIKE 'room:%.%'
     AND EXISTS (
       SELECT 1 FROM public.user_unlocks
        WHERE user_id = _uid
          AND unlock_key = 'room:' || split_part(substr(_item.unlock_key, 6), '.', 1)
     ) THEN
    RAISE EXCEPTION 'Already owned';
  END IF;

  IF _item.item_type = 'streak_freeze' AND EXISTS (
    SELECT 1 FROM public.user_points
     WHERE user_id = _uid AND streak_freezes + COALESCE(_item.value, 1) > 2
  ) THEN
    RAISE EXCEPTION 'Freeze limit';
  END IF;

  IF COALESCE(_current_points, 0) < _item.points_cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  IF _item.item_type = 'collection_slots' THEN
    INSERT INTO public.user_limits (user_id) VALUES (_uid)
    ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.user_limits
      SET collection_slots = COALESCE(collection_slots, 100) + _item.value, updated_at = now()
      WHERE user_id = _uid;
  ELSIF _item.item_type = 'custom_tags' THEN
    INSERT INTO public.user_limits (user_id) VALUES (_uid)
    ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.user_limits
      SET custom_tag_slots = COALESCE(custom_tag_slots, 10) + _item.value, updated_at = now()
      WHERE user_id = _uid;
  ELSIF _item.item_type = 'unlock' THEN
    INSERT INTO public.user_unlocks (user_id, unlock_key)
    VALUES (_uid, _item.unlock_key);
  ELSIF _item.item_type = 'streak_freeze' THEN
    UPDATE public.user_points
      SET streak_freezes = streak_freezes + COALESCE(_item.value, 1)
      WHERE user_id = _uid;
  END IF;

  UPDATE public.user_points
    SET total_points = total_points - _item.points_cost, updated_at = now()
    WHERE user_id = _uid;

  INSERT INTO public.point_transactions
    (user_id, points, transaction_type, description, reference_id)
  VALUES
    (_uid, -_item.points_cost, 'shop_purchase', _item.name || 'を購入', _item.id);

  INSERT INTO public.user_point_purchases (user_id, shop_item_id, points_spent)
  VALUES (_uid, _item.id, _item.points_cost);

  RETURN jsonb_build_object(
    'success', true,
    'new_points', _current_points - _item.points_cost,
    'item_name', _item.name,
    'unlock_key', _item.unlock_key
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purchase_shop_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_shop_item(uuid) TO authenticated;

-- ─────────────────────────────── 6. コレクション枠の拡張 ───────────────────────────────

-- 引数はアプリとの互換のために残す（値は使わない。値段と枠数はここの定数が正）
CREATE OR REPLACE FUNCTION public.expand_collection_slots(_cost integer DEFAULT 20, _slots_added integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _current integer;
  -- ★ 30pt → 20pt（ショップの枠パック 2pt/枠 と同じ）
  _fixed_cost integer := 20;
  _fixed_slots integer := 10;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT COALESCE(total_points, 0) INTO _current
    FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_current, 0) < _fixed_cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  INSERT INTO public.user_limits (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_limits
    SET collection_slots = COALESCE(collection_slots, 100) + _fixed_slots, updated_at = now()
    WHERE user_id = _uid;

  UPDATE public.user_points
    SET total_points = total_points - _fixed_cost, updated_at = now()
    WHERE user_id = _uid;

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description)
  VALUES (_uid, -_fixed_cost, 'collection_slot_expand',
          'コレクション枠 +' || _fixed_slots || ' 拡張');

  RETURN jsonb_build_object('success', true, 'new_points', _current - _fixed_cost);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.expand_collection_slots(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expand_collection_slots(integer, integer) TO authenticated;
