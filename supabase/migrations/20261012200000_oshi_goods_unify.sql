-- 「お気に入りTOP5」と「相棒グッズ」を、1つの「推しグッズ」（最大5つ・順位つき）にまとめる。
--
-- 以前は2つが別々だった:
--  ・お気に入りTOP5: profiles.favorite_item_ids（user_items の id の配列。順番 = 順位）。プロフィールに飾るだけ
--  ・相棒グッズ: companion_goods（最大3つ）。推しフォトの画面で撫でる・磨く・プレゼントで育てる
-- どちらも「いちばん好きなグッズを選ぶ」ものなのに、選ぶ場所も数も見せ方もちがい、利用者には区別がつかなかった。
--
-- これからは:
--  ・選ぶのと順位: profiles.favorite_item_ids だけが正（最大5つ）
--  ・育ち具合（なかよし度 xp・今日のお世話）: companion_goods に user_item_id ごとに持つ
--  ・推しグッズから外しても companion_goods の行は消さない（また選べば、なかよし度が戻る）。
--    外した行は「休んでいる」扱いで、お世話・プレゼントはできない（is_oshi_goods で確かめる）
--
-- 選んだときに companion_goods の行を作るのは、profiles のトリガーにする（RPC にしない）。
--  理由: いま配っているアプリは profiles.favorite_item_ids を直接 update して保存している。
--  RPC にすると、古いアプリから保存したときに行ができず、育てられない推しグッズが生まれる。
--  トリガーなら、どこから保存しても「選んだ = 育てられる」が必ず揃う。
--  ついでに、保存された配列をサーバーで整える（重複・自分の物でない id を除き、5つまで）。
--  以前は任意の uuid を5つ入れるだけで、はじめてガイドの「お気に入りTOP5」を達成できた。

-- 配列を整える: 自分の持ち物だけ・重複なし・順番はそのまま・5つまで
CREATE OR REPLACE FUNCTION public.normalize_oshi_goods(_uid uuid, _ids uuid[]) RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(array_agg(s.id ORDER BY s.ord), ARRAY[]::uuid[])
  FROM (
    SELECT d.id, d.ord
    FROM (
      SELECT DISTINCT ON (f.id) f.id, f.ord
      FROM unnest(coalesce(_ids, ARRAY[]::uuid[])) WITH ORDINALITY AS f(id, ord)
      JOIN public.user_items u ON u.id = f.id AND u.user_id = _uid
      ORDER BY f.id, f.ord
    ) d
    ORDER BY d.ord
    LIMIT 5
  ) s
$$;
REVOKE ALL ON FUNCTION public.normalize_oshi_goods(uuid, uuid[]) FROM PUBLIC, anon, authenticated;

-- いま推しグッズか（選ばれていて、まだ自分の持ち物）。お世話・プレゼントの前に確かめる
CREATE OR REPLACE FUNCTION public.is_oshi_goods(_uid uuid, _item uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_items u ON u.id = _item AND u.user_id = p.id
    WHERE p.id = _uid AND _item = ANY (p.favorite_item_ids)
  )
