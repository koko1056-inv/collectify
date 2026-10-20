-- ユーザー名＋秘密の質問によるパスワード再設定。
--
-- 【背景】
-- 登録はユーザー名＋パスワードのみで、メールは架空（username@example.com、src/utils/auth.ts）。
-- 今まではパスワードを忘れると運営への問い合わせ（src/config/legal.ts の LEGAL_OPERATOR.email）しかなかった。
-- ここでは「秘密の質問」を本人確認の手段として追加し、ログイン画面から自分でパスワードを再設定できるようにする。
--
-- 【構成】
--   1) secret_answer_normalize(text): 答えの表記ゆれ（全角半角・大文字小文字・ひらがなカタカナ・空白）を吸収する正規化
--      src/utils/secretAnswerNormalize.ts にクライアント用の同じアルゴリズムのTS版がある（検証はこのSQL関数が最終判定）
--   2) user_secret_questions: 答えは平文を保存せず、正規化してから pgcrypto の crypt() でハッシュ化して保存
--   3) クライアントから呼べる RPC（authenticated, SECURITY DEFINER）: 自分の質問の設定・状態確認
--   4) service_role だけが呼べる RPC: ユーザー名からの質問の引き当て・答えの検証・レート制限の記録と判定
--      （パスワード未ログインの状態で呼ばれるため、これらは supabase/functions/secret-question-reset が
--       service_role キーで呼ぶ。クライアントの anon/authenticated には実行権限を与えない）
--   5) secret_reset_attempts / secret_reset_events: レート制限の記録と、監査用のイベントログ
--
-- 【セッションの失効について】
-- パスワードをリセットしたら、それ以前に発行済みのセッション（トークン）は無効にしたい。
-- auth.sessions / auth.refresh_tokens は supabase_auth_admin が所有し、service_role からの直接の
-- DELETE 権限は無い（Supabase の auth スキーマは Auth サーバー専用）。そのため DB 関数は作らない。
--
-- 加えて、supabase-js の auth.admin.signOut(token, scope) は「ユーザーID」ではなく
-- 「アクセストークン（JWT）」を受け取る API で、ユーザーIDを渡しても失効しない。
-- そのため Edge Function（secret-question-reset）の中で、パスワード変更後に新パスワードで
-- 一度だけ signInWithPassword し、そこで得たアクセストークンを 'global' スコープで signOut
-- することで、そのユーザーの全セッション（この一度きりのサインインで作った分も含む）を
-- 失効させている。詳細は supabase/functions/secret-question-reset/index.ts の handleReset を参照。

