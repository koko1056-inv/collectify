-- カタログの重複を統合できるようにする
--
-- マッチングは official_item_id を鍵にして突き合わせる。
-- つまり、同じグッズが「アクリルスタンド 初音ミク」と
-- 「アクリルスタンド　初音ミク（マジカルミライ）」の2件に分かれていると、
-- 片方を持っている人と、もう片方を欲しがっている人は永久に出会えない。
-- 交換を主軸にするなら、重複の統合は後回しにできない。
--
-- 統合しても行は消さない。merged_into に統合先を書いて隠すだけにする。
-- 消してしまうと、間違えたときに戻せないし、
-- 参照している行が芋づるで消える（部屋の書き込みなど）。

-- ---------------------------------------------------------------------------
-- 1. 統合先を指す列
-- ---------------------------------------------------------------------------

ALTER TABLE public.official_items
  ADD COLUMN IF NOT EXISTS merged_into uuid REFERENCES public.official_items(id);

COMMENT ON COLUMN public.official_items.merged_into IS
  '重複として別のグッズに統合された場合の統合先。NULL でないものは一覧に出さない。';

CREATE INDEX IF NOT EXISTS idx_official_items_not_merged
  ON public.official_items (created_at DESC)
  WHERE merged_into IS NULL;

-- ---------------------------------------------------------------------------
-- 2. 重複候補を洗い出す
-- ---------------------------------------------------------------------------

-- 表記ゆれを均した見出しで突き合わせる。
-- 全角空白・記号・大小文字を落として、残った文字列が同じなら候補とみなす。
CREATE OR REPLACE FUNCTION public.normalize_item_title(_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(
    lower(translate(COALESCE(_title, ''),
      '　０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ',
      ' 0123456789abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz')),
    '[[:space:]・･,、。（）()【】\[\]「」『』"''‘’“”\-–—:：/／!！?？~〜]', '', 'g'
  );
$$;

-- 管理画面で使う。同じ見出しに複数の行がある組だけを返す。
--
-- 見出しが完全に一致する組しか拾えない。「（再販）」が付いただけの重複などは
-- ここには出てこないので、管理画面には手で探して統合する道も用意してある。
CREATE OR REPLACE FUNCTION public.find_duplicate_official_items(_limit integer DEFAULT 50)
RETURNS TABLE (
  normalized text,
  item_count integer,
  items jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH live AS (
    SELECT oi.id, oi.title, oi.image, oi.content_name, oi.created_at,
           public.normalize_item_title(oi.title) AS norm
    FROM public.official_items oi
    WHERE public.has_role(auth.uid(), 'admin')
      AND oi.merged_into IS NULL
      AND length(public.normalize_item_title(oi.title)) >= 4
  ),
  counted AS (
    SELECT l.norm, count(*)::integer AS n
    FROM live l
    GROUP BY l.norm
    HAVING count(*) > 1
  )
  SELECT
    c.norm,
    c.n,
    (
      SELECT jsonb_agg(
               jsonb_build_object(
                 'id', d.id,
                 'title', d.title,
                 'image', d.image,
                 'content_name', d.content_name,
                 'owner_count', (SELECT count(*) FROM public.user_items ui WHERE ui.official_item_id = d.id),
                 'wish_count',  (SELECT count(*) FROM public.wishlists w WHERE w.official_item_id = d.id)
               )
               ORDER BY d.created_at
             )
      FROM live d WHERE d.norm = c.norm
    )
  FROM counted c
  ORDER BY c.n DESC, c.norm
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 200));
$$;

