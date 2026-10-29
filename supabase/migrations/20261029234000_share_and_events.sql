-- お題イベント（「#推しのアクスタ集合」のような、みんなで同じお題に投稿する企画）。
--
-- 既存のチャレンジ（challenges / challenge_entries / challenge_votes）は使わない:
--  - あちらはユーザーが自分のポイントで賞金を積んで作るコンテストで、応募は投稿とは別の表（画像1枚）・投票で順位を決める。
--  - お題イベントは運営（管理者）が作り、参加は「ふつうの投稿（item_posts）を1つする」だけ。順位も賞金も無い。
--    投稿のいいね・コメント・通報・非表示・ブロック・ポイント（award_points_on_item_post、1日3回まで）は item_posts にすでにあるので、
--    それをそのまま使えるよう、投稿に event_id を1列足すだけにした。
--  - 参加でポイントを別に配ることはしない（ふつうの投稿のポイントだけ）。#202 で閉じた賞金の抜け道のようなものを新しく作らないため。
--
-- このマイグレーションは何度流しても同じ結果になる（IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT DO NOTHING）。

-- ---------------------------------------------------------------------------
-- 1. お題イベントの表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  -- 「#」は含めない（例: 推しのアクスタ集合）。投稿の本文の先頭に「#」付きで入る
  hashtag text NOT NULL,
  description text,
  -- 表紙: 絵文字と色（無いときはアプリの色）。写真の表紙は任意
  emoji text,
  color text,
  cover_image_url text,
  -- おすすめのグッズの種類（例: アクスタ）。投稿のグッズ選びで、名前に含むものを先に並べる
  suggested_category text,
  -- イベントのページでポッケが言う一言（無いときはアプリの決まり文句）
  pocke_line text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  -- draft: 管理者だけに見える / active: 公開中（期間内なら参加できる） / closed: 締め切り（見るだけ）
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_events_status_check CHECK (status IN ('draft', 'active', 'closed')),
  CONSTRAINT post_events_period_check CHECK (ends_at > starts_at),
  CONSTRAINT post_events_title_len CHECK (char_length(btrim(title)) BETWEEN 1 AND 60),
  -- 空白・「#」を含まない、40文字まで（本文の中でタグとして読めるように）
  CONSTRAINT post_events_hashtag_format CHECK (hashtag ~ '^[^[:space:]#]{1,40}$'),
  CONSTRAINT post_events_description_len CHECK (description IS NULL OR char_length(description) <= 500),
  CONSTRAINT post_events_pocke_line_len CHECK (pocke_line IS NULL OR char_length(pocke_line) <= 80),
  CONSTRAINT post_events_color_format CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT post_events_emoji_len CHECK (emoji IS NULL OR char_length(emoji) <= 8),
  CONSTRAINT post_events_cover_url CHECK (cover_image_url IS NULL OR cover_image_url ~ '^https://')
);

COMMENT ON TABLE public.post_events IS
  'お題イベント。運営が作り、参加は item_posts.event_id を付けた投稿。賞金・順位・参加ポイントは無い。';

-- 同じタグのイベントを2つ作らない（大文字小文字は区別しない）
CREATE UNIQUE INDEX IF NOT EXISTS post_events_hashtag_key ON public.post_events (lower(hashtag));
CREATE INDEX IF NOT EXISTS post_events_status_period_idx ON public.post_events (status, ends_at DESC);

-- updated_at を自動で更新する
CREATE OR REPLACE FUNCTION public.post_events_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS post_events_touch ON public.post_events;
CREATE TRIGGER post_events_touch BEFORE UPDATE ON public.post_events
  FOR EACH ROW EXECUTE FUNCTION public.post_events_touch();

-- ---------------------------------------------------------------------------
-- 2. RLS: 見るのは誰でも（下書きは管理者だけ）、作る・直す・消すのは管理者だけ
-- ---------------------------------------------------------------------------
ALTER TABLE public.post_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_events_select" ON public.post_events;
CREATE POLICY "post_events_select"
  ON public.post_events FOR SELECT
  USING (status <> 'draft' OR public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "post_events_admin_insert" ON public.post_events;
CREATE POLICY "post_events_admin_insert"
  ON public.post_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "post_events_admin_update" ON public.post_events;
CREATE POLICY "post_events_admin_update"
  ON public.post_events FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "post_events_admin_delete" ON public.post_events;
CREATE POLICY "post_events_admin_delete"
  ON public.post_events FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

GRANT SELECT ON public.post_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.post_events TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. 投稿とイベントのつながり（item_posts.event_id）
--    イベントを消しても投稿は残す（つながりだけ外れる）
-- ---------------------------------------------------------------------------
ALTER TABLE public.item_posts
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.post_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS item_posts_event_created_idx
  ON public.item_posts (event_id, created_at DESC, id DESC)
  WHERE event_id IS NOT NULL;

COMMENT ON COLUMN public.item_posts.event_id IS
  '参加したお題イベント。公開中・期間内のイベントにだけ付けられる（item_posts_link_event が確かめる）。';

-- 付けてよいイベントかを確かめる。本文にイベントのタグがあれば、付け忘れても自動でつなぐ。
--  - 新しく付ける・付け替えるときは、公開中（active）で期間内のイベントだけ
--  - 外す（NULL にする）のはいつでもよい
--  - 付けたまま本文を直すのはよい（締め切り後でもつながりは残る）
CREATE OR REPLACE FUNCTION public.item_posts_link_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.event_id IS NULL AND NEW.caption IS NOT NULL AND position('#' in NEW.caption) > 0 THEN
    -- 本文のタグから、公開中・期間内のイベントを1つ選ぶ（いちばん新しく始まったもの）
    SELECT e.id INTO NEW.event_id
      FROM public.post_events e
     WHERE e.status = 'active'
       AND now() >= e.starts_at AND now() < e.ends_at
       AND position(lower('#' || e.hashtag) in lower(NEW.caption)) > 0
     ORDER BY e.starts_at DESC
     LIMIT 1;
    RETURN NEW;
  END IF;

  IF NEW.event_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.event_id IS DISTINCT FROM OLD.event_id) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.post_events e
       WHERE e.id = NEW.event_id
         AND e.status = 'active'
         AND now() >= e.starts_at AND now() < e.ends_at
    ) THEN
      RAISE EXCEPTION 'This event is not open for posts' USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.item_posts_link_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS item_posts_link_event ON public.item_posts;