-- ---------------------------------------------------------------------------
-- 0. pgcrypto（ハッシュ化に crypt/gen_salt を使う）
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1. 正規化関数
--    固定の質問IDリストはこのファイルの CHECK 制約と、
--    src/config/secretQuestions.ts の SECRET_QUESTION_IDS で揃えてある。
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.secret_answer_normalize(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  normalized text;
  result text := '';
  i int;
  code int;
BEGIN
  -- (a) 前後の空白を除く
  -- (b) Unicode正規化（NFKC）で全角英数・半角カナ・合字などの表記ゆれを吸収する
  --     （全角スペース U+3000 も NFKC で半角スペースに変わる）
  -- (c) 小文字化（ローマ字の大文字/小文字を揃える。例: "Mrs." / "MRS." / "ｍｒｓ．" が同じになる）
  normalized := lower(normalize(btrim(coalesce(input, '')), NFKC));

  -- (d) ひらがな（U+3041-3096）を1文字ずつカタカナ（U+30A1-30F6、+0x60）に変換する。
  --     こうすることで「ミセス」と「みせす」が同じ答えとして扱われる。
  --     長音符ー（U+30FC）・中点・（U+30FB）はこの範囲の外なので変換しない
  --     （NFKCでも変わらず、答えの一部として意味を持ちうるため意図的にそのまま残す）。
  --     ascii() は UTF8 エンコーディングでは Unicode のコードポイントを返す（Supabase は UTF8）。
  FOR i IN 1..length(normalized) LOOP
    code := ascii(substr(normalized, i, 1));
    IF code BETWEEN 12353 AND 12438 THEN -- U+3041-U+3096
      result := result || chr(code + 96);
    ELSE
      result := result || substr(normalized, i, 1);
    END IF;
  END LOOP;

  -- (e) 連続する空白を1つにまとめ、前後の空白を除く
  RETURN btrim(regexp_replace(result, '\s+', ' ', 'g'));
END;
$function$;

REVOKE ALL ON FUNCTION public.secret_answer_normalize(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.secret_answer_normalize(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. 秘密の質問と答え（ハッシュ）の保存先
--    RLS は有効だがポリシーは置かない＝クライアントからは読めない・書けない。
--    アクセスは SECURITY DEFINER の RPC を通してのみ行う。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_secret_questions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id text NOT NULL CHECK (question_id IN (
    'first_oshi', 'first_goods', 'childhood_nickname', 'live_venue',
    'first_anime', 'school_name', 'pet_name'
  )),
  answer_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_secret_questions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_secret_questions FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. クライアントから呼べる RPC（本人のログイン中のみ）
-- ---------------------------------------------------------------------------

-- 自分の秘密の質問を設定・変更する（登録直後 / 設定画面の両方から呼ぶ）
CREATE OR REPLACE FUNCTION public.set_my_secret_question(question_id text, answer text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  norm text;
  sample boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'login_required';
  END IF;

  SELECT p.is_sample INTO sample FROM public.profiles p WHERE p.id = uid;
  IF sample IS TRUE THEN
    RAISE EXCEPTION 'sample_account_not_allowed';
  END IF;

  IF question_id IS NULL OR question_id NOT IN (
    'first_oshi', 'first_goods', 'childhood_nickname', 'live_venue',
    'first_anime', 'school_name', 'pet_name'
  ) THEN
    RAISE EXCEPTION 'invalid_question';
  END IF;

  norm := public.secret_answer_normalize(answer);
  IF length(norm) < 2 OR length(norm) > 64 THEN
    RAISE EXCEPTION 'invalid_answer_length';
  END IF;

  INSERT INTO public.user_secret_questions (user_id, question_id, answer_hash, updated_at)
  VALUES (uid, question_id, extensions.crypt(norm, extensions.gen_salt('bf', 10)), now())
  ON CONFLICT (user_id) DO UPDATE
    SET question_id = EXCLUDED.question_id,
        answer_hash = EXCLUDED.answer_hash,
        updated_at = now();
END;
$function$;

REVOKE ALL ON FUNCTION public.set_my_secret_question(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_secret_question(text, text) TO authenticated;

-- 自分の設定状況（ハッシュは返さない）
CREATE OR REPLACE FUNCTION public.get_my_secret_question_status()
RETURNS TABLE (has_question boolean, question_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (q.user_id IS NOT NULL), q.question_id
  FROM (SELECT auth.uid() AS uid) me
  LEFT JOIN public.user_secret_questions q ON q.user_id = me.uid;
$function$;

REVOKE ALL ON FUNCTION public.get_my_secret_question_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_secret_question_status() TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. service_role 専用 RPC（未ログインのパスワード再設定フローから、
--    Edge Function が service_role キーで呼ぶ）
-- ---------------------------------------------------------------------------

-- ユーザー名から質問を引き当てる。サンプルアカウント・未設定・存在しないユーザー名は
-- すべて「該当行なし」として返す（呼び出し側で同じ「unavailable」扱いにし、列挙を難しくする）。
CREATE OR REPLACE FUNCTION public.secret_reset_lookup(_username text)
RETURNS TABLE (user_id uuid, question_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, q.question_id
  FROM public.profiles p
  JOIN public.user_secret_questions q ON q.user_id = p.id
  WHERE p.username = _username
    AND p.is_sample = false;
$function$;

REVOKE ALL ON FUNCTION public.secret_reset_lookup(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.secret_reset_lookup(text) TO service_role;

-- 答えの検証。存在しないユーザーID・未設定でも常に同じ分だけ crypt() を走らせ、
-- 処理時間の差で「このユーザーは秘密の質問を設定していない」等が分からないようにする。
CREATE OR REPLACE FUNCTION public.secret_reset_verify(_user_id uuid, _answer text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sample boolean;
  stored_hash text;
  norm text;
BEGIN
  norm := public.secret_answer_normalize(_answer);

  SELECT p.is_sample INTO sample FROM public.profiles p WHERE p.id = _user_id;
  SELECT q.answer_hash INTO stored_hash FROM public.user_secret_questions q WHERE q.user_id = _user_id;

  IF sample IS DISTINCT FROM false OR stored_hash IS NULL THEN
    -- ダミーの crypt() で、正しい経路と同程度の計算時間をかけておく
    PERFORM extensions.crypt(norm, extensions.gen_salt('bf', 10));
    RETURN false;
  END IF;

  RETURN extensions.crypt(norm, stored_hash) = stored_hash;
END;
$function$;

REVOKE ALL ON FUNCTION public.secret_reset_verify(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.secret_reset_verify(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. レート制限の記録・判定とイベントログ
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.secret_reset_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username_norm text,
  ip_hash text,
  action text NOT NULL CHECK (action IN ('lookup', 'reset')),
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS secret_reset_attempts_username_idx
  ON public.secret_reset_attempts (username_norm, created_at);
CREATE INDEX IF NOT EXISTS secret_reset_attempts_ip_idx
  ON public.secret_reset_attempts (ip_hash, created_at);
ALTER TABLE public.secret_reset_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.secret_reset_attempts FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.secret_reset_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid,
  username_norm text,
  event text NOT NULL CHECK (event IN ('lookup', 'success', 'failure', 'locked', 'unavailable')),
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS secret_reset_events_created_idx ON public.secret_reset_events (created_at);
ALTER TABLE public.secret_reset_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.secret_reset_events FROM anon, authenticated;

-- 管理者はイベントログを閲覧できる（調査・不正検知用）。has_role は既存の関数。
CREATE POLICY secret_reset_events_admin_select ON public.secret_reset_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ロック中かどうかの判定だけを行う（書き込みはしない）。
--   ・同じユーザー名で reset 失敗が1時間に5回以上
--   ・同じIPで reset 失敗が1時間に10回以上、または lookup が1時間に30回以上
CREATE OR REPLACE FUNCTION public.secret_reset_check_lock(_username_norm text, _ip_hash text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    (
      _username_norm IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.secret_reset_attempts a
        WHERE a.username_norm = _username_norm
          AND a.action = 'reset' AND a.success = false
          AND a.created_at > now() - interval '1 hour'
        GROUP BY a.username_norm
        HAVING count(*) >= 5
      )
    )
    OR (
      _ip_hash IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.secret_reset_attempts a
        WHERE a.ip_hash = _ip_hash
          AND a.action = 'reset' AND a.success = false
          AND a.created_at > now() - interval '1 hour'
        GROUP BY a.ip_hash
        HAVING count(*) >= 10
      )
    )
    OR (
      _ip_hash IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.secret_reset_attempts a
        WHERE a.ip_hash = _ip_hash
          AND a.action = 'lookup'
          AND a.created_at > now() - interval '1 hour'
        GROUP BY a.ip_hash
        HAVING count(*) >= 30
      )
    );
$function$;

REVOKE ALL ON FUNCTION public.secret_reset_check_lock(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.secret_reset_check_lock(text, text) TO service_role;

-- 試行の記録（lookup/reset のたびに1行）
CREATE OR REPLACE FUNCTION public.secret_reset_record_attempt(
  _username_norm text, _ip_hash text, _action text, _success boolean
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  INSERT INTO public.secret_reset_attempts (username_norm, ip_hash, action, success)
  VALUES (_username_norm, _ip_hash, _action, _success);
$function$;

REVOKE ALL ON FUNCTION public.secret_reset_record_attempt(text, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.secret_reset_record_attempt(text, text, text, boolean) TO service_role;

-- イベントログの記録
CREATE OR REPLACE FUNCTION public.secret_reset_log_event(
  _user_id uuid, _username_norm text, _event text, _ip_hash text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  INSERT INTO public.secret_reset_events (user_id, username_norm, event, ip_hash)
  VALUES (_user_id, _username_norm, _event, _ip_hash);
$function$;

REVOKE ALL ON FUNCTION public.secret_reset_log_event(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.secret_reset_log_event(uuid, text, text, text) TO service_role;

-- 古いログの保持期間について:
-- secret_reset_attempts / secret_reset_events を定期的に（例: 90日より古い行を）削除する
-- pg_cron ジョブは、この変更では入れていない（任意・要望があれば別マイグレーションで追加する）。
-- 入れる場合は supabase/migrations/20261016060411_catalog_thumbs_catch_up.sql の
-- cron.schedule(...) と同じ形で、
--   select cron.schedule('secret-reset-log-cleanup', '0 3 * * *',
--     $$ delete from public.secret_reset_attempts where created_at < now() - interval '90 days';
--        delete from public.secret_reset_events where created_at < now() - interval '90 days'; $$);
-- のように書ける。
