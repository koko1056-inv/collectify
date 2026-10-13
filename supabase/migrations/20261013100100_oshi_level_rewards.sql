-- =========================================================
-- なかよしレベルの特典（推しグッズのレベルが上がったときに、もらえるもの）
--
-- 以前: Lv5 で +5pt、Lv10 で +10pt を、1グッズ1回だけ（companion_lv5 / companion_lv10）。
--       ほかのレベルでは何も起きず、「育てると何がいいのか」が見えにくかった。
-- これから:
--  1) ポイント: すべてのレベルアップで付与する（Lv2:+3 … Lv10:+30。表は下の point_rewards）。
--     1グッズ・1レベルにつき1回。推しグッズから外して付け直しても、companion_goods の行（xp）は残るので
--     レベルは戻らず、受け取り済みの記録（point_reward_claims）もあるので二重にはもらえない。
--     Lv5・Lv10 は以前と同じ reason・reference を使い続ける（以前に受け取った人が、もう一度もらわないように）。
--  2) 部屋のアイテム: Lv3・5・7・10 で、そのレベルでしか手に入らない家具・壁紙・床・フレームを解放する。
--     「どれか1つの推しグッズがそのレベルに届いた」で、アカウント単位に user_unlocks へ 'room:lvN' を入れる。
--     companion_goods はグッズを消すと行ごと消える（ON DELETE CASCADE）ので、達成は user_unlocks に残しておく
--     （グッズを手放しても、もらった家具は消えない）。
--  3) 反応・見せ方（吹き出し・音符・虹のオーラ・プロフィールのバッジ）はアプリ側だけ（src/lib/oshiLevel.ts）。
--
-- 付与はお世話（companion_apply）とプレゼント（give_companion_gift）の中で、レベルが上がったときだけ行う。
-- アプリには何を受け取ったか（ポイント・解放したセット）を返し、レベルアップのお祝いの中で見せる。
--
-- さかのぼり: この時点ですでに Lv2 以上の推しグッズには、届いているレベルまでの特典をまとめて付与する
-- （同じ受け取りの記録を使うので、二重にはならない。履歴には「（さかのぼり）」と付ける）。
-- =========================================================

-- ポイントの表（レベル → pt）。アプリの src/lib/oshiLevel.ts の LEVEL_REWARDS と同じ（scripts/test-oshi-room.mjs が突き合わせる）
INSERT INTO public.point_rewards (reason, points, transaction_type, description, once_per_reference, once_per_user, is_active) VALUES
  ('companion_lv2',  3,  'companion_level', '推しグッズがレベル2',  true, false, true),
  ('companion_lv3',  5,  'companion_level', '推しグッズがレベル3',  true, false, true),
  ('companion_lv4',  5,  'companion_level', '推しグッズがレベル4',  true, false, true),
  ('companion_lv6',  10, 'companion_level', '推しグッズがレベル6',  true, false, true),
  ('companion_lv7',  15, 'companion_level', '推しグッズがレベル7',  true, false, true),
  ('companion_lv8',  15, 'companion_level', '推しグッズがレベル8',  true, false, true),
  ('companion_lv9',  20, 'companion_level', '推しグッズがレベル9',  true, false, true)
ON CONFLICT (reason) DO NOTHING;
-- 以前からある Lv5・Lv10 は値上げする（行は残す: 受け取りの記録 point_reward_claims がこの reason を指している）
UPDATE public.point_rewards SET points = 10, description = '推しグッズがレベル5', is_active = true WHERE reason = 'companion_lv5';
UPDATE public.point_rewards SET points = 30, description = '推しグッズがレベル10', is_active = true WHERE reason = 'companion_lv10';

