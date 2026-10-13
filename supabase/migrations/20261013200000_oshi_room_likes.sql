-- =========================================================
-- 推しの部屋を「みんなが見て、いいねできる」ものにする
--
-- 以前: 他の人の部屋は、その人のプロフィールの推しグッズ欄の「お部屋を見る」からしか開けず、
--       見に来てもらえたかどうかも持ち主には分からなかった。
-- これから:
--  1) oshi_room_likes … 部屋へのいいね（1人1部屋に1回）。古い room_likes は昔の binder の部屋用なので使わない
--  2) いいねされたら持ち主へ通知する（同じ人からは 24 時間に1回まで。いいね→取り消し→いいね で溜まらないように）
--  3) list_oshi_rooms … 「みんな」の「お部屋」タブの一覧。新着・人気・同じ推しの3つの並び。
--     見られる範囲はコレクションと同じ（can_view_collection と同じ条件）で、ブロックの関係にある人・自分は出さない。
--     部屋を一度も保存していない人でも、推しグッズがあれば基本の配置で出す（アプリが defaultLayout で描く）。
--     推しグッズが1つも無い（空の）部屋は出さない
--  4) set_oshi_room_like / get_oshi_room_likes / get_my_oshi_room_likers … いいねの付け外し・数・誰がいいねしたか
-- =========================================================

CREATE TABLE IF NOT EXISTS public.oshi_room_likes (
  room_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_owner_id, user_id),
  -- 自分の部屋にはいいねできない（RPC でも断るが、表の側でも閉じる）
  CONSTRAINT oshi_room_likes_not_self CHECK (room_owner_id <> user_id)
);

-- 退会したときの消し込み（user_id 側の外部キー）と、自分のいいねを探すため
CREATE INDEX IF NOT EXISTS idx_oshi_room_likes_user ON public.oshi_room_likes (user_id);
-- 持ち主の「誰がいいねしたか」を新しい順に読むため
CREATE INDEX IF NOT EXISTS idx_oshi_room_likes_owner_created ON public.oshi_room_likes (room_owner_id, created_at DESC);
-- 一覧の候補（推しグッズを1つ以上飾っている人）だけを拾うため。profiles 全体を読まずに済む
CREATE INDEX IF NOT EXISTS idx_profiles_has_oshi_goods ON public.profiles (id) WHERE cardinality(favorite_item_ids) > 0;

ALTER TABLE public.oshi_room_likes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- 読めるのは「自分が付けたいいね」と「自分の部屋へのいいね」だけ。件数は RPC（get_oshi_room_likes）で誰でも数えられる
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'oshi_room_likes' AND policyname = 'oshi_room_likes_select_own') THEN
    CREATE POLICY oshi_room_likes_select_own ON public.oshi_room_likes FOR SELECT TO authenticated
      USING (auth.uid() = user_id OR auth.uid() = room_owner_id);
  END IF;
  -- 作れるのは自分のいいねだけ。見られない部屋（非公開・フォロワー限定でフォローしていない）には付けられない
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'oshi_room_likes' AND policyname = 'oshi_room_likes_insert_own') THEN
    CREATE POLICY oshi_room_likes_insert_own ON public.oshi_room_likes FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id AND room_owner_id <> auth.uid() AND public.can_view_collection(room_owner_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'oshi_room_likes' AND policyname = 'oshi_room_likes_delete_own') THEN
    CREATE POLICY oshi_room_likes_delete_own ON public.oshi_room_likes FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
REVOKE ALL ON public.oshi_room_likes FROM anon;
REVOKE UPDATE, TRUNCATE ON public.oshi_room_likes FROM authenticated;

-- ブロックの関係にある相手の部屋へのいいねを拒否する（他のいいねと同じ仕組みに、この表を足す）。
-- 中身は 20261010900000 と同じで、oshi_room_likes の行だけを増やした
CREATE OR REPLACE FUNCTION public.enforce_not_blocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid;
  _owner uuid;
  _owner2 uuid;
