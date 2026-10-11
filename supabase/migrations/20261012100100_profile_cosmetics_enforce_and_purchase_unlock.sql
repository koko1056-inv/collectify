-- =========================================================
-- 着せ替え（2/4）: 所持の確認と、ショップ購入 RPC の解放対応
--
-- purchase_shop_item の修正前の問題:
--   知らない item_type を `ELSE NULL` で素通しし、何も渡さずにポイントだけ引いていた
--   （例: 「グループ上限拡張 +50人」= group_expand）。知らない種別は引く前に例外にする。
-- =========================================================

-- 推し色は決まった色の中から選ぶ（任意の文字列を入れて表示を崩されないように）
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_oshi_color_check
  CHECK (profile_oshi_color IS NULL OR profile_oshi_color IN (
    'red', 'pink', 'orange', 'yellow', 'green', 'mint', 'sky', 'blue', 'purple', 'white'
  ));

-- 持っていない着せ替えは付けられない。値が変わったときだけ確かめるので、
-- ほかの列の更新（名前・自己紹介など）には影響しない。外す（NULL）のはいつでもできる。
CREATE OR REPLACE FUNCTION public.enforce_profile_cosmetics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.profile_cover_key IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.profile_cover_key IS DISTINCT FROM OLD.profile_cover_key) THEN
    IF NEW.profile_cover_key NOT LIKE 'cover:%'
       OR NOT EXISTS (
         SELECT 1 FROM public.user_unlocks
          WHERE user_id = NEW.id AND unlock_key = NEW.profile_cover_key
       ) THEN
      RAISE EXCEPTION 'Cosmetic not owned' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.avatar_frame_key IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.avatar_frame_key IS DISTINCT FROM OLD.avatar_frame_key) THEN
    IF NEW.avatar_frame_key NOT LIKE 'frame:%'
       OR NOT EXISTS (
         SELECT 1 FROM public.user_unlocks
          WHERE user_id = NEW.id AND unlock_key = NEW.avatar_frame_key
       ) THEN
      RAISE EXCEPTION 'Cosmetic not owned' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER profiles_enforce_cosmetics
  BEFORE INSERT OR UPDATE OF profile_cover_key, avatar_frame_key ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_cosmetics();

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

  -- 渡し方を知らない商品は、ポイントを引く前に断る
  IF _item.item_type NOT IN ('collection_slots', 'custom_tags', 'unlock') THEN
    RAISE EXCEPTION 'Unsupported shop item type: %', _item.item_type;
  END IF;

  -- 残高の行をロックして、同じ人の同時購入を直列にする（二重購入・二重消費を防ぐ）
  SELECT COALESCE(total_points, 0) INTO _current_points
    FROM public.user_points WHERE user_id = _uid FOR UPDATE;

  -- 買い切りの解放は、持っていたら引く前に断る
  IF _item.item_type = 'unlock' AND EXISTS (
    SELECT 1 FROM public.user_unlocks
     WHERE user_id = _uid AND unlock_key = _item.unlock_key
  ) THEN
    RAISE EXCEPTION 'Already owned';
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

GRANT EXECUTE ON FUNCTION public.purchase_shop_item(uuid) TO authenticated;