$$;
REVOKE ALL ON FUNCTION public.is_oshi_goods(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- RLS から使う版（他の人の推しグッズを探れないよう、本人の分だけ）
CREATE OR REPLACE FUNCTION public.is_my_oshi_goods(_item uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND public.is_oshi_goods(auth.uid(), _item)
$$;
REVOKE ALL ON FUNCTION public.is_my_oshi_goods(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_my_oshi_goods(uuid) TO authenticated;

-- favorite_item_ids を保存したとき: 整えて、育ち具合の行を用意する（すでにあれば xp はそのまま）
CREATE OR REPLACE FUNCTION public.profiles_oshi_goods_sync() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.favorite_item_ids IS NOT DISTINCT FROM OLD.favorite_item_ids THEN
    RETURN NEW;
  END IF;
  NEW.favorite_item_ids := public.normalize_oshi_goods(NEW.id, NEW.favorite_item_ids);
  INSERT INTO public.companion_goods (user_id, user_item_id)
  SELECT NEW.id, x FROM unnest(NEW.favorite_item_ids) AS x
  ON CONFLICT (user_id, user_item_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.profiles_oshi_goods_sync() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE TRIGGER profiles_oshi_goods_sync
  BEFORE INSERT OR UPDATE OF favorite_item_ids ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_oshi_goods_sync();

-- グッズを消したら推しグッズからも外す（以前は消えた id が配列に残り、見えない枠を1つふさいでいた）
CREATE OR REPLACE FUNCTION public.user_items_leave_oshi_goods() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.profiles
     SET favorite_item_ids = array_remove(favorite_item_ids, OLD.id)
   WHERE id = OLD.user_id AND OLD.id = ANY (favorite_item_ids);
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.user_items_leave_oshi_goods() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE TRIGGER user_items_leave_oshi_goods
  AFTER DELETE ON public.user_items
  FOR EACH ROW EXECUTE FUNCTION public.user_items_leave_oshi_goods();

-- 休んでいる行（推しグッズから外したもの）は、アプリからは見せない。
-- 古いアプリの推しフォト画面は companion_goods を直接読むので、ここで絞ると古いアプリでも推しグッズだけが並ぶ
ALTER POLICY companion_goods_select ON public.companion_goods
  USING (user_id = auth.uid() AND public.is_my_oshi_goods(user_item_id));

-- お世話（撫でる・磨く・撮る）。いまの推しグッズだけ。
-- 以前は companion_goods に行があれば育てられた。行は外しても残すので、推しグッズかどうかを確かめる
CREATE OR REPLACE FUNCTION public.companion_apply(_uid uuid, _item uuid, _action text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'Asia/Tokyo')::date;
  _row public.companion_goods%ROWTYPE;
  _gain integer;
  _old integer;
  _new integer;
  _done boolean;
BEGIN
  IF _action NOT IN ('pat', 'polish', 'photo') THEN RAISE EXCEPTION 'invalid_action'; END IF;
  -- 推しフォトの保存からも呼ばれる。推しグッズでなければ何もしない（写真の保存は止めない）
  IF NOT public.is_oshi_goods(_uid, _item) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_companion');
  END IF;
  -- 行はトリガーが作るが、念のため（作られる前の推しグッズでも育てられるように）
  INSERT INTO public.companion_goods (user_id, user_item_id) VALUES (_uid, _item)
  ON CONFLICT (user_id, user_item_id) DO NOTHING;
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

  -- レベル5・10に初めて届いたときだけポイント（同じグッズ・同じレベルは1回）
  IF _old < 5 AND _new >= 5 THEN
    PERFORM public.award_social_points(_uid, 'companion_lv5', md5('companion5:' || _item::text)::uuid, 100);
  END IF;
  IF _old < 10 AND _new >= 10 THEN
    PERFORM public.award_social_points(_uid, 'companion_lv10', md5('companion10:' || _item::text)::uuid, 100);
  END IF;

  RETURN jsonb_build_object('ok', true, 'already', false, 'xp', _row.xp + _gain, 'gain', _gain, 'level', _new, 'leveled_up', _new > _old);
END $$;
REVOKE ALL ON FUNCTION public.companion_apply(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

-- プレゼント。いまの推しグッズだけ（エラーの文言はアプリが見分けるので not_companion のまま）
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

  -- 以前は companion_goods に行があれば贈れた。外した推しグッズの行も残すので、いまの推しグッズかを確かめる
  IF NOT public.is_oshi_goods(_uid, _user_item_id) THEN RAISE EXCEPTION 'not_companion'; END IF;
  INSERT INTO public.companion_goods (user_id, user_item_id) VALUES (_uid, _user_item_id)
  ON CONFLICT (user_id, user_item_id) DO NOTHING;

  -- 行を先にロックする（同じグッズへの同時の贈り物で、1日の回数を超えないように）。
  -- ロックの順番は companion_apply と同じ「グッズ → 残高」にして、デッドロックを避ける
  SELECT * INTO _row FROM public.companion_goods WHERE user_id = _uid AND user_item_id = _user_item_id FOR UPDATE;

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
  VALUES (_uid, -_gift.price, 'companion_gift', '推しグッズに' || _gift.label || 'を贈った', _user_item_id);

  INSERT INTO public.companion_gifts (user_id, user_item_id, kind, points_spent, xp_gained, given_on)
  VALUES (_uid, _user_item_id, _gift.kind, _gift.price, _gift.xp, _today);

  _new := public.companion_level(_row.xp + _gift.xp);
  UPDATE public.companion_goods SET xp = xp + _gift.xp WHERE user_id = _uid AND user_item_id = _user_item_id;

  -- レベル5・10の到達ボーナスは、お世話で届いたときと同じ（同じグッズ・同じレベルは1回）
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

-- 古いアプリの「相棒を迎える」「はずす」。推しグッズの配列を書き換える形にして残す（新しいアプリは使わない）。
-- 迎える = 最後に足す（5つでいっぱいなら companion_limit）。はずす = 配列から外すだけ（なかよし度は残る）
CREATE OR REPLACE FUNCTION public.set_companion(_user_item_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _ids uuid[];
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_items WHERE id = _user_item_id AND user_id = _uid) THEN
    RAISE EXCEPTION 'not_your_item';
  END IF;
  SELECT public.normalize_oshi_goods(_uid, favorite_item_ids) INTO _ids FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _user_item_id = ANY (coalesce(_ids, ARRAY[]::uuid[])) THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  IF coalesce(array_length(_ids, 1), 0) >= 5 THEN
    RAISE EXCEPTION 'companion_limit';
  END IF;
  UPDATE public.profiles SET favorite_item_ids = coalesce(_ids, ARRAY[]::uuid[]) || _user_item_id WHERE id = _uid;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.set_companion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_companion(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_companion(_user_item_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  -- 以前は companion_goods の行を消して、なかよし度もなくなった。いまは推しグッズから外すだけ
  UPDATE public.profiles
     SET favorite_item_ids = array_remove(favorite_item_ids, _user_item_id)
   WHERE id = auth.uid() AND _user_item_id = ANY (favorite_item_ids);
END $$;
REVOKE ALL ON FUNCTION public.remove_companion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_companion(uuid) TO authenticated;

-- 自分の推しグッズ（順位の順）と、育ち具合・今日のお世話。推しフォトの画面で使う
CREATE OR REPLACE FUNCTION public.get_my_oshi_goods()
RETURNS TABLE (
  rank_no integer, user_item_id uuid, title text, image text, content_name text,
  xp integer, level integer, last_pat_on date, last_polish_on date, last_photo_on date
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (row_number() OVER (ORDER BY f.ord))::int, ui.id, ui.title, ui.image, ui.content_name,
         coalesce(cg.xp, 0), public.companion_level(coalesce(cg.xp, 0)),
         cg.last_pat_on, cg.last_polish_on, cg.last_photo_on
  FROM public.profiles p
  CROSS JOIN LATERAL unnest(p.favorite_item_ids) WITH ORDINALITY AS f(id, ord)
  JOIN public.user_items ui ON ui.id = f.id AND ui.user_id = p.id
  LEFT JOIN public.companion_goods cg ON cg.user_id = p.id AND cg.user_item_id = f.id
  WHERE p.id = auth.uid()
  ORDER BY f.ord
  LIMIT 5;
$$;
REVOKE ALL ON FUNCTION public.get_my_oshi_goods() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_oshi_goods() TO authenticated;

-- プロフィールに出す推しグッズ（順位の順・最大5つ）。表示に要る列だけ。
-- 見られるかどうかは以前の get_profile_companions と同じ（profiles の RLS と同じ）: 本人 / 公開 / フォロワー限定でフォロー中
CREATE OR REPLACE FUNCTION public.get_profile_oshi_goods(_profile_id uuid)
RETURNS TABLE (rank_no integer, user_item_id uuid, title text, image text, content_name text, xp integer, level integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (row_number() OVER (ORDER BY f.ord))::int, ui.id, ui.title, ui.image, ui.content_name,
         coalesce(cg.xp, 0), public.companion_level(coalesce(cg.xp, 0))
  FROM public.profiles p
  CROSS JOIN LATERAL unnest(p.favorite_item_ids) WITH ORDINALITY AS f(id, ord)
  JOIN public.user_items ui ON ui.id = f.id AND ui.user_id = p.id
  LEFT JOIN public.companion_goods cg ON cg.user_id = p.id AND cg.user_item_id = f.id
  WHERE p.id = _profile_id
    AND (
      p.id = auth.uid()
      OR p.privacy_level = 'public'
      OR (p.privacy_level = 'followers' AND public.is_follower(p.id))
    )
  ORDER BY f.ord
  LIMIT 5;
$$;
REVOKE ALL ON FUNCTION public.get_profile_oshi_goods(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_oshi_goods(uuid) TO anon, authenticated;

-- 古いアプリ向け。形はそのまま（順位の列なし）で、中身を推しグッズにする
CREATE OR REPLACE FUNCTION public.get_profile_companions(_profile_id uuid)
RETURNS TABLE (user_item_id uuid, title text, image text, content_name text, xp integer, level integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT g.user_item_id, g.title, g.image, g.content_name, g.xp, g.level
  FROM public.get_profile_oshi_goods(_profile_id) g
  ORDER BY g.rank_no;
$$;
REVOKE ALL ON FUNCTION public.get_profile_companions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_companions(uuid) TO anon, authenticated;