BEGIN
  IF TG_TABLE_NAME = 'messages' THEN
    _actor := NEW.sender_id;
    _owner := NEW.receiver_id;
  ELSIF TG_TABLE_NAME = 'follows' THEN
    _actor := NEW.follower_id;
    _owner := NEW.following_id;
  ELSIF TG_TABLE_NAME IN ('item_post_comments', 'item_post_likes', 'item_post_reactions') THEN
    _actor := NEW.user_id;
    SELECT p.user_id INTO _owner FROM public.item_posts p WHERE p.id = NEW.post_id;
  ELSIF TG_TABLE_NAME = 'post_comments' THEN
    _actor := NEW.user_id;
    SELECT p.user_id INTO _owner FROM public.goods_posts p WHERE p.id = NEW.post_id;
    IF NEW.parent_comment_id IS NOT NULL THEN
      SELECT c.user_id INTO _owner2 FROM public.post_comments c WHERE c.id = NEW.parent_comment_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'post_likes' THEN
    _actor := NEW.user_id;
    SELECT p.user_id INTO _owner FROM public.goods_posts p WHERE p.id = NEW.post_id;
  ELSIF TG_TABLE_NAME = 'item_comments' THEN
    _actor := NEW.user_id;
    IF NEW.parent_id IS NOT NULL THEN
      SELECT c.user_id INTO _owner FROM public.item_comments c WHERE c.id = NEW.parent_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'oshi_room_likes' THEN
    _actor := NEW.user_id;
    _owner := NEW.room_owner_id;
  END IF;

  IF public.is_blocked_between(_actor, _owner) OR public.is_blocked_between(_actor, _owner2) THEN
    RAISE EXCEPTION 'この操作はできません' USING ERRCODE = 'P0001', HINT = 'BLOCKED';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_not_blocked() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_not_blocked' AND tgrelid = 'public.oshi_room_likes'::regclass) THEN
    CREATE TRIGGER trg_enforce_not_blocked BEFORE INSERT ON public.oshi_room_likes
      FOR EACH ROW EXECUTE FUNCTION public.enforce_not_blocked();
  END IF;
END $$;

-- いいねの通知（持ち主へ）。同じ人からは 24 時間に1回まで（取り消して付け直すたびに通知が増えないように）。
-- ブロックの関係にある相手からの通知は trg_suppress_blocked_notifications が data.actor_id を見て落とす
CREATE OR REPLACE FUNCTION public.notify_oshi_room_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
BEGIN
  IF NEW.room_owner_id = NEW.user_id THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.notifications n
     WHERE n.user_id = NEW.room_owner_id
       AND n.type = 'oshi_room_like'
       AND n.created_at > now() - interval '24 hours'
       AND n.data ->> 'actor_id' = NEW.user_id::text
  ) THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(nullif(btrim(p.display_name), ''), p.username) INTO _name FROM public.profiles p WHERE p.id = NEW.user_id;

  -- 文言はサーバーでは日本語で持ち、アプリは type と actor_name から言語に合わせて出し直す
  INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
  VALUES (
    NEW.room_owner_id,
    'oshi_room_like',
    '推しの部屋にいいね',
    coalesce(_name, '誰か') || 'さんがあなたの推しの部屋にいいねしました',
    jsonb_build_object('actor_id', NEW.user_id, 'actor_name', _name, 'link', '/oshi?likes=1'),
    false
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_oshi_room_like() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_oshi_room_like' AND tgrelid = 'public.oshi_room_likes'::regclass) THEN
    CREATE TRIGGER trg_notify_oshi_room_like AFTER INSERT ON public.oshi_room_likes
      FOR EACH ROW EXECUTE FUNCTION public.notify_oshi_room_like();
  END IF;
END $$;

-- いいねを付ける・外す。返り値はいいねの数と、自分がいいねしているか（画面の数をサーバーの値にそろえるため）。
-- 付けるときだけ「見られる部屋か」「推しグッズを飾っているか」を確かめる（外すのは、見られなくなっても許す）
CREATE OR REPLACE FUNCTION public.set_oshi_room_like(_owner uuid, _liked boolean)
RETURNS TABLE (likes integer, liked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _owner IS NULL OR _owner = _uid THEN RAISE EXCEPTION 'cannot_like_own_room'; END IF;

  IF coalesce(_liked, false) THEN
    IF NOT public.can_view_collection(_owner) THEN RAISE EXCEPTION 'room_not_visible'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _owner AND cardinality(p.favorite_item_ids) > 0) THEN
      RAISE EXCEPTION 'room_empty';
    END IF;
    INSERT INTO public.oshi_room_likes (room_owner_id, user_id) VALUES (_owner, _uid)
    ON CONFLICT (room_owner_id, user_id) DO NOTHING;
  ELSE
    DELETE FROM public.oshi_room_likes l WHERE l.room_owner_id = _owner AND l.user_id = _uid;
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*)::int FROM public.oshi_room_likes l WHERE l.room_owner_id = _owner),
    EXISTS (SELECT 1 FROM public.oshi_room_likes l WHERE l.room_owner_id = _owner AND l.user_id = _uid);
