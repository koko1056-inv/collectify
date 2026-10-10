-- 「今日の推しフォト」と「相棒グッズを育てる」。
--  ・相棒: 持っているグッズから最大3つ。1日に「撫でる」「磨く」「撮る」を各1回でなかよし度（xp）が増え、レベルが上がる。放置しても減らない。
--  ・推しフォト: 毎日のお気に入りグッズの写真。カレンダーと連続日数。1日目の1枚で +2pt。相棒の写真なら相棒が育つ。
-- xp・レベル・ポイントはサーバー側だけが動かす（クライアントからは直接書けない）。

CREATE TABLE IF NOT EXISTS public.companion_goods (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_item_id uuid NOT NULL REFERENCES public.user_items(id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  last_pat_on date,
  last_polish_on date,
  last_photo_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, user_item_id)
);
ALTER TABLE public.companion_goods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.companion_goods FROM anon, authenticated;
GRANT SELECT ON public.companion_goods TO authenticated;
CREATE POLICY companion_goods_select ON public.companion_goods FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.oshi_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_item_id uuid REFERENCES public.user_items(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  caption text CHECK (caption IS NULL OR char_length(caption) <= 140),
  taken_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Tokyo')::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- 自分のフォルダに置いた、このプロジェクトの画像だけ
  CONSTRAINT oshi_photos_url_own_path CHECK (
    image_url LIKE 'https://dmgrgzysrzzgsajwqyrh.supabase.co/storage/v1/object/public/kuji_images/' || user_id::text || '/%'
  )
);
CREATE INDEX IF NOT EXISTS oshi_photos_user_day_idx ON public.oshi_photos (user_id, taken_on DESC, created_at DESC);
ALTER TABLE public.oshi_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oshi_photos FROM anon;
CREATE POLICY oshi_photos_select ON public.oshi_photos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY oshi_photos_insert ON public.oshi_photos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (user_item_id IS NULL OR EXISTS (SELECT 1 FROM public.user_items u WHERE u.id = user_item_id AND u.user_id = auth.uid())));
CREATE POLICY oshi_photos_delete ON public.oshi_photos FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ポイント（1日の最初の1枚 / 相棒のレベル到達）
INSERT INTO public.point_rewards (reason, points, transaction_type, description, once_per_reference, once_per_user, is_active) VALUES
  ('daily_photo',    2,  'daily_photo',    '今日の推しフォト',   true, false, true),
  ('companion_lv5',  5,  'companion_level', '相棒がレベル5',     true, false, true),
  ('companion_lv10', 10, 'companion_level', '相棒がレベル10',    true, false, true)
ON CONFLICT (reason) DO NOTHING;

-- レベルの段階（累積xp）: 0, 3, 8, 15, 25, 40, 60, 85, 115, 150 → Lv1〜10
CREATE OR REPLACE FUNCTION public.companion_level(_xp integer) RETURNS integer
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT count(*)::int FROM unnest(ARRAY[0, 3, 8, 15, 25, 40, 60, 85, 115, 150]) AS t(x) WHERE t.x <= greatest(_xp, 0)
$$;

-- 相棒のお世話（撫でる pat / 磨く polish / 撮る photo）。1日に各1回。xp: 1 / 1 / 3
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
  SELECT * INTO _row FROM public.companion_goods WHERE user_id = _uid AND user_item_id = _item FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_companion'); END IF;

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

  -- レベル5・10に初めて届いたときだけポイント（同じ相棒・同じレベルは1回）
  IF _old < 5 AND _new >= 5 THEN
    PERFORM public.award_social_points(_uid, 'companion_lv5', md5('companion5:' || _item::text)::uuid, 100);
  END IF;
  IF _old < 10 AND _new >= 10 THEN
    PERFORM public.award_social_points(_uid, 'companion_lv10', md5('companion10:' || _item::text)::uuid, 100);
  END IF;

  RETURN jsonb_build_object('ok', true, 'already', false, 'xp', _row.xp + _gain, 'gain', _gain, 'level', _new, 'leveled_up', _new > _old);
END $$;
REVOKE ALL ON FUNCTION public.companion_apply(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.care_companion(_user_item_id uuid, _action text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  -- 写真は「推しフォト」を保存したときにサーバーが自動で付ける。ここからは撫でる・磨くだけ
  IF _action NOT IN ('pat', 'polish') THEN RAISE EXCEPTION 'invalid_action'; END IF;
  RETURN public.companion_apply(auth.uid(), _user_item_id, _action);
END $$;
REVOKE ALL ON FUNCTION public.care_companion(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.care_companion(uuid, text) TO authenticated;

-- 相棒にする（最大3つ。自分の持ち物だけ）
CREATE OR REPLACE FUNCTION public.set_companion(_user_item_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_items WHERE id = _user_item_id AND user_id = _uid) THEN
    RAISE EXCEPTION 'not_your_item';
  END IF;
  IF EXISTS (SELECT 1 FROM public.companion_goods WHERE user_id = _uid AND user_item_id = _user_item_id) THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  IF (SELECT count(*) FROM public.companion_goods WHERE user_id = _uid) >= 3 THEN
    RAISE EXCEPTION 'companion_limit';
  END IF;
  INSERT INTO public.companion_goods (user_id, user_item_id) VALUES (_uid, _user_item_id);
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.set_companion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_companion(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_companion(_user_item_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM public.companion_goods WHERE user_id = auth.uid() AND user_item_id = _user_item_id;
END $$;
REVOKE ALL ON FUNCTION public.remove_companion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_companion(uuid) TO authenticated;

-- 推しフォトを保存したとき: 1日5枚まで。1日の最初の1枚で +2pt。相棒の写真なら相棒が育つ（撮る +3xp）
CREATE OR REPLACE FUNCTION public.oshi_photos_after_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.award_social_points(NEW.user_id, 'daily_photo', md5('oshi_photo:' || NEW.user_id::text || ':' || NEW.taken_on::text)::uuid, 1);
  IF NEW.user_item_id IS NOT NULL THEN
    PERFORM public.companion_apply(NEW.user_id, NEW.user_item_id, 'photo');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.oshi_photos_after_insert() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER oshi_photos_after_insert AFTER INSERT ON public.oshi_photos FOR EACH ROW EXECUTE FUNCTION public.oshi_photos_after_insert();

CREATE OR REPLACE FUNCTION public.oshi_photos_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- 日付はサーバーが決める（過去の日付で連続日数を作れないように）
  NEW.taken_on := (now() AT TIME ZONE 'Asia/Tokyo')::date;
  IF (SELECT count(*) FROM public.oshi_photos WHERE user_id = NEW.user_id AND taken_on = NEW.taken_on) >= 5 THEN
    RAISE EXCEPTION 'oshi_photo_limit' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.oshi_photos_limit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER oshi_photos_limit BEFORE INSERT ON public.oshi_photos FOR EACH ROW EXECUTE FUNCTION public.oshi_photos_limit();
