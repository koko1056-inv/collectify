-- 運営向け「あなたのこと」の集計（profile_private の答えを、選択肢ごとの人数と回答率だけにして返す）
--
-- 守ること:
--   - 個人の行は返さない。返すのは人数（件数）と、件数から出せる回答率だけ。
--   - profile_private の RLS・GRANT は一切変えない（本人だけのまま）。集計は SECURITY DEFINER の
--     この関数の中だけで行い、関数の中で管理者（public.has_role(auth.uid(), 'admin')）でなければ例外にする。
--     管理者の判定は管理画面（/admin、src/components/ProtectedRoute.tsx の requiredRole="admin"）と同じ
--     public.user_roles + public.has_role（20251115111425_…sql）。
--   - 公式サンプルアカウント（profiles.is_sample = true）は分母（対象ユーザー数）にも分子（回答）にも入れない。
--
-- 小さい数の保護（k = 5）:
--   1. 対象ユーザー数が 5 未満 → 何も出さない（全体を suppressed にし、数字はすべて null）。
--   2. 回答者数（profile_private の行がある人）が 5 未満 → 内訳はすべて伏せる（数字は null）。
--      「1つ以上答えた人」も 5 未満なら null。
--   3. 項目ごとに、答えた人（NULL 以外／よく買うグッズは1つ以上）が 5 未満 → その項目は丸ごと伏せる。
--   4. 1つ選び（性別・年代・都道府県・推し活歴・予算・交換）:
--        5 以上の選択肢だけを個別に出し、5 未満の選択肢は「その他（5未満）」1つにまとめる。
--        まとめた合計が 1〜4 のままだと「答えた人 − 出ている選択肢の合計」で逆算できてしまうので、
--        出ている選択肢のうち一番少ないものから順にまとめへ移し、合計が 5 以上になるまで続ける（二次秘匿）。
--        まとめには必ず2つ以上の選択肢が入る（1つだけなら 5 未満のはずなので、そもそもまとめに入らない）。
--        どの選択肢がまとめに入ったかは返さない（0人の選択肢も出さないので、区別がつかない）。
--   5. よく買うグッズ（複数選び。unnest で選択肢ごとに数える）:
--        選択肢ごとの人数が 5 以上だけを出し、5 未満の選択肢はまとめる。まとめの数は「まとめた選択肢の
--        どれかを選んだ人の数（重複なし）」。それが 5 未満ならまとめも伏せる（other_hidden = true）。
--        複数選びは選択肢の合計が回答者数と一致しないので、引き算で逆算はできない（二次秘匿はしない）。
--   ※ 期間を変えて何度も取り、差分から1人を割り出すことは、この関数では防げない（運営の運用で避ける）。
--
-- SQL エディタから呼ぶとき（postgres ロールでは auth.uid() が NULL になり forbidden になる）:
--   BEGIN;
--   SELECT set_config('request.jwt.claims',
--     json_build_object('sub', '<管理者の user_id>', 'role', 'authenticated')::text, true);
--   SET LOCAL ROLE authenticated;
--   SELECT public.profile_private_aggregate();
--   ROLLBACK;
--   （<管理者の user_id> は public.user_roles に role = 'admin' がある人。トランザクションの中だけ有効）

-- ---------------------------------------------------------------------------
-- 1. 1つ選びの小さい数の保護（中身を読まない純粋な関数。集計関数の中からだけ使う）
--    _counts: {"female": 12, "male": 3, ...}（0人の選択肢は入れなくてよい）
--    返り値: {"buckets": [{"value": "female", "count": 12}, ...], "other": 8 | null}
--    src/lib/profileExtrasAggregate.ts の suppressSingleChoice と同じ手順（scripts/test-profile-extras-aggregate.mjs）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profile_private_suppress_single(_counts jsonb, _k integer)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  _keys text[];
  _ns integer[];
  _shown integer := 0;
  _other integer := 0;
  _buckets jsonb := '[]'::jsonb;
  i integer;