END;
$$;
REVOKE ALL ON FUNCTION public.set_oshi_room_like(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_oshi_room_like(uuid, boolean) TO authenticated;

-- 部屋のいいねの数と、自分がいいねしているか。見られない部屋は0行（数も見せない）
CREATE OR REPLACE FUNCTION public.get_oshi_room_likes(_owner uuid)
RETURNS TABLE (likes integer, liked_by_me boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*)::int FROM public.oshi_room_likes l WHERE l.room_owner_id = _owner),
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.oshi_room_likes l WHERE l.room_owner_id = _owner AND l.user_id = auth.uid())
  WHERE _owner IS NOT NULL AND public.can_view_collection(_owner);
$$;
REVOKE ALL ON FUNCTION public.get_oshi_room_likes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_oshi_room_likes(uuid) TO anon, authenticated;

-- 自分の部屋にいいねした人（新しい順）。ブロックの関係にある人は出さない
CREATE OR REPLACE FUNCTION public.get_my_oshi_room_likers(_limit integer DEFAULT 50, _offset integer DEFAULT 0)
RETURNS TABLE (user_id uuid, username text, display_name text, avatar_url text, liked_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url, l.created_at
  FROM public.oshi_room_likes l
  JOIN public.profiles p ON p.id = l.user_id
  WHERE l.room_owner_id = auth.uid()
    AND NOT public.is_blocked_between(auth.uid(), l.user_id)
  ORDER BY l.created_at DESC, l.user_id
  LIMIT least(greatest(coalesce(_limit, 50), 1), 100)
  OFFSET greatest(coalesce(_offset, 0), 0);
$$;
REVOKE ALL ON FUNCTION public.get_my_oshi_room_likers(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_oshi_room_likers(integer, integer) TO authenticated;

-- 「みんな」の「お部屋」タブの一覧。部屋を描くのに要るもの（壁紙・床・配置・推し色・推しグッズの写真とレベル）と、
-- 名前・アバター・いいね・なかよしLvの合計を、1回でまとめて返す（カードごとに問い合わせない）。
--  _sort: 'new'（部屋を保存した新しい順。保存していない人は推しグッズを飾った時刻）
--         'popular'（いいねの多い順）
--         'oshi'（同じ推し: 自分の好きな作品・興味・推しグッズの作品と、相手の推しグッズの作品が重なる数の多い順。重ならない人は出さない）
-- 見られる範囲は can_view_collection と同じ（公開 / フォロワー限定でフォロー中）。1行ずつ関数を呼ぶと遅いので、条件を中に書く。
-- 自分・ブロックの関係にある人・推しグッズが無い人は出さない。
-- 配置のグッズは、get_profile_oshi_room と同じく「いま推しグッズの物」だけに絞る（外した物の id を見せない）
CREATE OR REPLACE FUNCTION public.list_oshi_rooms(_sort text DEFAULT 'new', _limit integer DEFAULT 24, _offset integer DEFAULT 0)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  wallpaper_key text,
  floor_key text,
  layout jsonb,
  oshi_color text,
  goods jsonb,
  bond_total integer,
  bond_best integer,
  likes integer,
  liked_by_me boolean,
  match_score integer,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      auth.uid() AS me,
      CASE WHEN _sort IN ('new', 'popular', 'oshi') THEN _sort ELSE 'new' END AS sort,
      least(greatest(coalesce(_limit, 24), 1), 48) AS lim,
      greatest(coalesce(_offset, 0), 0) AS off
  ),
  my_keys AS (
    -- 自分の「推し」の作品名（小文字・前後の空白なし）。同じ推しの並びのときだけ使う
    SELECT DISTINCT lower(btrim(s.k)) AS k
    FROM (
      SELECT unnest(coalesce(p.favorite_contents, '{}'::text[]) || coalesce(p.interests, '{}'::text[])) AS k
      FROM public.profiles p, params
      WHERE p.id = params.me AND params.sort = 'oshi'
      UNION ALL
      SELECT ui.content_name
      FROM public.profiles p
      CROSS JOIN params
      CROSS JOIN LATERAL unnest(p.favorite_item_ids) AS f(id)
      JOIN public.user_items ui ON ui.id = f.id AND ui.user_id = p.id
      WHERE p.id = params.me AND params.sort = 'oshi'
    ) s
    WHERE s.k IS NOT NULL AND btrim(s.k) NOT IN ('', 'なし')
  ),
  cand AS (
    SELECT p.id, p.favorite_item_ids, r.updated_at AS room_at
    FROM public.profiles p
    CROSS JOIN params
    LEFT JOIN public.oshi_rooms r ON r.user_id = p.id
    WHERE cardinality(p.favorite_item_ids) > 0
      AND p.id IS DISTINCT FROM params.me
      AND (
        p.privacy_level = 'public'
        OR (
          p.privacy_level = 'followers'
          AND EXISTS (SELECT 1 FROM public.follows fo WHERE fo.follower_id = params.me AND fo.following_id = p.id)
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks b
        WHERE (b.blocker_id = params.me AND b.blocked_id = p.id)
           OR (b.blocker_id = p.id AND b.blocked_id = params.me)
      )
  ),
  scored AS (
    SELECT
      c.id,
      c.room_at IS NOT NULL AS saved,
      coalesce(c.room_at, g.oshi_at) AS sort_at,
      (SELECT count(*)::int FROM public.oshi_room_likes l WHERE l.room_owner_id = c.id) AS likes,
      CASE WHEN params.sort = 'oshi'
        THEN (SELECT count(*)::int FROM unnest(g.content_keys) AS ck(k) WHERE ck.k IN (SELECT mk.k FROM my_keys mk))
        ELSE 0
      END AS match_score
    FROM cand c
    CROSS JOIN params
    CROSS JOIN LATERAL (
      SELECT
        count(*) AS n_goods,
        array_agg(DISTINCT lower(btrim(ui.content_name))) FILTER (WHERE ui.content_name IS NOT NULL AND btrim(ui.content_name) <> '') AS content_keys,
        max(cg.created_at) AS oshi_at
      FROM unnest(c.favorite_item_ids) AS f(id)
      JOIN public.user_items ui ON ui.id = f.id AND ui.user_id = c.id
      LEFT JOIN public.companion_goods cg ON cg.user_id = c.id AND cg.user_item_id = f.id
    ) g
    WHERE g.n_goods > 0
  ),
  page AS (
    SELECT s.*,
      row_number() OVER (
        ORDER BY
          CASE WHEN params.sort = 'oshi' THEN s.match_score END DESC NULLS LAST,
          CASE WHEN params.sort IN ('popular', 'oshi') THEN s.likes END DESC NULLS LAST,
          -- 新着では、保存した部屋を先に（基本の配置のままの部屋は後ろ）
          CASE WHEN params.sort = 'new' THEN s.saved END DESC NULLS LAST,
          s.sort_at DESC NULLS LAST,
          s.id
      ) AS ord
    FROM scored s
    CROSS JOIN params
    WHERE params.sort <> 'oshi' OR s.match_score > 0
    ORDER BY ord
    LIMIT (SELECT lim FROM params)
    OFFSET (SELECT off FROM params)
  )
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    r.wallpaper_key,
    r.floor_key,
    CASE WHEN r.layout IS NULL THEN NULL ELSE
      jsonb_set(r.layout, '{goods}', coalesce((
        SELECT jsonb_agg(lg.value ORDER BY lg.ord)
        FROM jsonb_array_elements(coalesce(r.layout -> 'goods', '[]'::jsonb)) WITH ORDINALITY AS lg(value, ord)
        WHERE (lg.value ->> 'item') = ANY (coalesce(p.favorite_item_ids, ARRAY[]::uuid[])::text[])
      ), '[]'::jsonb))
    END,
    p.profile_oshi_color,
    gs.goods,
    gs.bond_total,
    gs.bond_best,
    pg.likes,
    EXISTS (SELECT 1 FROM public.oshi_room_likes l WHERE l.room_owner_id = p.id AND l.user_id = auth.uid()),
    pg.match_score,
    pg.sort_at
  FROM page pg
  JOIN public.profiles p ON p.id = pg.id
  LEFT JOIN public.oshi_rooms r ON r.user_id = p.id
  CROSS JOIN LATERAL (
    SELECT
      coalesce(jsonb_agg(jsonb_build_object(
        'user_item_id', x.id,
        'title', x.title,
        'image', x.image,
        'content_name', x.content_name,
        'level', x.level,
        'rank', x.rank_no
      ) ORDER BY x.rank_no), '[]'::jsonb) AS goods,
      coalesce(sum(x.level), 0)::int AS bond_total,
      coalesce(max(x.level), 0)::int AS bond_best
    FROM (
      SELECT ui.id, ui.title, ui.image, ui.content_name,
             public.companion_level(coalesce(cg.xp, 0)) AS level,
             (row_number() OVER (ORDER BY f.ord))::int AS rank_no
      FROM unnest(p.favorite_item_ids) WITH ORDINALITY AS f(id, ord)
      JOIN public.user_items ui ON ui.id = f.id AND ui.user_id = p.id
      LEFT JOIN public.companion_goods cg ON cg.user_id = p.id AND cg.user_item_id = f.id
      ORDER BY f.ord
      LIMIT 5
    ) x
  ) gs
  ORDER BY pg.ord;
$$;
REVOKE ALL ON FUNCTION public.list_oshi_rooms(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_oshi_rooms(text, integer, integer) TO authenticated;