CREATE TRIGGER item_posts_link_event
  BEFORE INSERT OR UPDATE OF event_id ON public.item_posts
  FOR EACH ROW EXECUTE FUNCTION public.item_posts_link_event();

-- ---------------------------------------------------------------------------
-- 4. 参加の数（イベントのカード・ページの「◯人が参加中」）
--    数えるのは、だれにでも見えている投稿だけ:
--      非表示（通報）でない / 投稿者のプロフィールが公開（privacy_level = public）/ サンプルアカウントでない
--    鍵付きの人の投稿の有無が、数の増減から分からないようにするため。
--    下書きのイベントは数えない（管理者がページで見るときは画面側で 0 と出る）。
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_event_stats(_event_ids uuid[])
RETURNS TABLE (event_id uuid, post_count integer, participant_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT e.id,
         count(p.id)::integer,
         count(DISTINCT p.user_id)::integer
    FROM public.post_events e
    LEFT JOIN public.item_posts p
      ON p.event_id = e.id
     AND NOT p.is_hidden
     AND EXISTS (
       SELECT 1 FROM public.profiles pr
        WHERE pr.id = p.user_id
          AND coalesce(pr.privacy_level, 'public') = 'public'
          AND NOT pr.is_sample
     )
   WHERE e.id = ANY (coalesce(_event_ids, '{}'::uuid[]))
     AND e.status <> 'draft'
     AND cardinality(coalesce(_event_ids, '{}'::uuid[])) <= 50
   GROUP BY e.id;
$function$;

REVOKE ALL ON FUNCTION public.post_event_stats(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_event_stats(uuid[]) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. はじめのお題（3つ）。流した日の日本時間 0 時から始まる。
--    id を決めておき、2回目以降は何もしない（管理画面で直した内容を上書きしない）
-- ---------------------------------------------------------------------------
INSERT INTO public.post_events
  (id, title, hashtag, description, emoji, color, suggested_category, pocke_line, starts_at, ends_at, status)
VALUES
  ('6d0f3c1a-5e7b-4c2a-9a10-0a1b2c3d4e01',
   '推しのアクスタ集合',
   '推しのアクスタ集合',
   'おうちのアクスタ、ぜんぶ並べて見せて！ 1体でも、ずらっと集合でも大歓迎。並べ方のこだわりもぜひ書いてね。',
   '🧍', '#E4577C', 'アクスタ',
   'アクスタ、何体いる？ ずらっと並べて見せてほしいな！',
   date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo',
   (date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') + interval '21 days') AT TIME ZONE 'Asia/Tokyo',
   'active'),
  ('6d0f3c1a-5e7b-4c2a-9a10-0a1b2c3d4e02',
   '今月のお迎え',
   '今月のお迎え',
   '今月うちに来てくれたグッズを紹介しよう。予約していた新作、イベントの戦利品、ふらっと出会った子まで、なんでもOK。',
   '🛍️', '#F29F3D', NULL,
   '今月はどんな子をお迎えした？ ぼくにも教えて！',
   date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo',
   (date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') + interval '28 days') AT TIME ZONE 'Asia/Tokyo',
   'active'),
  ('6d0f3c1a-5e7b-4c2a-9a10-0a1b2c3d4e03',
   '痛バ・推し活バッグ自慢',
   '痛バ自慢',
   '缶バッジぎっしりの痛バも、さりげない推しカラーのバッグも。お出かけの相棒を見せてね。',
   '👜', '#7C6CF0', '缶バッジ',
   '痛バ、つくるの大変だったでしょ？ じっくり見せて！',
   date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo',
   (date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') + interval '14 days') AT TIME ZONE 'Asia/Tokyo',
   'active')
-- id でもタグでも、すでにあれば入れない（同じタグのイベントを管理画面で先に作っていても止まらない）
ON CONFLICT DO NOTHING;
