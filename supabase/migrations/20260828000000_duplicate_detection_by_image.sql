-- 重複判定を「名前が同じ」から「中身が同じ」に変える
--
-- 20260810120000 で入れた find_duplicate_official_items は、
-- 表記を均した見出しが一致する組を重複候補として返していた。
-- 本番のデータで確かめたところ、この判定は危険だと分かった。
--
--   「D賞アクリルスタンド」が10行ある。すべて別のキャラクターのアクスタで、
--   一番くじのD賞というラインナップを1つずつ登録したもの。まったくの別商品。
--   「一番くじE賞」7行、「一番くじF賞」6行も同じ。
--
-- 一番くじの賞は、同じ賞の中にキャラ違いが並ぶ。名前だけでは区別できない。
-- 実際に画像の中身を突き合わせると、314件のうち本当の重複は3組しかなく、
-- 見出しが一致する14組のうち12組は「同名の別商品」だった。
--
-- 旧版はこの12組を統合候補として管理画面に並べる。40pxのサムネイルで
-- 並ぶ別キャラのアクスタを見分けるのは難しく、押せば別商品が統合される。
-- 統合は merged_into で隠すだけなので戻せるが、所持・ウィッシュ・タグは
-- 付け替えたあと重複を落としており、そこは元に戻らない。
--
-- そこで判定の軸を画像の中身に変える。
-- Storage の eTag は中身の MD5 なので、これが一致する＝同じファイル。
-- 同じ写真を2回アップロードして登録した、という本当の重複だけが拾える。

-- ---------------------------------------------------------------------------
-- 1. 画像の同一性を表す指紋
-- ---------------------------------------------------------------------------

-- Storage に置いてある画像は eTag（中身の MD5）で比べる。
-- 外部URLの画像は中身を取りに行けないので、URL そのものを指紋とする。
-- URLが同じなら同じ画像、違えば「分からない」＝別扱いになる。安全側に倒れる。
CREATE OR REPLACE FUNCTION public.image_signature(_url text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT COALESCE(
    (
      SELECT o.metadata->>'eTag'
      FROM storage.objects o
      WHERE o.bucket_id = split_part(split_part(_url, '/storage/v1/object/public/', 2), '/', 1)
        AND o.name = substr(
              split_part(_url, '/storage/v1/object/public/', 2),
              length(split_part(split_part(_url, '/storage/v1/object/public/', 2), '/', 1)) + 2
            )
      LIMIT 1
    ),
    'url:' || COALESCE(_url, '')
  );
$$;

COMMENT ON FUNCTION public.image_signature(text) IS
  '画像の中身を表す指紋。Storage の画像は eTag(MD5)、外部URLはURL文字列。同じ指紋＝同じ画像。';

REVOKE ALL ON FUNCTION public.image_signature(text) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 2. 重複候補（中身が同じものだけを「重複」と呼ぶ）
-- ---------------------------------------------------------------------------

-- 見出しが同じ組を返すのは変えない。管理者が見て判断する材料だから。
-- 変えるのは、その中で「どれとどれが本当に同じファイルか」を明示すること。
--
--   exact_duplicates … 中身が一致する行が2つ以上ある組の数
--   items[].image_sig … 画像の指紋。これが一致する行だけが本当の重複
--   items[].is_exact_dup … 同じ組の中に、自分と同じ指紋の行が他にあるか
--
-- 並び順は「本当の重複がある組」を先頭に持ってくる。
-- 名前が同じだけの組は後ろに回り、管理画面では警告付きで表示される。
DROP FUNCTION IF EXISTS public.find_duplicate_official_items(integer);

CREATE OR REPLACE FUNCTION public.find_duplicate_official_items(_limit integer DEFAULT 50)
RETURNS TABLE (
  normalized text,
  item_count integer,
  exact_duplicates integer,
  items jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH live AS (
    SELECT oi.id, oi.title, oi.image, oi.content_name, oi.created_at,
           public.normalize_item_title(oi.title) AS norm,
           public.image_signature(oi.image) AS sig
    FROM public.official_items oi
    WHERE public.has_role(auth.uid(), 'admin')
      AND oi.merged_into IS NULL
      AND length(public.normalize_item_title(oi.title)) >= 4
  ),
  grouped AS (
    SELECT l.*,
           count(*) OVER (PARTITION BY l.norm) AS n_in_group,
           count(*) OVER (PARTITION BY l.norm, l.sig) AS n_same_image
    FROM live l
  ),
  counted AS (
    SELECT g.norm,
           count(*)::integer AS n,
           count(*) FILTER (WHERE g.n_same_image > 1)::integer AS n_exact
    FROM grouped g
    WHERE g.n_in_group > 1
    GROUP BY g.norm
  )
  SELECT
    c.norm,
    c.n,
    c.n_exact,
    (
      SELECT jsonb_agg(
               jsonb_build_object(
                 'id', d.id,
                 'title', d.title,
                 'image', d.image,
                 'content_name', d.content_name,
                 'image_sig', d.sig,
                 'is_exact_dup', d.n_same_image > 1,
                 'owner_count', (SELECT count(*) FROM public.user_items ui WHERE ui.official_item_id = d.id),
                 'wish_count',  (SELECT count(*) FROM public.wishlists w WHERE w.official_item_id = d.id)
               )
               -- 本当の重複を上に。次に指紋でまとめる（同じ画像が隣り合う）
               ORDER BY (d.n_same_image > 1) DESC, d.sig, d.created_at
             )
      FROM grouped d WHERE d.norm = c.norm
    )
  FROM counted c
  ORDER BY (c.n_exact > 0) DESC, c.n_exact DESC, c.n DESC, c.norm
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 200));
$$;

