-- =========================================================
-- 推しの部屋（2/2）: 保存（中身をすべて確かめる）と、プロフィールで見せる読み取り
--
-- layout の形（v1）。座標は部屋の絵の単位（横 360・縦 420。左上が 0,0。置いた物の「足もと中央」の位置）:
--   {
--     "v": 1,
--     "furniture": [ { "id": "f1", "key": "base.shelf", "x": 70, "y": 404, "z": 1, "s": 1, "flip": false }, ... ]  最大 20
--     "goods":     [ { "item": "<user_items.id>", "x": 180, "y": 396, "z": 3, "s": 1.2,
--                      "frame": "base.acrylic", "on": "f1" | null }, ... ]                                 最大 5
--   }
--  - id は家具ごとの名前（グッズを「どの家具の上に置いたか」を on で指すため）
--  - z は重なり順。s は大きさ（0.5〜2）。flip は左右反転
-- 知らないキー・範囲の外の値・買っていないセットの物・自分の物でないグッズは、保存させない。
-- =========================================================

-- 数（jsonb の number）で、範囲の中か。number 以外を numeric にしようとして落ちないよう CASE で分ける
CREATE OR REPLACE FUNCTION public.oshi_room_num_ok(_v jsonb, _lo numeric, _hi numeric) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN jsonb_typeof(_v) = 'number' THEN (_v #>> '{}')::numeric BETWEEN _lo AND _hi ELSE false END
$$;
REVOKE ALL ON FUNCTION public.oshi_room_num_ok(jsonb, numeric, numeric) FROM PUBLIC, anon, authenticated;

-- 目録にあって種類が合い、無料（base）か買ってあるか。だめなら例外（文言はアプリが見分ける）
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
    SELECT 1 FROM public.user_unlocks u WHERE u.user_id = _uid AND u.unlock_key = 'room:' || _set
  ) THEN
    RAISE EXCEPTION 'room_item_locked' USING ERRCODE = '42501';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.oshi_room_require_asset(uuid, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_oshi_room(_wallpaper_key text, _floor_key text, _layout jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _furniture jsonb;
  _goods jsonb;
  _f jsonb;
  _g jsonb;
  _fids text[] := ARRAY[]::text[];
  _items uuid[] := ARRAY[]::uuid[];
  _item uuid;
  _now timestamptz := now();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- 形と大きさ（中身を1つずつ見る前に、大きすぎるものは断る）
  IF _layout IS NULL OR jsonb_typeof(_layout) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_layout'; END IF;
  IF octet_length(_layout::text) > 12000 THEN RAISE EXCEPTION 'layout_too_large'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(_layout) k WHERE k NOT IN ('v', 'furniture', 'goods')) THEN
    RAISE EXCEPTION 'invalid_layout';
  END IF;
  IF (_layout -> 'v') IS DISTINCT FROM '1'::jsonb THEN RAISE EXCEPTION 'invalid_layout'; END IF;

  _furniture := coalesce(_layout -> 'furniture', '[]'::jsonb);
  _goods := coalesce(_layout -> 'goods', '[]'::jsonb);
  IF jsonb_typeof(_furniture) IS DISTINCT FROM 'array' OR jsonb_typeof(_goods) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'invalid_layout';
  END IF;
  IF jsonb_array_length(_furniture) > 20 THEN RAISE EXCEPTION 'too_many_furniture'; END IF;
  IF jsonb_array_length(_goods) > 5 THEN RAISE EXCEPTION 'too_many_goods'; END IF;

  PERFORM public.oshi_room_require_asset(_uid, _wallpaper_key, 'wallpaper');
  PERFORM public.oshi_room_require_asset(_uid, _floor_key, 'floor');

  -- 家具
  FOR _f IN SELECT value FROM jsonb_array_elements(_furniture) LOOP
    IF jsonb_typeof(_f) IS DISTINCT FROM 'object'
       OR EXISTS (SELECT 1 FROM jsonb_object_keys(_f) k WHERE k NOT IN ('id', 'key', 'x', 'y', 'z', 's', 'flip')) THEN
      RAISE EXCEPTION 'invalid_layout';
    END IF;
    IF jsonb_typeof(_f -> 'id') IS DISTINCT FROM 'string'
       OR NOT ((_f ->> 'id') ~ '^[a-z0-9_-]{1,24}$')
       OR (_f ->> 'id') = ANY (_fids) THEN
      RAISE EXCEPTION 'invalid_layout';
    END IF;
    _fids := _fids || (_f ->> 'id');
    IF jsonb_typeof(_f -> 'key') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_layout'; END IF;
    PERFORM public.oshi_room_require_asset(_uid, _f ->> 'key', 'furniture');
    IF NOT (
      public.oshi_room_num_ok(_f -> 'x', 0, 360)
      AND public.oshi_room_num_ok(_f -> 'y', 0, 420)
      AND public.oshi_room_num_ok(_f -> 'z', 0, 100)
      AND public.oshi_room_num_ok(_f -> 's', 0.5, 2)
    ) THEN
      RAISE EXCEPTION 'invalid_layout';
    END IF;
    IF _f ? 'flip' AND jsonb_typeof(_f -> 'flip') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid_layout'; END IF;
  END LOOP;

  -- グッズ（自分の持ち物だけ。推しグッズから外した物が残っていても、表示のときに読まれないだけなので許す）
  FOR _g IN SELECT value FROM jsonb_array_elements(_goods) LOOP
    IF jsonb_typeof(_g) IS DISTINCT FROM 'object'
       OR EXISTS (SELECT 1 FROM jsonb_object_keys(_g) k WHERE k NOT IN ('item', 'x', 'y', 'z', 's', 'frame', 'on')) THEN
      RAISE EXCEPTION 'invalid_layout';
    END IF;
    IF jsonb_typeof(_g -> 'item') IS DISTINCT FROM 'string'
       OR NOT ((_g ->> 'item') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') THEN
      RAISE EXCEPTION 'invalid_layout';
    END IF;
    _item := (_g ->> 'item')::uuid;
    IF _item = ANY (_items) THEN RAISE EXCEPTION 'invalid_layout'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.user_items u WHERE u.id = _item AND u.user_id = _uid) THEN
      RAISE EXCEPTION 'not_your_item';
    END IF;
    _items := _items || _item;
    IF jsonb_typeof(_g -> 'frame') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_layout'; END IF;
    PERFORM public.oshi_room_require_asset(_uid, _g ->> 'frame', 'frame');
    IF NOT (
      public.oshi_room_num_ok(_g -> 'x', 0, 360)
      AND public.oshi_room_num_ok(_g -> 'y', 0, 420)
      AND public.oshi_room_num_ok(_g -> 'z', 0, 100)
      AND public.oshi_room_num_ok(_g -> 's', 0.5, 2)
    ) THEN
      RAISE EXCEPTION 'invalid_layout';
    END IF;
    IF _g ? 'on' AND jsonb_typeof(_g -> 'on') IS DISTINCT FROM 'null'
       AND NOT (jsonb_typeof(_g -> 'on') = 'string' AND (_g ->> 'on') = ANY (_fids)) THEN
      RAISE EXCEPTION 'invalid_layout';
    END IF;
  END LOOP;

  INSERT INTO public.oshi_rooms AS r (user_id, wallpaper_key, floor_key, layout, updated_at)
  VALUES (_uid, _wallpaper_key, _floor_key, _layout, _now)
  ON CONFLICT (user_id) DO UPDATE
    SET wallpaper_key = EXCLUDED.wallpaper_key,
        floor_key = EXCLUDED.floor_key,
        layout = EXCLUDED.layout,
        updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object('ok', true, 'updated_at', _now);
END $$;
REVOKE ALL ON FUNCTION public.save_oshi_room(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_oshi_room(text, text, jsonb) TO authenticated;

-- 部屋を読む（本人もこれを使う）。見られるかはコレクションと同じ（can_view_collection: 本人 / 公開 / フォロワー限定でフォロー中）。
-- 見られないときは0行。見られるが、まだ部屋を保存していないときは、壁紙などが NULL の1行（アプリが基本の部屋を描く）。
-- グッズは「いま推しグッズの物」だけに絞って返す（外した物の id を他の人に見せない）。
-- 推し色はプロフィールの推し色（推し色セットの壁紙・床・家具の色に使う）
CREATE OR REPLACE FUNCTION public.get_profile_oshi_room(_profile_id uuid)
RETURNS TABLE (wallpaper_key text, floor_key text, layout jsonb, oshi_color text, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    r.wallpaper_key,
    r.floor_key,
    CASE WHEN r.layout IS NULL THEN NULL ELSE
      jsonb_set(r.layout, '{goods}', coalesce((
        SELECT jsonb_agg(g.value ORDER BY g.ord)
        FROM jsonb_array_elements(coalesce(r.layout -> 'goods', '[]'::jsonb)) WITH ORDINALITY AS g(value, ord)
        WHERE (g.value ->> 'item') = ANY (coalesce(p.favorite_item_ids, ARRAY[]::uuid[])::text[])
      ), '[]'::jsonb))
    END,
    p.profile_oshi_color,
    r.updated_at
  FROM public.profiles p
  LEFT JOIN public.oshi_rooms r ON r.user_id = p.id
  WHERE p.id = _profile_id
    AND public.can_view_collection(p.id);
$$;
REVOKE ALL ON FUNCTION public.get_profile_oshi_room(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_oshi_room(uuid) TO anon, authenticated;
