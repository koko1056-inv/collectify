-- カタログのグッズへの「削除申請」「修正申請」「重複の報告」。
--
-- いまはカタログ（official_items）の間違い・重複・告知画像に気づいても、ユーザーが運営に伝える手段が無い
-- （user_reports は人・投稿への通報で、catalog_requests は「追加してほしい」だけ）。
-- そこで、グッズ1件ごとに申請を送れるようにし、運営（admin / moderator）が管理画面で確認して
-- 「承認＝そのまま反映」「見送り」を選べるようにする。
--
--  - 削除申請（kind = 'delete'）: 承認しても行は消さない。exclude_from_lists = true で一覧・検索から隠すだけ
--    （user_items などが参照しているため。20261023210000_exclude_announcement_images.sql と同じ考え方）
--  - 重複の報告（kind = 'duplicate'）: 承認すると既存の merge_official_items() で統合する（行は消さず merged_into）
--  - 修正申請（kind = 'edit'）: 名前・作品・キャラ・カテゴリ（グッズタイプ）・発売日・価格・画像を書き換える。
--    書き換える前の値は before_snapshot に残すので、間違えても戻せる
--
-- 申請はユーザーと運営のあいだだけのもの。ほかのユーザーには見せない（本人と admin / moderator だけが読める）。
-- 承認・見送りの結果は、本人に通知（notifications, type = 'catalog_item_request'）で知らせる。

-- ---------------------------------------------------------------------------
-- 1. テーブル
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_item_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  official_item_id uuid NOT NULL REFERENCES public.official_items(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('delete', 'edit', 'duplicate')),
  -- 削除申請の理由（duplicate: 重複 / not_goods: 告知画像・グッズじゃない / unofficial: 非公式・海賊版 /
  -- wrong_info: 内容がまちがい / other: その他）。重複の報告は 'duplicate'、修正申請は NULL
  reason text CHECK (reason IS NULL OR reason IN ('duplicate', 'not_goods', 'unofficial', 'wrong_info', 'other')),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  -- 修正申請で変えてほしい項目だけを入れる（title / content_name / character_tag_ids / type_tag_id / release_date / price / image）
  proposed jsonb,
  -- 重複の報告で「こちらと同じ」と指したグッズ
  duplicate_of uuid REFERENCES public.official_items(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  admin_note text CHECK (admin_note IS NULL OR char_length(admin_note) <= 500),
  handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_at timestamptz,
  -- 承認して反映する直前の値（戻すため）と、反映の結果（統合で付け替えた件数など）
  before_snapshot jsonb,
  apply_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_item_requests_duplicate_target CHECK (
    (kind = 'duplicate' AND duplicate_of IS NOT NULL AND duplicate_of <> official_item_id)
    OR (kind <> 'duplicate' AND duplicate_of IS NULL)
  ),
  CONSTRAINT catalog_item_requests_edit_payload CHECK (
    (kind = 'edit' AND proposed IS NOT NULL AND jsonb_typeof(proposed) = 'object')
    OR (kind <> 'edit' AND proposed IS NULL)
  )
);

COMMENT ON TABLE public.catalog_item_requests IS
  'カタログのグッズへの削除申請・修正申請・重複の報告。本人と admin/moderator だけが読める。反映は review_catalog_item_request() で行う。';

