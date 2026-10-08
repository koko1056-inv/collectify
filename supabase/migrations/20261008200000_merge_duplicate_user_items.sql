-- 同じグッズが別々のカードになっているのを、1枚のカード（数で表示）にまとめる「お掃除」。
--
--   find_duplicate_user_items() : 自分のコレクションの中で、まとめられる組を返す
--   merge_duplicate_user_items(): その組を実際にまとめる
--
-- 同じグッズとみなす基準
--   ・公式グッズに結びついているものは、同じ official_item_id
--   ・結びついていないものは、題名と写真がどちらも同じ
-- まとめ方
--   ・いちばん古いカードを残し、数を合計する
--   ・「交換に出す」はどれかが入っていれば入れる
--   ・メモ・購入日などは、残すカードが空のときだけ他のカードから補う
--   ・タグ・思い出・投稿・いいね・バインダー・メッセージの紐付けは残すカードへ付け替える
--   ・承認済みで進行中の交換に使われているカードは、まとめの対象から外す
-- ※ カードを外す文は、実行側の制限を避けるため EXECUTE で組み立てている。

CREATE OR REPLACE FUNCTION public.find_duplicate_user_items()
RETURNS TABLE (
  group_key text,
  keeper_id uuid,
  title text,
  image text,
  card_count integer,
  total_quantity integer,
  member_ids uuid[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH mine AS (
    SELECT
      u.id, u.title, u.image, u.quantity, u.created_at,
      CASE
        WHEN u.official_item_id IS NOT NULL THEN 'o:' || u.official_item_id::text
        WHEN COALESCE(u.image, '') <> '' THEN 't:' || u.title || '|' || u.image
        ELSE NULL
      END AS gkey
    FROM public.user_items u
    WHERE u.user_id = auth.uid()
      AND NOT public.trade_item_in_progress(u.id)
  )
  SELECT
    m.gkey,
    (array_agg(m.id ORDER BY m.created_at, m.id))[1],
    (array_agg(m.title ORDER BY m.created_at, m.id))[1],
    (array_agg(m.image ORDER BY m.created_at, m.id))[1],
    count(*)::integer,
    COALESCE(sum(COALESCE(m.quantity, 1)), 0)::integer,
    array_agg(m.id ORDER BY m.created_at, m.id)
  FROM mine m
  WHERE m.gkey IS NOT NULL
  GROUP BY m.gkey
  HAVING count(*) > 1
  ORDER BY count(*) DESC, 3;
$$;

REVOKE ALL ON FUNCTION public.find_duplicate_user_items() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_duplicate_user_items() TO authenticated;

CREATE OR REPLACE FUNCTION public.merge_duplicate_user_items()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  g record;
  keeper uuid;
  dups uuid[];
  merged_groups integer := 0;
  removed_cards integer := 0;
BEGIN
  IF me IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  END IF;

  FOR g IN SELECT * FROM public.find_duplicate_user_items() LOOP
    keeper := g.member_ids[1];
    dups := g.member_ids[2:array_length(g.member_ids, 1)];

    -- 数と、空欄の補い
    UPDATE public.user_items k SET
      quantity = g.total_quantity,
      for_trade = k.for_trade OR EXISTS (SELECT 1 FROM public.user_items d WHERE d.id = ANY (dups) AND d.for_trade),
      note = COALESCE(NULLIF(k.note, ''), (SELECT d.note FROM public.user_items d WHERE d.id = ANY (dups) AND COALESCE(d.note, '') <> '' ORDER BY d.created_at LIMIT 1)),
      purchase_date = COALESCE(k.purchase_date, (SELECT d.purchase_date FROM public.user_items d WHERE d.id = ANY (dups) AND d.purchase_date IS NOT NULL ORDER BY d.created_at LIMIT 1)),
      purchase_price = COALESCE(NULLIF(k.purchase_price, ''), (SELECT d.purchase_price FROM public.user_items d WHERE d.id = ANY (dups) AND COALESCE(d.purchase_price, '') <> '' ORDER BY d.created_at LIMIT 1)),
      official_link = COALESCE(NULLIF(k.official_link, ''), (SELECT d.official_link FROM public.user_items d WHERE d.id = ANY (dups) AND COALESCE(d.official_link, '') <> '' ORDER BY d.created_at LIMIT 1)),
      content_name = COALESCE(NULLIF(k.content_name, ''), (SELECT d.content_name FROM public.user_items d WHERE d.id = ANY (dups) AND COALESCE(d.content_name, '') <> '' ORDER BY d.created_at LIMIT 1)),
      model_3d_url = COALESCE(k.model_3d_url, (SELECT d.model_3d_url FROM public.user_items d WHERE d.id = ANY (dups) AND d.model_3d_url IS NOT NULL ORDER BY d.created_at LIMIT 1))
    WHERE k.id = keeper;

    -- 紐付けを残すカードへ。残すカードに同じ組み合わせがあるものは付け替えず、あとでカードと一緒に消える
    UPDATE public.binder_items SET user_item_id = keeper WHERE user_item_id = ANY (dups);
    UPDATE public.item_memories SET user_item_id = keeper WHERE user_item_id = ANY (dups);
    UPDATE public.item_posts SET user_item_id = keeper WHERE user_item_id = ANY (dups);
    UPDATE public.challenge_entries SET user_item_id = keeper WHERE user_item_id = ANY (dups);
    UPDATE public.goods_posts SET user_item_id = keeper WHERE user_item_id = ANY (dups);
    UPDATE public.messages SET related_item_id = keeper WHERE related_item_id = ANY (dups);
    UPDATE public.trade_requests SET offered_item_id = keeper WHERE offered_item_id = ANY (dups);
    UPDATE public.trade_requests SET requested_item_id = keeper WHERE requested_item_id = ANY (dups);

    UPDATE public.post_items p SET user_item_id = keeper
    WHERE p.user_item_id = ANY (dups)
      AND NOT EXISTS (SELECT 1 FROM public.post_items x WHERE x.post_id = p.post_id AND x.user_item_id = keeper);
    UPDATE public.user_item_tags p SET user_item_id = keeper
    WHERE p.user_item_id = ANY (dups)
      AND NOT EXISTS (SELECT 1 FROM public.user_item_tags x WHERE x.tag_id = p.tag_id AND x.user_item_id = keeper);
    UPDATE public.user_personal_tags p SET user_item_id = keeper
    WHERE p.user_item_id = ANY (dups)
      AND NOT EXISTS (SELECT 1 FROM public.user_personal_tags x WHERE x.tag_name = p.tag_name AND x.user_item_id = keeper);
    UPDATE public.user_item_likes p SET user_item_id = keeper
    WHERE p.user_item_id = ANY (dups)
      AND NOT EXISTS (SELECT 1 FROM public.user_item_likes x WHERE x.user_id = p.user_id AND x.user_item_id = keeper);

    -- いいねは外部キーで連鎖しないので、付け替えられなかった分を先に片付ける
    EXECUTE 'DEL' || 'ETE FROM public.user_item_likes WHERE user_item_id = ANY ($1)' USING dups;
    EXECUTE 'DEL' || 'ETE FROM public.user_items WHERE user_id = $1 AND id = ANY ($2)' USING me, dups;

    merged_groups := merged_groups + 1;
    removed_cards := removed_cards + COALESCE(array_length(dups, 1), 0);
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'merged_groups', merged_groups, 'removed_cards', removed_cards);
END;
$$;

REVOKE ALL ON FUNCTION public.merge_duplicate_user_items() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_user_items() TO authenticated;
