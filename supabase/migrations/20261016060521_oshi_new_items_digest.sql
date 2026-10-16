-- 推しの新商品の通知を「1日1回のまとめ」にする
--
-- いまの仕組み（調べた結果）
--   official_items の INSERT に行トリガーが2つ（notify_new_official_item / trigger_notify_users_of_new_item）、
--   item_tags の INSERT に1つ（trigger_notify_users_of_new_item_tag）付いている。
--   どれも「profiles.interests にその作品が入っている全員」に、グッズ1件・タグ1件ごとに通知を1行ずつ入れる。
--     - official_items の2つは同じ関数（notify_users_of_new_item）なので、1件入ると同じ通知が2通届く
--     - 毎日の自動取り込み（docs/catalog-import.md・import_official_batch）は数十〜数百件を入れるので、
--       通知が溢れないよう、投入の間だけこの3つのトリガーを止めている（ALTER TABLE ... DISABLE TRIGGER）
--     - その結果、自動で入った新商品について、利用者には何も届いていない
--     - favorite_contents（好きな作品）・推しグッズの作品は見ていない（interests だけ）
--   Edge Function notify-new-tag は「新しいタグが作られた」ことを運営にメールで知らせるもので、利用者への通知ではない。
--
-- この変更
--   1. 行ごとの通知関数（notify_users_of_new_item / notify_users_of_new_item_tag）を「何もしない」にする。
--      トリガー自体は消さない: 取り込みのテンプレートと import_official_batch がトリガー名を指定して
--      DISABLE/ENABLE しているので、消すとそちらが「trigger does not exist」で失敗する。
--   2. 推しの新商品のまとめ通知 notify_oshi_new_items() を足す。1人に1日1通まで:
--      「ちいかわの新商品が12件入りました」（type = 'oshi_new_items'、押すと /releases?tab=new）。
--      推しの作品 = favorite_contents ∪ interests ∪ 推しグッズ（favorite_item_ids）の作品。
--      数えるのは、その人への前回のまとめ通知（無ければ24時間前）より後に入ったもの（最大で直近3日）。
--      LINE 通知の設定で「新商品」を切っている人（line_notification_prefs.new_goods = false）には送らない。
--   3. 毎朝 8:12（日本時間）に実行する（自動取り込みは 6:47 開始）。pg_cron があるときだけ登録する。
--   4. 読み取りを軽くする索引を2つ足す（アプリの「推しの新商品」画面・新着バッジ・このまとめ通知が使う）。
--
-- アプリ側は、この変更が無くても動く（通知の種類 'oshi_new_items' の表示と遷移は先に入れてある）。

-- ---------------------------------------------------------------
-- 1. 行ごとの通知をやめる（トリガー名は残す）
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_users_of_new_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 新商品の通知は notify_oshi_new_items（1日1回のまとめ）に移した。
  -- 1件ごとに全員へ通知すると、毎日の取り込みで通知が溢れる（同じトリガーが2つあり、2通ずつ届いていた）
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_users_of_new_item_tag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 「タグが付いた」通知は、グッズ1件に何個もタグが付くので溢れる。まとめ通知に寄せて、ここでは何もしない
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------
-- 2. 索引
-- ---------------------------------------------------------------
-- 作品で絞った新着（推しの新商品の「新着」・新着バッジの件数・まとめ通知）
CREATE INDEX IF NOT EXISTS official_items_content_created_idx
  ON public.official_items (content_name, created_at DESC)
  WHERE merged_into IS NULL;

-- 推しの作品を選んでいない人の「発売予定」（カタログ全体を発売日で引く）。
-- 作品で絞るときは既存の official_items_content_release_idx (content_name, release_date DESC) が使われる
CREATE INDEX IF NOT EXISTS official_items_release_date_idx
  ON public.official_items (release_date)
  WHERE merged_into IS NULL;

-- ---------------------------------------------------------------
-- 3. まとめ通知
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_oshi_new_items()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sent integer;
BEGIN
  WITH fans AS (
    SELECT
      p.id AS user_id,
      ARRAY(
        SELECT DISTINCT btrim(c)
        FROM unnest(
          coalesce(p.favorite_contents, '{}'::text[])
          || coalesce(p.interests, '{}'::text[])
          || coalesce(ARRAY(
               SELECT ui.content_name
               FROM public.user_items ui
               WHERE ui.user_id = p.id
                 AND ui.id = ANY (coalesce(p.favorite_item_ids, '{}'::uuid[]))
                 AND ui.content_name IS NOT NULL
             ), '{}'::text[])
        ) AS c
        WHERE c IS NOT NULL AND btrim(c) <> ''
      ) AS contents,
      greatest(
        coalesce(
          (SELECT max(n.created_at) FROM public.notifications n WHERE n.user_id = p.id AND n.type = 'oshi_new_items'),
          now() - interval '1 day'
        ),
        now() - interval '3 days'
      ) AS since
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.line_notification_prefs lp
      WHERE lp.user_id = p.id AND lp.new_goods = false
    )
  ),
  hits AS (
    SELECT
      f.user_id,
      count(*)::int AS cnt,
      count(DISTINCT oi.content_name)::int AS content_count,
      (array_agg(oi.content_name ORDER BY oi.created_at DESC))[1] AS top_content,
      (array_agg(oi.id ORDER BY oi.created_at DESC))[1] AS item_id,
      (array_agg(oi.title ORDER BY oi.created_at DESC))[1] AS item_title,
      (array_agg(oi.image ORDER BY oi.created_at DESC))[1] AS image
    FROM fans f
    JOIN public.official_items oi
      ON oi.content_name = ANY (f.contents)
     AND oi.merged_into IS NULL
     AND oi.image <> '/placeholder.svg'
     AND oi.created_at > f.since
    WHERE cardinality(f.contents) > 0
    GROUP BY f.user_id
  )
  INSERT INTO public.notifications (user_id, title, message, type, data)
  SELECT
    h.user_id,
    '推しの新商品が入りました',
    CASE
      WHEN h.content_count > 1 THEN h.top_content || 'など、推しの新商品が' || h.cnt || '件入りました'
      ELSE h.top_content || 'の新商品が' || h.cnt || '件入りました'
    END,
    'oshi_new_items',
    jsonb_build_object(
      'count', h.cnt,
      'content_name', h.top_content,
      'item_id', h.item_id,
      'item_title', h.item_title,
      'image', h.image,
      'url', '/releases?tab=new'
    )
  FROM hits h
  WHERE h.cnt > 0;

  GET DIAGNOSTICS v_sent = ROW_COUNT;
  RETURN v_sent;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_oshi_new_items() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------
-- 4. 毎朝 8:12（日本時間）= 23:12 UTC
-- ---------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('notify-oshi-new-items', '12 23 * * *', 'SELECT public.notify_oshi_new_items()');
  END IF;
END $$;

-- 確かめ方（適用後）:
--   SELECT public.notify_oshi_new_items();   -- 送った人数が返る（同じ日に2回呼ぶと、2回目は前回以降の分だけ）
--   SELECT user_id, message, data FROM public.notifications WHERE type = 'oshi_new_items' ORDER BY created_at DESC LIMIT 20;
--   SELECT * FROM cron.job WHERE jobname = 'notify-oshi-new-items';
-- 元に戻すとき:
--   SELECT cron.unschedule('notify-oshi-new-items');
--   （行ごとの通知に戻すなら、20250823072201 / 20260102135103 の関数定義を当て直す）