COMMENT ON FUNCTION public.find_duplicate_official_items(integer) IS
  '見出しが同じ組を返す。中身（画像）まで一致する行には is_exact_dup を立てる。管理者のみ。';

REVOKE ALL ON FUNCTION public.find_duplicate_official_items(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_duplicate_official_items(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. 登録するとき、似たものが既にないか確かめる
-- ---------------------------------------------------------------------------

-- 登録前に「これと似た名前のものが既にあります」と見せるためのもの。
--
-- 止めはしない。同名の別商品は正当に存在する（D賞アクリルスタンドが10種あるように）ので、
-- 名前が同じという理由で登録を拒むと、今度は登録できない不具合になる。
-- 出すのは候補と写真だけで、同じものか別のものかは人が見て決める。
CREATE OR REPLACE FUNCTION public.find_similar_official_items(
  _title text,
  _content_name text DEFAULT NULL,
  _limit integer DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  title text,
  image text,
  content_name text,
  owner_count integer,
  wish_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oi.id, oi.title, oi.image, oi.content_name,
         (SELECT count(*) FROM public.user_items ui WHERE ui.official_item_id = oi.id)::integer,
         (SELECT count(*) FROM public.wishlists w WHERE w.official_item_id = oi.id)::integer
  FROM public.official_items oi
  WHERE auth.uid() IS NOT NULL
    AND oi.merged_into IS NULL
    AND length(public.normalize_item_title(_title)) >= 4
    AND public.normalize_item_title(oi.title) = public.normalize_item_title(_title)
    AND (
      _content_name IS NULL
      OR oi.content_name IS NULL
      OR public.normalize_item_title(oi.content_name) = public.normalize_item_title(_content_name)
    )
  ORDER BY oi.created_at
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 8), 50));
$$;

COMMENT ON FUNCTION public.find_similar_official_items(text, text, integer) IS
  '登録前の確認用。同じ見出しの既存グッズを返す。登録を止めるためではなく、人が見て判断するため。';

REVOKE ALL ON FUNCTION public.find_similar_official_items(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_similar_official_items(text, text, integer) TO authenticated;