BEGIN
  SELECT coalesce(array_agg(e.key ORDER BY e.value::integer DESC, e.key), '{}'),
         coalesce(array_agg(e.value::integer ORDER BY e.value::integer DESC, e.key), '{}')
    INTO _keys, _ns
    FROM jsonb_each_text(coalesce(_counts, '{}'::jsonb)) AS e
   WHERE e.value::integer > 0;

  -- 多い順に並べたので、5 以上のものは先頭にかたまっている
  FOR i IN 1 .. coalesce(array_length(_ns, 1), 0) LOOP
    IF _ns[i] >= _k THEN
      _shown := i;
    ELSE
      _other := _other + _ns[i];
    END IF;
  END LOOP;

  -- 二次秘匿: まとめが 1〜(k-1) なら、出ている中で一番少ないものをまとめへ移す
  WHILE _other > 0 AND _other < _k AND _shown > 0 LOOP
    _other := _other + _ns[_shown];
    _shown := _shown - 1;
  END LOOP;

  FOR i IN 1 .. _shown LOOP
    _buckets := _buckets || jsonb_build_array(jsonb_build_object('value', _keys[i], 'count', _ns[i]));
  END LOOP;

  RETURN jsonb_build_object(
    'buckets', _buckets,
    -- 合計がそもそも k 未満のとき（呼ぶ側で項目ごと伏せるので本来来ない）も、まとめは出さない
    'other', CASE WHEN _other >= _k THEN _other ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.profile_private_suppress_single(jsonb, integer) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. 集計（管理者だけ）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profile_private_aggregate()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _k constant integer := 5;
  _uid uuid := auth.uid();
  _targets integer;
  _rows integer;
  _any integer;
  _field text;
  _answered integer;
  _counts jsonb;
  _fields jsonb := '{}'::jsonb;
  _goods_shown jsonb;
  _goods_small text[];
  _goods_other integer;
  -- 分子: サンプルアカウントでない人の行だけ。以降の集計はすべてここから（STABLE なので一時テーブルは使わない）
  _base constant text :=
    '(SELECT pp.* FROM public.profile_private pp JOIN public.profiles p ON p.id = pp.user_id WHERE NOT p.is_sample)';
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- 分母: サンプルアカウントを除いたユーザー
  SELECT count(*) INTO _targets FROM public.profiles p WHERE NOT p.is_sample;

  IF _targets < _k THEN
    RETURN jsonb_build_object(
      'k', _k, 'generated_at', now(), 'suppressed', true,
      'target_users', NULL, 'respondents', NULL, 'any_answered', NULL, 'fields', '{}'::jsonb
    );
  END IF;

  EXECUTE format(
    'SELECT count(*)::integer,
            (count(*) FILTER (WHERE gender IS NOT NULL OR age_range IS NOT NULL OR prefecture IS NOT NULL
                                OR oshi_years IS NOT NULL OR monthly_budget IS NOT NULL
                                OR cardinality(coalesce(goods_types, ''{}'')) > 0 OR trade_frequency IS NOT NULL))::integer
       FROM %s b', _base
  ) INTO _rows, _any;

  -- 1つ選びの項目（列名は下の固定リストだけ。%I で引用する）
  FOREACH _field IN ARRAY ARRAY['gender', 'age_range', 'prefecture', 'oshi_years', 'monthly_budget', 'trade_frequency'] LOOP
    EXECUTE format(
      'SELECT coalesce(sum(n), 0)::integer, coalesce(jsonb_object_agg(v, n), ''{}''::jsonb)
         FROM (SELECT b.%1$I AS v, count(*)::integer AS n FROM %2$s b WHERE b.%1$I IS NOT NULL GROUP BY 1) s',
      _field, _base
    ) INTO _answered, _counts;

    IF _rows < _k OR _answered < _k THEN
      _fields := _fields || jsonb_build_object(_field, jsonb_build_object(
        'answered', NULL, 'suppressed', true, 'buckets', '[]'::jsonb, 'other', NULL, 'other_hidden', false));
    ELSE
      _fields := _fields || jsonb_build_object(_field,
        jsonb_build_object('answered', _answered, 'suppressed', false, 'other_hidden', false)
          || public.profile_private_suppress_single(_counts, _k));
    END IF;
  END LOOP;

  -- よく買うグッズ（複数選び）
  EXECUTE format('SELECT count(*)::integer FROM %s b WHERE cardinality(coalesce(b.goods_types, ''{}'')) > 0', _base)
    INTO _answered;

  IF _rows < _k OR _answered < _k THEN
    _fields := _fields || jsonb_build_object('goods_types', jsonb_build_object(
      'answered', NULL, 'suppressed', true, 'buckets', '[]'::jsonb, 'other', NULL, 'other_hidden', false));
  ELSE
    -- 選択肢ごとの人数（unnest。同じ人が同じ選択肢を重ねて持たないよう DISTINCT で数える）
    EXECUTE format(
      'WITH per AS (
         SELECT g AS v, count(DISTINCT b.user_id)::integer AS n
           FROM %s b, unnest(b.goods_types) AS g
          GROUP BY g
       )
       SELECT coalesce(jsonb_agg(jsonb_build_object(''value'', v, ''count'', n) ORDER BY n DESC, v) FILTER (WHERE n >= $1), ''[]''::jsonb),
              coalesce(array_agg(v) FILTER (WHERE n < $1), ''{}''::text[])
         FROM per', _base
    ) INTO _goods_shown, _goods_small USING _k;

    -- まとめ: 5 未満の選択肢のどれかを選んだ人（重複なし）
    EXECUTE format('SELECT count(*)::integer FROM %s b WHERE b.goods_types && $1', _base)
      INTO _goods_other USING _goods_small;

    _fields := _fields || jsonb_build_object('goods_types', jsonb_build_object(
      'answered', _answered,
      'suppressed', false,
      'buckets', _goods_shown,
      'other', CASE WHEN _goods_other >= _k THEN _goods_other ELSE NULL END,
      'other_hidden', _goods_other > 0 AND _goods_other < _k
    ));
  END IF;

  RETURN jsonb_build_object(
    'k', _k,
    'generated_at', now(),
    'suppressed', false,
    'target_users', _targets,
    'respondents', CASE WHEN _rows >= _k THEN _rows ELSE NULL END,
    'any_answered', CASE WHEN _rows >= _k AND _any >= _k THEN _any ELSE NULL END,
    'fields', _fields
  );
END;
$$;

COMMENT ON FUNCTION public.profile_private_aggregate() IS
  '運営向け: profile_private の選択肢ごとの人数と回答率（5未満は伏せる・まとめる）。管理者以外は forbidden。サンプルアカウントは除外';

REVOKE ALL ON FUNCTION public.profile_private_aggregate() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_private_aggregate() TO authenticated;
