-- =========================================================
-- ポイント経済の整合性・不正防止
--
-- 方針: 付与額・消費額はすべてサーバー側が決める。
--       クライアントは「何をしたか」だけを伝え、金額は一切渡さない。
--
-- 修正前の問題:
--   1. add_user_points が PUBLIC に EXECUTE 権限を持ち、かつガードが
--      `auth.uid() IS NOT NULL AND auth.uid() <> _user_id` だったため、
--      未ログイン（anon キー）だとガードを丸ごとすり抜けて任意ユーザーに
--      任意額を付与できた。ログイン済みでも _points は呼び出し側指定。
--   2. claim_onboarding_reward も _points が呼び出し側指定で、_step_id が
--      自由文字列だったため何度でも任意額を請求できた。
--   3. award_challenge_prize に上限も冪等性も無く、オーナーが賞金を
--      何度でも付与できた。賞金額そのものも預けた額と無関係に設定できた。
--   4. total_points に非負制約が無く、消費側がロックを取らないため
--      同時実行で二重消費・残高マイナスが起きえた。
--   5. purchase_shop_item が存在しないテーブル public.shop_items を参照して
--      いたため、ショップ購入が常に失敗していた（正しくは point_shop_items）。
--   6. 招待ボーナスの招待者側への付与が 1 のガードで必ず失敗していた。
-- =========================================================


-- ---------------------------------------------------------
-- 0. 残高は負にならない
-- ---------------------------------------------------------
UPDATE public.user_points SET total_points = 0 WHERE total_points < 0;

ALTER TABLE public.user_points
  DROP CONSTRAINT IF EXISTS user_points_total_points_non_negative;
ALTER TABLE public.user_points
  ADD CONSTRAINT user_points_total_points_non_negative CHECK (total_points >= 0);