CREATE INDEX IF NOT EXISTS catalog_item_requests_user_idx
  ON public.catalog_item_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS catalog_item_requests_pending_idx
  ON public.catalog_item_requests (created_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS catalog_item_requests_item_idx
  ON public.catalog_item_requests (official_item_id);

-- 管理画面で送った人のユーザー名を引くための外部キー（profiles 経由。catalog_requests と同じ形）
ALTER TABLE public.catalog_item_requests
  DROP CONSTRAINT IF EXISTS catalog_item_requests_user_profile_fkey;
ALTER TABLE public.catalog_item_requests
  ADD CONSTRAINT catalog_item_requests_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.catalog_item_requests ENABLE ROW LEVEL SECURITY;

-- 未ログイン（anon）には何も許さない。取り下げは withdraw_catalog_item_request()、反映は review_catalog_item_request() を通す
REVOKE ALL ON public.catalog_item_requests FROM anon;
GRANT SELECT, INSERT ON public.catalog_item_requests TO authenticated;
GRANT UPDATE ON public.catalog_item_requests TO authenticated;

DROP POLICY IF EXISTS catalog_item_requests_insert_own ON public.catalog_item_requests;
CREATE POLICY catalog_item_requests_insert_own ON public.catalog_item_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- 読めるのは本人の分と運営（admin / moderator）だけ。ほかのユーザーの申請は見えない
DROP POLICY IF EXISTS catalog_item_requests_select ON public.catalog_item_requests;
CREATE POLICY catalog_item_requests_select ON public.catalog_item_requests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

-- 直接の書き換えは運営だけ（ふだんは review_catalog_item_request() を使う。メモの直しなど用）
DROP POLICY IF EXISTS catalog_item_requests_update_staff ON public.catalog_item_requests;
CREATE POLICY catalog_item_requests_update_staff ON public.catalog_item_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

-- ---------------------------------------------------------------------------
-- 2. 送るときの確認（中身の検証・送りすぎ防止・同じ申請の二重送信防止）
--    catalog_requests_before_insert と同じく、1日（日本時間）あたりの上限と重複をトリガーで止める
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.catalog_item_requests_before_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo';
  _key text;
  _v jsonb;
  _n integer;
BEGIN
  -- 運営が書く欄は、送る側からは入れさせない
  NEW.status := 'pending';
  NEW.admin_note := NULL;
  NEW.handled_by := NULL;
  NEW.handled_at := NULL;
  NEW.before_snapshot := NULL;
  NEW.apply_result := NULL;
  NEW.created_at := now();
  NEW.note := nullif(btrim(coalesce(NEW.note, '')), '');

  IF NOT EXISTS (
    SELECT 1 FROM public.official_items o WHERE o.id = NEW.official_item_id AND o.merged_into IS NULL
  ) THEN
    RAISE EXCEPTION 'catalog_item_request_item_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.kind = 'delete' THEN
    IF NEW.reason IS NULL THEN
      RAISE EXCEPTION 'catalog_item_request_invalid' USING ERRCODE = 'P0001', DETAIL = 'reason_required';
    END IF;
  ELSIF NEW.kind = 'duplicate' THEN
    NEW.reason := 'duplicate';
    IF NOT EXISTS (
      SELECT 1 FROM public.official_items o WHERE o.id = NEW.duplicate_of AND o.merged_into IS NULL
    ) THEN
      RAISE EXCEPTION 'catalog_item_request_item_not_found' USING ERRCODE = 'P0001', DETAIL = 'duplicate_of';
    END IF;
  ELSIF NEW.kind = 'edit' THEN
    NEW.reason := NULL;
    IF NEW.proposed IS NULL OR jsonb_typeof(NEW.proposed) <> 'object' OR NEW.proposed = '{}'::jsonb THEN
      RAISE EXCEPTION 'catalog_item_request_invalid' USING ERRCODE = 'P0001', DETAIL = 'empty_proposal';
    END IF;

    FOR _key, _v IN SELECT * FROM jsonb_each(NEW.proposed) LOOP
      IF _key = 'title' THEN
        IF jsonb_typeof(_v) <> 'string' OR char_length(btrim(_v #>> '{}')) NOT BETWEEN 1 AND 200 THEN
          RAISE EXCEPTION 'catalog_item_request_invalid' USING ERRCODE = 'P0001', DETAIL = 'title';
        END IF;
      ELSIF _key = 'price' THEN
        IF jsonb_typeof(_v) <> 'string' OR char_length(_v #>> '{}') > 50 THEN
          RAISE EXCEPTION 'catalog_item_request_invalid' USING ERRCODE = 'P0001', DETAIL = 'price';
        END IF;
      ELSIF _key = 'release_date' THEN
        IF jsonb_typeof(_v) <> 'string' OR (_v #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' THEN
          RAISE EXCEPTION 'catalog_item_request_invalid' USING ERRCODE = 'P0001', DETAIL = 'release_date';
        END IF;
        BEGIN
          PERFORM (_v #>> '{}')::date;
        EXCEPTION WHEN others THEN
          RAISE EXCEPTION 'catalog_item_request_invalid' USING ERRCODE = 'P0001', DETAIL = 'release_date';
        END;
      ELSIF _key = 'image' THEN
        IF jsonb_typeof(_v) <> 'string' OR (_v #>> '{}') !~* '^https?://\S+$' OR char_length(_v #>> '{}') > 1000 THEN
          RAISE EXCEPTION 'catalog_item_request_invalid' USING ERRCODE = 'P0001', DETAIL = 'image';
        END IF;
      ELSIF _key = 'content_name' THEN
        IF jsonb_typeof(_v) <> 'string'
           OR NOT EXISTS (SELECT 1 FROM public.content_names c WHERE c.name = (_v #>> '{}')) THEN
          RAISE EXCEPTION 'catalog_item_request_invalid' USING ERRCODE = 'P0001', DETAIL = 'content_name';
        END IF;
      ELSIF _key = 'type_tag_id' THEN
        IF jsonb_typeof(_v) <> 'string' OR (_v #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           OR NOT EXISTS (SELECT 1 FROM public.tags t WHERE t.id = (_v #>> '{}')::uuid AND t.category = 'type') THEN
          RAISE EXCEPTION 'catalog_item_request_invalid' USING ERRCODE = 'P0001', DETAIL = 'type_tag_id';
        END IF;
      ELSIF _key = 'character_tag_ids' THEN
        IF jsonb_typeof(_v) <> 'array' OR jsonb_array_length(_v) > 10 THEN
          RAISE EXCEPTION 'catalog_item_request_invalid' USING ERRCODE = 'P0001', DETAIL = 'character_tag_ids';
        END IF;
        IF EXISTS (
          SELECT 1 FROM jsonb_array_elements(_v) e
          WHERE jsonb_typeof(e) <> 'string'
             OR (e #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ) THEN
          RAISE EXCEPTION 'catalog_item_request_invalid' USING ERRCODE = 'P0001', DETAIL = 'character_tag_ids';
        END IF;
        SELECT count(*) INTO _n
        FROM (SELECT DISTINCT (e #>> '{}')::uuid AS id FROM jsonb_array_elements(_v) e) x
        WHERE NOT EXISTS (SELECT 1 FROM public.tags t WHERE t.id = x.id AND t.category = 'character');
        IF _n > 0 THEN
          RAISE EXCEPTION 'catalog_item_request_invalid' USING ERRCODE = 'P0001', DETAIL = 'character_tag_ids';
        END IF;
      ELSE
        RAISE EXCEPTION 'catalog_item_request_invalid' USING ERRCODE = 'P0001', DETAIL = 'unknown_key';
      END IF;
    END LOOP;
  END IF;

  -- 1日20件まで
  IF (
    SELECT count(*) FROM public.catalog_item_requests r
    WHERE r.user_id = NEW.user_id AND r.created_at >= _day_start
  ) >= 20 THEN
    RAISE EXCEPTION 'catalog_item_request_rate_limited' USING ERRCODE = 'P0001';
  END IF;

  -- 同じグッズへの同じ種類の申請が確認待ちのうちは、もう1件は受けない
  IF EXISTS (
    SELECT 1 FROM public.catalog_item_requests r
    WHERE r.user_id = NEW.user_id
      AND r.official_item_id = NEW.official_item_id
      AND r.kind = NEW.kind
      AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'catalog_item_request_duplicate' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.catalog_item_requests_before_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS catalog_item_requests_before_insert ON public.catalog_item_requests;
CREATE TRIGGER catalog_item_requests_before_insert BEFORE INSERT ON public.catalog_item_requests
  FOR EACH ROW EXECUTE FUNCTION public.catalog_item_requests_before_insert();

-- 届いたら運営（admin）に知らせる（user_reports_after_insert と同じ形。開くと管理画面の申請タブへ）
CREATE OR REPLACE FUNCTION public.catalog_item_requests_after_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _admin uuid;
BEGIN
  FOR _admin IN SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' AND ur.user_id <> NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
    VALUES (
      _admin,
      'admin_report',
      'カタログへの申請が届きました',
      CASE NEW.kind WHEN 'delete' THEN '削除申請' WHEN 'edit' THEN '修正申請' ELSE '重複の報告' END
        || coalesce(' / ' || (SELECT o.title FROM public.official_items o WHERE o.id = NEW.official_item_id), ''),
      jsonb_build_object('request_id', NEW.id, 'kind', NEW.kind, 'url', '/admin?tab=itemRequests'),
      false
    );
  END LOOP;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.catalog_item_requests_after_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS catalog_item_requests_after_insert ON public.catalog_item_requests;
CREATE TRIGGER catalog_item_requests_after_insert AFTER INSERT ON public.catalog_item_requests
  FOR EACH ROW EXECUTE FUNCTION public.catalog_item_requests_after_insert();

-- ---------------------------------------------------------------------------
-- 3. 本人の取り下げ（確認待ちのものだけ）
--    本人に UPDATE を許すと、取り下げのついでに中身を書き換えられるので、関数を通す
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.withdraw_catalog_item_request(_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.catalog_item_requests r
  SET status = 'withdrawn', handled_at = now()
  WHERE r.id = _request_id AND r.user_id = _uid AND r.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'catalog_item_request_not_pending' USING ERRCODE = 'P0001';
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.withdraw_catalog_item_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_catalog_item_request(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. 運営の確認（承認＝反映 / 見送り）
--    _approve = false: 見送り。カタログは変えない
--    _approve = true : kind ごとに反映する
--      delete    → exclude_from_lists = true, exclude_reason = 'user_request:<理由>'（行は消さない）
--      duplicate → merge_official_items(残す側, 寄せる側)。既定は「報告されたグッズ」を duplicate_of に寄せる。
--                  _keep_reported = true なら逆向き（報告されたグッズを残す）。
--                  merge_official_items は admin だけが通れるので、moderator はここで forbidden になる
--      edit      → official_items の欄を書き換え、作品・キャラ・カテゴリは item_tags を付け替える
--    どれも反映前の値を before_snapshot に残す
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_catalog_item_request(
  _request_id uuid,
  _approve boolean,
  _admin_note text DEFAULT NULL,
  _keep_reported boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _r public.catalog_item_requests%ROWTYPE;
  _item public.official_items%ROWTYPE;
  _note text := nullif(btrim(coalesce(_admin_note, '')), '');
  _before jsonb;
  _result jsonb := '{}'::jsonb;
  _tag uuid;
  _ids uuid[];
  _status text;
BEGIN
  IF _uid IS NULL
     OR NOT (public.has_role(_uid, 'admin'::app_role) OR public.has_role(_uid, 'moderator'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0001';
  END IF;
  IF _note IS NOT NULL AND char_length(_note) > 500 THEN
    _note := left(_note, 500);
  END IF;

  SELECT * INTO _r FROM public.catalog_item_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'catalog_item_request_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF _r.status <> 'pending' THEN
    RAISE EXCEPTION 'catalog_item_request_not_pending' USING ERRCODE = 'P0001';
  END IF;

  IF _approve THEN
    SELECT * INTO _item FROM public.official_items WHERE id = _r.official_item_id FOR UPDATE;
    IF NOT FOUND OR _item.merged_into IS NOT NULL THEN
      RAISE EXCEPTION 'catalog_item_request_item_not_found' USING ERRCODE = 'P0001';
    END IF;

    IF _r.kind = 'delete' THEN
      _before := jsonb_build_object(
        'exclude_from_lists', _item.exclude_from_lists,
        'exclude_reason', _item.exclude_reason
      );
      UPDATE public.official_items
      SET exclude_from_lists = true,
          exclude_reason = 'user_request:' || coalesce(_r.reason, 'other')
      WHERE id = _item.id;
      _result := jsonb_build_object('excluded', true);

    ELSIF _r.kind = 'duplicate' THEN
      _before := jsonb_build_object(
        'reported_id', _r.official_item_id,
        'duplicate_of', _r.duplicate_of,
        'keep_reported', _keep_reported
      );
      -- 統合は既存の関数に任せる（所持・ほしい・タグ・コメント等の付け替えと、merged_into の設定）
      IF _keep_reported THEN
        _result := public.merge_official_items(_r.official_item_id, _r.duplicate_of);
      ELSE
        _result := public.merge_official_items(_r.duplicate_of, _r.official_item_id);
      END IF;
      IF coalesce((_result ->> 'ok')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'catalog_item_request_merge_failed' USING ERRCODE = 'P0001',
          DETAIL = coalesce(_result ->> 'reason', 'unknown');
      END IF;

    ELSIF _r.kind = 'edit' THEN
      _before := jsonb_build_object(
        'title', _item.title,
        'content_name', _item.content_name,
        'release_date', _item.release_date,
        'price', _item.price,
        'image', _item.image,
        'tag_ids', coalesce((
          SELECT jsonb_object_agg(s.category, s.ids)
          FROM (
            SELECT t.category, jsonb_agg(t.id ORDER BY t.name) AS ids
            FROM public.item_tags it
            JOIN public.tags t ON t.id = it.tag_id
            WHERE it.official_item_id = _item.id
              AND t.category IN ('content', 'character', 'type')
            GROUP BY t.category
          ) s
        ), '{}'::jsonb)
      );

      UPDATE public.official_items o
      SET title = CASE WHEN _r.proposed ? 'title' THEN btrim(_r.proposed ->> 'title') ELSE o.title END,
          price = CASE WHEN _r.proposed ? 'price' THEN btrim(_r.proposed ->> 'price') ELSE o.price END,
          release_date = CASE WHEN _r.proposed ? 'release_date' THEN (_r.proposed ->> 'release_date')::date ELSE o.release_date END,
          image = CASE WHEN _r.proposed ? 'image' THEN btrim(_r.proposed ->> 'image') ELSE o.image END,
          content_name = CASE WHEN _r.proposed ? 'content_name' THEN _r.proposed ->> 'content_name' ELSE o.content_name END
      WHERE o.id = _item.id;

      -- 作品: content タグを付け替える（無ければ import_official_batch と同じ形で作る）
      IF _r.proposed ? 'content_name' THEN
        SELECT t.id INTO _tag
        FROM public.tags t
        WHERE t.category = 'content' AND t.name = _r.proposed ->> 'content_name'
        ORDER BY t.usage_count DESC NULLS LAST, t.created_at
        LIMIT 1;
        IF _tag IS NULL THEN
          INSERT INTO public.tags (name, category, display_context, status)
          VALUES (_r.proposed ->> 'content_name', 'content', '作品', 'approved')
          RETURNING id INTO _tag;
        END IF;
        DELETE FROM public.item_tags it
        USING public.tags t
        WHERE it.official_item_id = _item.id AND it.tag_id = t.id AND t.category = 'content' AND it.tag_id <> _tag;
        INSERT INTO public.item_tags (official_item_id, tag_id)
        SELECT _item.id, _tag
        WHERE NOT EXISTS (SELECT 1 FROM public.item_tags it WHERE it.official_item_id = _item.id AND it.tag_id = _tag);
      END IF;

      -- キャラ: 申請された組み合わせにそろえる（空配列なら外すだけ）
      IF _r.proposed ? 'character_tag_ids' THEN
        _ids := ARRAY(
          SELECT DISTINCT (e #>> '{}')::uuid
          FROM jsonb_array_elements(_r.proposed -> 'character_tag_ids') e
        );
        DELETE FROM public.item_tags it
        USING public.tags t
        WHERE it.official_item_id = _item.id AND it.tag_id = t.id AND t.category = 'character'
          AND NOT (it.tag_id = ANY (_ids));
        INSERT INTO public.item_tags (official_item_id, tag_id)
        SELECT _item.id, x.id
        FROM unnest(_ids) AS x(id)
        WHERE EXISTS (SELECT 1 FROM public.tags t WHERE t.id = x.id AND t.category = 'character')
          AND NOT EXISTS (SELECT 1 FROM public.item_tags it WHERE it.official_item_id = _item.id AND it.tag_id = x.id);
      END IF;

      -- カテゴリ（グッズタイプ）: 1つにそろえる
      IF _r.proposed ? 'type_tag_id' THEN
        _tag := (_r.proposed ->> 'type_tag_id')::uuid;
        IF NOT EXISTS (SELECT 1 FROM public.tags t WHERE t.id = _tag AND t.category = 'type') THEN
          RAISE EXCEPTION 'catalog_item_request_invalid' USING ERRCODE = 'P0001', DETAIL = 'type_tag_id';
        END IF;
        DELETE FROM public.item_tags it
        USING public.tags t
        WHERE it.official_item_id = _item.id AND it.tag_id = t.id AND t.category = 'type' AND it.tag_id <> _tag;
        INSERT INTO public.item_tags (official_item_id, tag_id)
        SELECT _item.id, _tag
        WHERE NOT EXISTS (SELECT 1 FROM public.item_tags it WHERE it.official_item_id = _item.id AND it.tag_id = _tag);
      END IF;

      _result := jsonb_build_object('updated', true);
    END IF;

    _status := 'approved';
  ELSE
    _status := 'rejected';
  END IF;

  UPDATE public.catalog_item_requests
  SET status = _status,
      admin_note = _note,
      handled_by = _uid,
      handled_at = now(),
      before_snapshot = _before,
      apply_result = CASE WHEN _approve THEN _result ELSE NULL END
  WHERE id = _r.id;

  -- 送った人へ知らせる（文言はアプリ側で言語に合わせて出し直す。ここは日本語の控え）
  INSERT INTO public.notifications (user_id, title, message, type, data)
  SELECT
    _r.user_id,
    CASE WHEN _status = 'approved' THEN 'カタログへの申請を反映しました' ELSE 'カタログへの申請を見送りました' END,
    coalesce(o.title, '') || CASE WHEN _note IS NOT NULL THEN E'\n' || _note ELSE '' END,
    'catalog_item_request',
    jsonb_build_object(
      'request_id', _r.id,
      'status', _status,
      'kind', _r.kind,
      'item_id', _r.official_item_id,
      'item_title', o.title,
      'url', '/item/' || coalesce(
        CASE WHEN _status = 'approved' AND _r.kind = 'duplicate' AND NOT _keep_reported THEN _r.duplicate_of END,
        _r.official_item_id
      )::text
    )
  FROM public.official_items o
  WHERE o.id = _r.official_item_id;

  RETURN jsonb_build_object('ok', true, 'status', _status, 'result', _result);
END;
$$;

COMMENT ON FUNCTION public.review_catalog_item_request(uuid, boolean, text, boolean) IS
  'カタログへの申請を承認（反映）または見送る。admin/moderator のみ。重複の統合は merge_official_items（admin のみ）を使う。';

REVOKE ALL ON FUNCTION public.review_catalog_item_request(uuid, boolean, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_catalog_item_request(uuid, boolean, text, boolean) TO authenticated;
