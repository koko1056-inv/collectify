-- 相棒グッズに「プレゼントを贈る」RPC と、プロフィールに相棒を出す RPC。
-- 表（companion_gift_kinds / companion_gifts）と値段の理由は 20261011800000_companion_gifts.sql を参照。

-- プレゼントを贈る。残高の確認・減算・履歴・回数の確認・xp の加算を1つのトランザクションで行う。
-- エラー（RAISE の文言をクライアントが見分ける）:
--   invalid_gift / not_companion（自分の相棒ではない）/ max_level / gift_daily_limit / insufficient_points
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
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _gift FROM public.companion_gift_kinds WHERE kind = _kind AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_gift'; END IF;

  -- 相棒の行を先にロックする（同じ相棒への同時の贈り物で、1日の回数を超えないように）。
  -- ロックの順番は companion_apply と同じ「相棒 → 残高」にして、デッドロックを避ける
  SELECT * INTO _row FROM public.companion_goods WHERE user_id = _uid AND user_item_id = _user_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_companion'; END IF;

  _old := public.companion_level(_row.xp);
  -- 最大レベルではもう上がらないので、ポイントだけ減らないように断る
  IF _old >= 10 THEN RAISE EXCEPTION 'max_level'; END IF;

  SELECT count(*) INTO _used FROM public.companion_gifts
   WHERE user_id = _uid AND user_item_id = _user_item_id AND kind = _gift.kind AND given_on = _today;
  IF _used >= _gift.daily_limit THEN RAISE EXCEPTION 'gift_daily_limit'; END IF;

  SELECT total_points INTO _balance FROM public.user_points WHERE user_id = _uid FOR UPDATE;
  IF COALESCE(_balance, 0) < _gift.price THEN RAISE EXCEPTION 'insufficient_points'; END IF;

  UPDATE public.user_points SET total_points = total_points - _gift.price, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.point_transactions (user_id, points, transaction_type, description, reference_id)
  VALUES (_uid, -_gift.price, 'companion_gift', '相棒に' || _gift.label || 'を贈った', _user_item_id);

  INSERT INTO public.companion_gifts (user_id, user_item_id, kind, points_spent, xp_gained, given_on)
  VALUES (_uid, _user_item_id, _gift.kind, _gift.price, _gift.xp, _today);

  _new := public.companion_level(_row.xp + _gift.xp);
  UPDATE public.companion_goods SET xp = xp + _gift.xp WHERE user_id = _uid AND user_item_id = _user_item_id;

  -- レベル5・10の到達ボーナスは、お世話で届いたときと同じ（同じ相棒・同じレベルは1回）
  IF _old < 5 AND _new >= 5 THEN
    PERFORM public.award_social_points(_uid, 'companion_lv5', md5('companion5:' || _user_item_id::text)::uuid, 100);
  END IF;
  IF _old < 10 AND _new >= 10 THEN
    PERFORM public.award_social_points(_uid, 'companion_lv10', md5('companion10:' || _user_item_id::text)::uuid, 100);
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
    'remaining_today', _gift.daily_limit - _used - 1
  );
END $$;
REVOKE ALL ON FUNCTION public.give_companion_gift(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.give_companion_gift(uuid, text) TO authenticated;

-- プロフィールに出す相棒（最大3つ）。
-- companion_goods の RLS は本人だけなので、表示に要る列（グッズの名前・写真・なかよし度）だけを返す関数を用意する。
-- 見られるかどうかは profiles の RLS（get_profile_featured_avatar と同じ）: 本人 / 公開 / フォロワー限定でフォロー中
CREATE OR REPLACE FUNCTION public.get_profile_companions(_profile_id uuid)
RETURNS TABLE (user_item_id uuid, title text, image text, content_name text, xp integer, level integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT cg.user_item_id, ui.title, ui.image, ui.content_name, cg.xp, public.companion_level(cg.xp)
  FROM public.profiles p
  JOIN public.companion_goods cg ON cg.user_id = p.id
  JOIN public.user_items ui ON ui.id = cg.user_item_id AND ui.user_id = p.id
  WHERE p.id = _profile_id
    AND (
      p.id = auth.uid()
      OR p.privacy_level = 'public'
      OR (p.privacy_level = 'followers' AND public.is_follower(p.id))
    )
  ORDER BY cg.created_at ASC
  LIMIT 3;
$$;
REVOKE ALL ON FUNCTION public.get_profile_companions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_companions(uuid) TO anon, authenticated;