-- ---------------------------------------------------------
-- 1. 内部ヘルパー: 付与・消費の実処理
--    権限チェックはしない。呼び出し側（SECURITY DEFINER 関数）が責任を持つ。
--    クライアントロールからは実行できないようにする。
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_points_internal(
  _user_id uuid,
  _points integer,
  _transaction_type text,
  _description text,
  _reference_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_user_id, GREATEST(_points, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET total_points = user_points.total_points + _points,
        updated_at = now();

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description, reference_id)
  VALUES (_user_id, _points, _transaction_type, _description, _reference_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.grant_points_internal(uuid, integer, text, text, uuid)
  FROM PUBLIC, anon, authenticated;


-- ---------------------------------------------------------
-- 2. add_user_points はクライアントから呼べないようにする
--    Edge Function（service_role）だけが使う。
-- ---------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.add_user_points(uuid, integer, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_points(uuid, integer, text, text, uuid)
  TO service_role;


-- ---------------------------------------------------------
-- 3. 報酬マスタ（付与額の唯一の正）
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.point_rewards (
  reason text PRIMARY KEY,
  points integer NOT NULL CHECK (points > 0),
  -- point_transactions に記録する種別。称号の集計に使われるため、
  -- 複数の reason が同じ種別を共有することがある。
  transaction_type text NOT NULL,
  description text NOT NULL,
  -- true: reference_id ごとに1回だけ（例: グッズ1件につき1回）
  once_per_reference boolean NOT NULL DEFAULT false,
  -- true: 生涯1回だけ（例: ウェルカムボーナス）
  once_per_user boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.point_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "point_rewards_select" ON public.point_rewards;
CREATE POLICY "point_rewards_select" ON public.point_rewards
  FOR SELECT USING (true);
-- 書き込みポリシーは作らない（service_role / 管理者のみ）

INSERT INTO public.point_rewards
  (reason, points, transaction_type, description, once_per_reference, once_per_user)
VALUES
  ('welcome_bonus',     50, 'welcome_bonus', 'ようこそボーナス',   false, true),
  ('item_add',           1, 'item_add',      'グッズ追加',         true,  false),
  ('official_item_add',  5, 'item_add',      '公式グッズ登録',     true,  false),
  ('content_add',       10, 'content_add',   'コンテンツ追加',     true,  false)
ON CONFLICT (reason) DO UPDATE SET
  points             = EXCLUDED.points,
  transaction_type   = EXCLUDED.transaction_type,
  description        = EXCLUDED.description,
  once_per_reference = EXCLUDED.once_per_reference,
  once_per_user      = EXCLUDED.once_per_user;


-- 受け取り済み記録。冪等性はこのユニーク索引が担保する。
CREATE TABLE IF NOT EXISTS public.point_reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL REFERENCES public.point_rewards(reason),
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- NULLS NOT DISTINCT により、reference_id が NULL の報酬（生涯1回）も
-- 1ユーザー1行に制限される。
DROP INDEX IF EXISTS public.point_reward_claims_unique;
CREATE UNIQUE INDEX point_reward_claims_unique
  ON public.point_reward_claims (user_id, reason, reference_id) NULLS NOT DISTINCT;

ALTER TABLE public.point_reward_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "point_reward_claims_select_own" ON public.point_reward_claims;
CREATE POLICY "point_reward_claims_select_own" ON public.point_reward_claims
  FOR SELECT USING (auth.uid() = user_id);
-- INSERT/UPDATE ポリシーは作らない（claim_reward 経由のみ）


-- ---------------------------------------------------------
-- 4. claim_reward: クライアントからの報酬請求の唯一の入口
--    金額は point_rewards から引く。呼び出し側は理由と対象だけを渡す。
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_reward(
  _reason text,
  _reference_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _r RECORD;
  _claim_ref uuid;
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

  -- 生涯1回の報酬は reference_id を無視して1行に固定する
  _claim_ref := CASE WHEN _r.once_per_user THEN NULL ELSE _reference_id END;

  INSERT INTO public.point_reward_claims (user_id, reason, reference_id)
  VALUES (_uid, _reason, _claim_ref)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN
    RETURN false; -- すでに受け取り済み
  END IF;

  PERFORM public.grant_points_internal(
    _uid, _r.points, _r.transaction_type, _r.description, _reference_id
  );

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_reward(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_reward(text, uuid) TO authenticated;


-- ---------------------------------------------------------
-- 5. user_points 行の初期化（add_user_points(0) の代替）
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_user_points_row()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_uid, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.ensure_user_points_row() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_points_row() TO authenticated;


-- ---------------------------------------------------------
-- 6. オンボーディング報酬: 金額をサーバー側の許可リストに移す
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_reward_steps (
  step_id text PRIMARY KEY,
  points integer NOT NULL CHECK (points > 0)
);

ALTER TABLE public.onboarding_reward_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_reward_steps_select" ON public.onboarding_reward_steps;
CREATE POLICY "onboarding_reward_steps_select" ON public.onboarding_reward_steps
  FOR SELECT USING (true);

INSERT INTO public.onboarding_reward_steps (step_id, points) VALUES
  ('account',    10),
  ('profile',    20),
  ('first-item', 30),
  ('favorites',  20),
  ('wishlist',   10),
  ('ai-room',    30),
  ('avatar',     30),
  ('follow',     10),
  ('bookmark',   10)
ON CONFLICT (step_id) DO UPDATE SET points = EXCLUDED.points;

-- 旧シグネチャ（_points を呼び出し側が渡せた）は削除する
DROP FUNCTION IF EXISTS public.claim_onboarding_reward(text, integer);

CREATE OR REPLACE FUNCTION public.claim_onboarding_reward(_step_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _points integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT points INTO _points
    FROM public.onboarding_reward_steps WHERE step_id = _step_id;
  IF _points IS NULL THEN
    RAISE EXCEPTION 'Unknown onboarding step: %', _step_id;
  END IF;

  INSERT INTO public.onboarding_rewards (user_id, step_id, points_awarded)
  VALUES (_uid, _step_id, _points)
  ON CONFLICT (user_id, step_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN false; -- すでに受け取り済み
  END IF;

  PERFORM public.grant_points_internal(
    _uid, _points, 'onboarding_reward', 'はじめのステップ達成: ' || _step_id, NULL
  );

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_onboarding_reward(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_onboarding_reward(text) TO authenticated;


-- ---------------------------------------------------------
-- 7. 招待コードの適用: 双方への付与をサーバー側で原子化
--    招待者は別ユーザーなので、クライアントからは付与できない
--    （これが招待者側のボーナスが入らなかった原因）。
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_invite_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _invite RECORD;
  _bonus integer := 50;
  _already_referred uuid;
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

  -- 1ユーザーが複数のコードを使い回せないようにする
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

  PERFORM public.grant_points_internal(
    _invite.creator_id, _bonus, 'referral_bonus', '招待ボーナス', _invite.id
  );
  PERFORM public.grant_points_internal(
    _uid, _bonus, 'referral_bonus', '招待コード使用ボーナス', _invite.id
  );

  RETURN jsonb_build_object('success', true, 'points', _bonus, 'invite_id', _invite.id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.redeem_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(text) TO authenticated;


-- ---------------------------------------------------------
-- 8. チャレンジ作成: 賞金プールの減算と作成を原子化
--    賞金額は保存される行と減算額が必ず一致する。
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_challenge(
  _title text,
  _ends_at timestamptz,
  _description text DEFAULT NULL,
  _image_url text DEFAULT NULL,
  _official_item_id uuid DEFAULT NULL,
  _first integer DEFAULT 100,
  _second integer DEFAULT 50,
  _third integer DEFAULT 30
)
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

  INSERT INTO public.challenges (
    user_id, title, description, image_url, official_item_id, ends_at,
    first_place_points, second_place_points, third_place_points
  ) VALUES (
    _uid, _title, _description, _image_url, _official_item_id, _ends_at,
    _first, _second, _third
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


-- ---------------------------------------------------------
-- 9. チャレンジ決済: 順位算定・付与・締めをサーバー側で1回だけ
--    旧 award_challenge_prize は上限も冪等性も無かったため削除する。
-- ---------------------------------------------------------
DROP FUNCTION IF EXISTS public.award_challenge_prize(uuid, uuid, integer, text);
DROP FUNCTION IF EXISTS public.deduct_points_for_challenge(integer, text);

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

  _pool := COALESCE(_c.first_place_points, 0)
         + COALESCE(_c.second_place_points, 0)
         + COALESCE(_c.third_place_points, 0);

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

    -- 預けた賞金プールを超えて付与しない
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

  -- 該当者がいなかった分の賞金はオーナーへ返す
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


-- ---------------------------------------------------------
-- 10. カスタムタグ発行: 消費とタグ作成を原子化
--     旧実装は消費 → INSERT の2段で、INSERT 失敗時にポイントが消えていた。
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_custom_tag(
  _name text,
  _category text,
  _content_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _cost integer := 10;
  _current integer;
  _name_trimmed text := btrim(COALESCE(_name, ''));
  _tag RECORD;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _name_trimmed = '' THEN
    RAISE EXCEPTION 'tag_name_required';
  END IF;
  IF _category IS NULL OR _category = '' THEN
    RAISE EXCEPTION 'tag_category_required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.tags WHERE lower(name) = lower(_name_trimmed)) THEN
    RAISE EXCEPTION 'tag_already_exists';
  END IF;

  SELECT COALESCE(total_points, 0) INTO _current
    FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_current, 0) < _cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  INSERT INTO public.tags (name, category, content_id)
  VALUES (
    _name_trimmed,
    _category,
    CASE WHEN _category IN ('character', 'series') THEN _content_id ELSE NULL END
  )
  RETURNING * INTO _tag;

  UPDATE public.user_points
     SET total_points = total_points - _cost, updated_at = now()
   WHERE user_id = _uid;

  INSERT INTO public.point_transactions
    (user_id, points, transaction_type, description, reference_id)
  VALUES
    (_uid, -_cost, 'custom_tag_create', 'カスタムタグ発行: ' || _name_trimmed, _tag.id);

  RETURN jsonb_build_object(
    'success', true,
    'tag_id', _tag.id,
    'name', _tag.name,
    'cost', _cost,
    'new_points', _current - _cost
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_custom_tag(text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_custom_tag(text, text, uuid) TO authenticated;


-- ---------------------------------------------------------
-- 11. purchase_shop_item: 参照テーブル名の誤りを修正
--     public.shop_items は存在しない。正しくは public.point_shop_items。
--     この誤りのため、ショップ購入は常に失敗していた。
-- ---------------------------------------------------------
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

  SELECT COALESCE(total_points, 0) INTO _current_points
    FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_current_points, 0) < _item.points_cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  INSERT INTO public.user_limits (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  IF _item.item_type = 'collection_slots' THEN
    UPDATE public.user_limits
      SET collection_slots = COALESCE(collection_slots, 100) + _item.value, updated_at = now()
      WHERE user_id = _uid;
  ELSIF _item.item_type = 'room_slot' THEN
    UPDATE public.user_limits
      SET room_slots = COALESCE(room_slots, 1) + _item.value, updated_at = now()
      WHERE user_id = _uid;
  ELSIF _item.item_type = 'custom_tags' THEN
    UPDATE public.user_limits
      SET custom_tag_slots = COALESCE(custom_tag_slots, 10) + _item.value, updated_at = now()
      WHERE user_id = _uid;
  ELSIF _item.item_type = 'group_create' THEN
    UPDATE public.user_limits
      SET group_create_count = COALESCE(group_create_count, 0) + _item.value, updated_at = now()
      WHERE user_id = _uid;
  ELSE
    -- 未知の item_type はポイント消費のみ（消費型アイテム等）
    NULL;
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
    'item_name', _item.name
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purchase_shop_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_shop_item(uuid) TO authenticated;


-- ---------------------------------------------------------
-- 12. ログインボーナス: 行ロックを取って同日二重受給を防ぐ
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_login_bonus(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _last_login_date date;
  _login_streak integer;
  _bonus_points integer := 10;
  _exists boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Permission denied: cannot claim another user''s login bonus';
  END IF;

  -- 行が無い場合は先に作り、必ずロックを取れる状態にする
  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT last_login_bonus_date, login_streak
    INTO _last_login_date, _login_streak
    FROM public.user_points
   WHERE user_id = _user_id
     FOR UPDATE;

  IF _last_login_date = CURRENT_DATE THEN
    RETURN false; -- 本日分は受け取り済み
  END IF;

  IF _last_login_date = CURRENT_DATE - 1 THEN
    _login_streak := COALESCE(_login_streak, 0) + 1;
  ELSE
    _login_streak := 1;
  END IF;

  UPDATE public.user_points
     SET total_points = total_points + _bonus_points,
         last_login_bonus_date = CURRENT_DATE,
         login_streak = _login_streak,
         last_login_date = CURRENT_DATE,
         updated_at = now()
   WHERE user_id = _user_id;

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description)
  VALUES (_user_id, _bonus_points, 'login_bonus',
          'ログインボーナス (ストリーク: ' || _login_streak || ')');

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_login_bonus(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_login_bonus(uuid) TO authenticated;


-- ---------------------------------------------------------
-- 13. 消費側の残高チェックにロックを追加
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expand_collection_slots(
  _cost integer DEFAULT 30,
  _slots_added integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _current integer;
  -- 呼び出し側が渡す値は信用せず、サーバー側の定数を使う
  _fixed_cost integer := 30;
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


-- ---------------------------------------------------------
-- 14. 遡及付与もクライアントから叩けないようにする
--     （正規の付与経路は claim_reward に一本化した）
-- ---------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.retroactive_content_points()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retroactive_content_points() TO service_role;


-- ---------------------------------------------------------
-- 15. 称号付与をサーバー側で一括評価する
--
--     従来の判定はクライアント側の checkAndAwardAchievements にあったが、
--     その関数は useAwardPoints からのみ呼ばれ、useAwardPoints はどこからも
--     使われていなかったため、称号は事実上一度も付与されていなかった
--     （獲得済み称号を表示する UI だけが存在していた）。
--
--     ポイント条件・アクション回数条件の両方を1クエリで評価する。
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_eligible_achievements()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _total integer;
  _granted integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(total_points, 0) INTO _total
    FROM public.user_points WHERE user_id = _uid;
  _total := COALESCE(_total, 0);

  WITH action_counts AS (
    SELECT transaction_type, COUNT(*) AS n
      FROM public.point_transactions
     WHERE user_id = _uid AND points > 0
     GROUP BY transaction_type
  ),
  eligible AS (
    SELECT a.id
      FROM public.achievements a
     WHERE (a.required_points IS NOT NULL AND a.required_points <= _total)
        OR (a.required_action_count IS NOT NULL
            AND a.action_type IS NOT NULL
            AND COALESCE(
                  (SELECT n FROM action_counts WHERE transaction_type = a.action_type),
                  0
                ) >= a.required_action_count)
  )
  INSERT INTO public.user_achievements (user_id, achievement_id)
  SELECT _uid, e.id FROM eligible e
  ON CONFLICT (user_id, achievement_id) DO NOTHING;

  GET DIAGNOSTICS _granted = ROW_COUNT;
  RETURN _granted;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.grant_eligible_achievements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_eligible_achievements() TO authenticated;

-- 個別付与版はもう使わない（一括評価に置き換えた）
DROP FUNCTION IF EXISTS public.grant_achievement_if_eligible(uuid);