REVOKE ALL ON FUNCTION public.find_duplicate_official_items(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_duplicate_official_items(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. 統合する
-- ---------------------------------------------------------------------------

-- _merge_id を _keep_id に寄せる。
-- 参照している行はすべて _keep_id に付け替え、
-- 付け替えると重複してしまう行（同じ人が両方をウィッシュに入れている等）は落とす。
CREATE OR REPLACE FUNCTION public.merge_official_items(_keep_id uuid, _merge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  moved jsonb := '{}'::jsonb;
  n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  IF _keep_id = _merge_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'same_item');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.official_items WHERE id = _keep_id AND merged_into IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'keep_not_found');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.official_items WHERE id = _merge_id AND merged_into IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'merge_not_found');
  END IF;

  -- 所持: 同じ人が両方を持っていたら、統合先に個数を足して重複行を消す
  UPDATE public.user_items keep
  SET quantity = keep.quantity + dup.quantity,
      for_trade = keep.for_trade OR dup.for_trade
  FROM public.user_items dup
  WHERE keep.official_item_id = _keep_id
    AND dup.official_item_id = _merge_id
    AND dup.user_id = keep.user_id;

  DELETE FROM public.user_items dup
  WHERE dup.official_item_id = _merge_id
    AND EXISTS (
      SELECT 1 FROM public.user_items keep
      WHERE keep.official_item_id = _keep_id AND keep.user_id = dup.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.trade_requests tr
      WHERE tr.offered_item_id = dup.id OR tr.requested_item_id = dup.id
    );

  UPDATE public.user_items SET official_item_id = _keep_id WHERE official_item_id = _merge_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  moved := moved || jsonb_build_object('user_items', n);

  -- ウィッシュ: 両方を欲しがっていた人は1件にまとめる
  DELETE FROM public.wishlists dup
  WHERE dup.official_item_id = _merge_id
    AND EXISTS (
      SELECT 1 FROM public.wishlists keep
      WHERE keep.official_item_id = _keep_id AND keep.user_id = dup.user_id
    );

  UPDATE public.wishlists SET official_item_id = _keep_id WHERE official_item_id = _merge_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  moved := moved || jsonb_build_object('wishlists', n);

  -- タグ: 同じタグが両方に付いていたら1つに
  DELETE FROM public.item_tags dup
  WHERE dup.official_item_id = _merge_id
    AND EXISTS (
      SELECT 1 FROM public.item_tags keep
      WHERE keep.official_item_id = _keep_id AND keep.tag_id = dup.tag_id
    );

  UPDATE public.item_tags SET official_item_id = _keep_id WHERE official_item_id = _merge_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  moved := moved || jsonb_build_object('item_tags', n);

  UPDATE public.item_comments SET official_item_id = _keep_id WHERE official_item_id = _merge_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  moved := moved || jsonb_build_object('item_comments', n);

  UPDATE public.item_posts SET official_item_id = _keep_id WHERE official_item_id = _merge_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  moved := moved || jsonb_build_object('item_posts', n);

  UPDATE public.binder_items SET official_item_id = _keep_id WHERE official_item_id = _merge_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  moved := moved || jsonb_build_object('binder_items', n);

  UPDATE public.poll_options SET official_item_id = _keep_id WHERE official_item_id = _merge_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  moved := moved || jsonb_build_object('poll_options', n);

  UPDATE public.challenges SET official_item_id = _keep_id WHERE official_item_id = _merge_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  moved := moved || jsonb_build_object('challenges', n);

  -- 部屋は1グッズに1つなので、統合先に既にあるなら付け替えない。
  -- 書き込みを混ぜるより、統合元の部屋を静かに残すほうが安全。
  IF NOT EXISTS (SELECT 1 FROM public.item_rooms WHERE official_item_id = _keep_id) THEN
    UPDATE public.item_rooms SET official_item_id = _keep_id WHERE official_item_id = _merge_id;
  END IF;

  UPDATE public.official_items SET merged_into = _keep_id WHERE id = _merge_id;

  RETURN jsonb_build_object('ok', true, 'keep_id', _keep_id, 'merged_id', _merge_id, 'moved', moved);
END;
$$;

COMMENT ON FUNCTION public.merge_official_items(uuid, uuid) IS
  '重複したカタログ項目を統合する。行は消さず merged_into で隠す。管理者のみ。';

REVOKE ALL ON FUNCTION public.merge_official_items(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_official_items(uuid, uuid) TO authenticated;