-- レベル _old → _new に上がったときの特典を渡す（内部用。お世話・プレゼント・さかのぼりから呼ぶ）。
-- 返り値: { "points": 受け取ったポイントの合計, "unlocked": ["lv5", ...] 今回はじめて解放したセット }
-- 受け取り済みのレベル（同じグッズ）・解放済みのセット（同じアカウント）は数に入れない
CREATE OR REPLACE FUNCTION public.companion_level_rewards(_uid uuid, _item uuid, _old integer, _new integer, _retro boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _lv integer;
  _r public.point_rewards%ROWTYPE;
  _ref uuid;
  _points integer := 0;
  _unlocked text[] := ARRAY[]::text[];
BEGIN
  IF _uid IS NULL OR _item IS NULL OR _new IS NULL OR _old IS NULL OR _new <= _old THEN
    RETURN jsonb_build_object('points', 0, 'unlocked', '[]'::jsonb);
  END IF;

  FOR _lv IN greatest(_old + 1, 2) .. least(_new, 10) LOOP
    -- ポイント（1グッズ・1レベル1回）。reference の形は以前の Lv5・Lv10（'companion5:<id>'）と同じ
    SELECT * INTO _r FROM public.point_rewards WHERE reason = 'companion_lv' || _lv AND is_active;
    IF FOUND THEN
      _ref := md5('companion' || _lv || ':' || _item::text)::uuid;
      INSERT INTO public.point_reward_claims (user_id, reason, reference_id)
      VALUES (_uid, _r.reason, _ref)
      ON CONFLICT DO NOTHING;
      IF FOUND THEN
        PERFORM public.grant_points_internal(
          _uid, _r.points, _r.transaction_type,
          _r.description || CASE WHEN _retro THEN '（さかのぼり）' ELSE '' END,
          _ref
        );
        _points := _points + _r.points;
      END IF;
    END IF;

    -- 部屋のアイテム（アカウント単位。そのレベルの特典のセットが目録にあるときだけ）
    IF EXISTS (SELECT 1 FROM public.oshi_room_assets a WHERE a.set_key = 'lv' || _lv) THEN
      INSERT INTO public.user_unlocks (user_id, unlock_key)
      VALUES (_uid, 'room:lv' || _lv)
      ON CONFLICT DO NOTHING;
      IF FOUND THEN
        _unlocked := _unlocked || ('lv' || _lv);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('points', _points, 'unlocked', to_jsonb(_unlocked));
END $$;
REVOKE ALL ON FUNCTION public.companion_level_rewards(uuid, uuid, integer, integer, boolean) FROM PUBLIC, anon, authenticated;

-- お世話（撫でる・磨く・撮る）。中身は 20261012200000 と同じで、レベルアップの特典だけを入れ替える
CREATE OR REPLACE FUNCTION public.companion_apply(_uid uuid, _item uuid, _action text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'Asia/Tokyo')::date;
  _row public.companion_goods%ROWTYPE;
  _gain integer;
  _old integer;
  _new integer;
  _done boolean;
  _rewards jsonb := NULL;
BEGIN
  IF _action NOT IN ('pat', 'polish', 'photo') THEN RAISE EXCEPTION 'invalid_action'; END IF;
  -- 推しフォトの保存からも呼ばれる。推しグッズでなければ何もしない（写真の保存は止めない）
  IF NOT public.is_oshi_goods(_uid, _item) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_companion');
  END IF;
  INSERT INTO public.companion_goods (user_id, user_item_id) VALUES (_uid, _item)
  ON CONFLICT (user_id, user_item_id) DO NOTHING;
  -- 行をロックする（同じグッズの同時のお世話で、レベルアップの特典を二重に数えないように）
  SELECT * INTO _row FROM public.companion_goods WHERE user_id = _uid AND user_item_id = _item FOR UPDATE;

  _done := CASE _action WHEN 'pat' THEN _row.last_pat_on WHEN 'polish' THEN _row.last_polish_on ELSE _row.last_photo_on END = _today;
  IF _done THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'xp', _row.xp, 'level', public.companion_level(_row.xp), 'leveled_up', false);
  END IF;

  _gain := CASE _action WHEN 'photo' THEN 3 ELSE 1 END;
  _old := public.companion_level(_row.xp);
  _new := public.companion_level(_row.xp + _gain);

  UPDATE public.companion_goods SET
    xp = xp + _gain,
    last_pat_on = CASE WHEN _action = 'pat' THEN _today ELSE last_pat_on END,
    last_polish_on = CASE WHEN _action = 'polish' THEN _today ELSE last_polish_on END,
    last_photo_on = CASE WHEN _action = 'photo' THEN _today ELSE last_photo_on END
  WHERE user_id = _uid AND user_item_id = _item;

  IF _new > _old THEN
    _rewards := public.companion_level_rewards(_uid, _item, _old, _new);
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'already', false, 'xp', _row.xp + _gain, 'gain', _gain, 'level', _new,
    'leveled_up', _new > _old, 'rewards', _rewards
  );
