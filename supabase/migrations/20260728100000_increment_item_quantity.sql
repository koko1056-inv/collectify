-- =========================================================
-- 所持数の +1 をサーバー側で原子的に行う
--
-- クライアント側の incrementItemQuantity は
-- 「select quantity → quantity+1 で update」の read-modify-write だったため、
-- 連続タップや数量編集モーダルとの同時更新で1回分が失われうる。
--
-- あわせて、同じ公式グッズの user_items 行が複数ある場合
-- （追加経路に重複チェックが無かった時期のデータ）にも、
-- 合計所持数を返せるようにする。
-- =========================================================

CREATE OR REPLACE FUNCTION public.increment_item_quantity(
  _official_item_id uuid,
  _by integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _target uuid;
  _total integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _by <= 0 THEN
    RAISE EXCEPTION 'Invalid increment';
  END IF;

  -- 対象行をロックしてから更新する（読んで書くまでの間に割り込まれないように）
  SELECT id INTO _target
    FROM public.user_items
   WHERE user_id = _uid AND official_item_id = _official_item_id
   ORDER BY created_at ASC
   LIMIT 1
     FOR UPDATE;

  IF _target IS NULL THEN
    RETURN jsonb_build_object('success', false, 'not_found', true);
  END IF;

  UPDATE public.user_items
     SET quantity = COALESCE(quantity, 1) + _by
   WHERE id = _target;

  -- 同じ公式グッズの行が複数ある場合も合計で返す
  SELECT COALESCE(SUM(COALESCE(quantity, 1)), 0) INTO _total
    FROM public.user_items
   WHERE user_id = _uid AND official_item_id = _official_item_id;

  RETURN jsonb_build_object('success', true, 'quantity', _total);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.increment_item_quantity(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_item_quantity(uuid, integer) TO authenticated;
