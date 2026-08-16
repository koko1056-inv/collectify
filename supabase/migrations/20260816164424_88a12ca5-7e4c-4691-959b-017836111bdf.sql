-- 交換を安心して始められるようにする（通報とブロック）
--
-- 見ず知らずの相手と品物を送り合う機能を出す以上、
-- 「合わなかった相手ともう関わらない」手段と、
-- 「運営に知らせる」手段が無いままでは公開できない。
--
-- 住所そのものはこのアプリでは預からない方針なので、ここでも持たない。
-- 記録するのは「誰が誰を、どの取引について、どんな理由で」だけ。

-- ---------------------------------------------------------------------------
-- ブロック
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id)
);

COMMENT ON TABLE public.user_blocks IS
  'ブロック。自分がブロックした相手はマッチングに出てこない。相手には通知しない。';

GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- 誰にブロックされているかは本人に見せない。
-- 見えると「ブロックされた」と分かってしまい、諍いの種になる。
DROP POLICY IF EXISTS "user_blocks_select_own" ON public.user_blocks;
CREATE POLICY "user_blocks_select_own"
  ON public.user_blocks FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "user_blocks_insert_own" ON public.user_blocks;
CREATE POLICY "user_blocks_insert_own"
  ON public.user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "user_blocks_delete_own" ON public.user_blocks;
CREATE POLICY "user_blocks_delete_own"
  ON public.user_blocks FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks (blocked_id);

-- ---------------------------------------------------------------------------
-- 通報
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trade_request_id uuid REFERENCES public.trade_requests(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN (
    'no_shipment',    -- 送ると言ったのに届かない
    'different_item', -- 届いたものが違う
    'damaged',        -- 状態が説明と違う
    'harassment',     -- 迷惑な言動
    'spam',
    'other'
  )),
  detail text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_reports_not_self CHECK (reporter_id <> reported_user_id)
);

COMMENT ON TABLE public.user_reports IS
  '通報。通報された側には見えない。対応するのは管理者だけ。';

GRANT SELECT, INSERT, UPDATE ON public.user_reports TO authenticated;
GRANT ALL ON public.user_reports TO service_role;

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- 通報した本人は自分の通報だけ、管理者は全部見られる。
-- 通報された側には見せない（誰が通報したか分かると報復につながる）。
DROP POLICY IF EXISTS "user_reports_select_own_or_admin" ON public.user_reports;
CREATE POLICY "user_reports_select_own_or_admin"
  ON public.user_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_reports_insert_own" ON public.user_reports;
CREATE POLICY "user_reports_insert_own"
  ON public.user_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "user_reports_update_admin" ON public.user_reports;
CREATE POLICY "user_reports_update_admin"
  ON public.user_reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON public.user_reports (reported_user_id);

-- 同じ取引・同じ相手を何度も通報しても意味がないので1件にまとめる
CREATE UNIQUE INDEX IF NOT EXISTS user_reports_one_per_trade
  ON public.user_reports (reporter_id, reported_user_id, trade_request_id)
  WHERE trade_request_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- ブロックした相手はマッチングに出さない
-- ---------------------------------------------------------------------------

-- 自分がブロックした相手も、自分をブロックした相手も候補から外す。
-- 後者を外さないと、相手には見えないのに自分からは申し込めてしまう。
CREATE OR REPLACE FUNCTION public.find_trade_matches(_limit integer DEFAULT 30)
RETURNS TABLE (
  partner_id uuid,
  partner_username text,
  partner_avatar_url text,
  is_mutual boolean,
  their_items jsonb,
  my_items jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_wish AS (
    SELECT w.official_item_id, w.original_item_id
    FROM public.wishlists w
    WHERE w.user_id = auth.uid()
  ),
  my_offer AS (
    SELECT ui.id, ui.title, ui.image, ui.official_item_id, ui.original_item_id
    FROM public.user_items ui
    WHERE ui.user_id = auth.uid()
      AND ui.for_trade
  ),
  hidden AS (
    SELECT b.blocked_id AS uid FROM public.user_blocks b WHERE b.blocker_id = auth.uid()
    UNION
    SELECT b.blocker_id AS uid FROM public.user_blocks b WHERE b.blocked_id = auth.uid()
  ),
  they_have AS (
    SELECT DISTINCT ui.user_id AS pid, ui.id, ui.title, ui.image
    FROM public.user_items ui
    JOIN my_wish w
      ON (w.official_item_id IS NOT NULL AND w.official_item_id = ui.official_item_id)
      OR (w.original_item_id IS NOT NULL AND w.original_item_id = ui.original_item_id)
    WHERE ui.user_id <> auth.uid()
      AND ui.for_trade
      AND ui.user_id NOT IN (SELECT h.uid FROM hidden h)
  ),
  they_want AS (
    SELECT DISTINCT w.user_id AS pid, m.id, m.title, m.image
    FROM public.wishlists w
    JOIN my_offer m
      ON (w.official_item_id IS NOT NULL AND w.official_item_id = m.official_item_id)
      OR (w.original_item_id IS NOT NULL AND w.original_item_id = m.original_item_id)
    WHERE w.user_id <> auth.uid()
      AND w.user_id NOT IN (SELECT h.uid FROM hidden h)
  ),
  partners AS (
    SELECT h.pid FROM they_have h
    UNION
    SELECT t.pid FROM they_want t
  )
  SELECT
    p.pid,
    pr.username,
    pr.avatar_url,
    (h.items IS NOT NULL AND t.items IS NOT NULL) AS is_mutual,
    COALESCE(h.items, '[]'::jsonb),
    COALESCE(t.items, '[]'::jsonb)
  FROM partners p
  JOIN public.profiles pr ON pr.id = p.pid
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('id', x.id, 'title', x.title, 'image', x.image)) AS items
    FROM (SELECT h2.id, h2.title, h2.image FROM they_have h2 WHERE h2.pid = p.pid LIMIT 8) x
  ) h ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('id', y.id, 'title', y.title, 'image', y.image)) AS items
    FROM (SELECT t2.id, t2.title, t2.image FROM they_want t2 WHERE t2.pid = p.pid LIMIT 8) y
  ) t ON true
  ORDER BY 4 DESC,
           jsonb_array_length(COALESCE(h.items, '[]'::jsonb))
             + jsonb_array_length(COALESCE(t.items, '[]'::jsonb)) DESC,
           pr.username
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 30), 100));
$$;

REVOKE ALL ON FUNCTION public.find_trade_matches(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_trade_matches(integer) TO authenticated;