END $$;
REVOKE ALL ON FUNCTION public.companion_apply(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

-- プレゼント。中身は 20261012200000 と同じで、レベルアップの特典だけを入れ替える
CREATE OR REPLACE FUNCTION public.give_companion_gift(_user_item_id uuid, _kind text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'Asia/Tokyo')::date;
  _gift public.companion_gift_kinds%ROWTYPE;
  _row public.companion_goods%ROWTYPE;
  _used integer;
  _balance integer;
  _old integer;
  _new integer;
  _left integer;
  _rewards jsonb := NULL;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _gift FROM public.companion_gift_kinds WHERE kind = _kind AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_gift'; END IF;

  IF NOT public.is_oshi_goods(_uid, _user_item_id) THEN RAISE EXCEPTION 'not_companion'; END IF;
  INSERT INTO public.companion_goods (user_id, user_item_id) VALUES (_uid, _user_item_id)
  ON CONFLICT (user_id, user_item_id) DO NOTHING;

  -- ロックの順番は companion_apply と同じ「グッズ → 残高」（デッドロックを避ける）
  SELECT * INTO _row FROM public.companion_goods WHERE user_id = _uid AND user_item_id = _user_item_id FOR UPDATE;

  _old := public.companion_level(_row.xp);
  IF _old >= 10 THEN RAISE EXCEPTION 'max_level'; END IF;

  SELECT count(*) INTO _used FROM public.companion_gifts
   WHERE user_id = _uid AND user_item_id = _user_item_id AND kind = _gift.kind AND given_on = _today;
  IF _used >= _gift.daily_limit THEN RAISE EXCEPTION 'gift_daily_limit'; END IF;

  SELECT total_points INTO _balance FROM public.user_points WHERE user_id = _uid FOR UPDATE;
  IF COALESCE(_balance, 0) < _gift.price THEN RAISE EXCEPTION 'insufficient_points'; END IF;

  UPDATE public.user_points SET total_points = total_points - _gift.price, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.point_transactions (user_id, points, transaction_type, description, reference_id)
  VALUES (_uid, -_gift.price, 'companion_gift', '推しグッズに' || _gift.label || 'を贈った', _user_item_id);

  INSERT INTO public.companion_gifts (user_id, user_item_id, kind, points_spent, xp_gained, given_on)
  VALUES (_uid, _user_item_id, _gift.kind, _gift.price, _gift.xp, _today);

  _new := public.companion_level(_row.xp + _gift.xp);
  UPDATE public.companion_goods SET xp = xp + _gift.xp WHERE user_id = _uid AND user_item_id = _user_item_id;

  -- 特別なプレゼント（+12）は2つ上がることがある。間のレベルの特典もまとめて渡す
  IF _new > _old THEN
    _rewards := public.companion_level_rewards(_uid, _user_item_id, _old, _new);
  END IF;

  SELECT total_points INTO _left FROM public.user_points WHERE user_id = _uid;

  RETURN jsonb_build_object(
    'ok', true,
    'kind', _gift.kind,
    'xp', _row.xp + _gift.xp,
    'gain', _gift.xp,
    'level', _new,
    'leveled_up', _new > _old,
    'points_left', _left,
    'remaining_today', _gift.daily_limit - _used - 1,
    'rewards', _rewards
  );
END $$;
REVOKE ALL ON FUNCTION public.give_companion_gift(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.give_companion_gift(uuid, text) TO authenticated;

-- 部屋に置けるか: 無料（base）か、セットを持っているか、その物を単品で持っているか。
-- レベルの特典（lv3 など）はセットと同じ 'room:lvN' の鍵なので、ここは何も変えずに通る
CREATE OR REPLACE FUNCTION public.oshi_room_require_asset(_uid uuid, _key text, _kind text) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _set text;
BEGIN
  SELECT a.set_key INTO _set FROM public.oshi_room_assets a WHERE a.key = _key AND a.kind = _kind;
  IF _set IS NULL THEN
    RAISE EXCEPTION 'invalid_room_key';
  END IF;
  IF _set <> 'base' AND NOT EXISTS (
    SELECT 1 FROM public.user_unlocks u
     WHERE u.user_id = _uid AND u.unlock_key IN ('room:' || _set, 'room:' || _key)
  ) THEN
    RAISE EXCEPTION 'room_item_locked' USING ERRCODE = '42501';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.oshi_room_require_asset(uuid, text, text) FROM PUBLIC, anon, authenticated;

-- 図書室セットの説明を、アプリの名前（書斎の壁紙）にそろえる（…100000 では「本棚の壁紙」と書いていた）
UPDATE public.point_shop_items
   SET description = '書斎の壁紙・寄木の床・大きな本棚・地球儀と、アンティークの額縁'
 WHERE unlock_key = 'room:library';

-- さかのぼり: すでに Lv2 以上の推しグッズ（推しグッズから外して休んでいるものも含む。届いたレベルは消えないため）
DO $$
DECLARE
  _r record;
BEGIN
  FOR _r IN
    SELECT cg.user_id, cg.user_item_id, public.companion_level(cg.xp) AS lv
    FROM public.companion_goods cg
    JOIN public.user_items u ON u.id = cg.user_item_id AND u.user_id = cg.user_id
    WHERE public.companion_level(cg.xp) >= 2
    ORDER BY cg.user_id, cg.user_item_id
  LOOP
    PERFORM public.companion_level_rewards(_r.user_id, _r.user_item_id, 1, _r.lv, true);
  END LOOP;
END $$;
