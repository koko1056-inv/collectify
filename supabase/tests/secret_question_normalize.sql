-- public.secret_answer_normalize() の期待値テスト。
--
-- このリポジトリの CI には Postgres が無いため自動実行はされない。
-- 開発用DBに対して手動で実行する場合は:
--   psql "$DATABASE_URL" -f supabase/tests/secret_question_normalize.sql
-- マイグレーション 20261020200000_secret_question_reset.sql を適用済みであること。
--
-- src/utils/secretAnswerNormalize.ts（npm run test:secret-question で検証）と
-- 同じ期待値にしてあること。

do $$
begin
  -- 全角半角・前後の空白・ひらがなカタカナの違いを無視して同じになる
  assert public.secret_answer_normalize('ミセス') = public.secret_answer_normalize('みせす');
  assert public.secret_answer_normalize('ミセス') = public.secret_answer_normalize('ﾐｾｽ');
  assert public.secret_answer_normalize('ミセス') = public.secret_answer_normalize(' ミセス ');
  assert public.secret_answer_normalize('みせす') = 'ミセス';

  -- 英字の大文字小文字・全角半角の違いを無視して同じになる
  assert public.secret_answer_normalize('Mrs.') = public.secret_answer_normalize('MRS.');
  assert public.secret_answer_normalize('Mrs.') = public.secret_answer_normalize('ｍｒｓ．');

  -- 連続する空白は1つにまとまる
  assert public.secret_answer_normalize('green   apple') = 'green apple';
  assert public.secret_answer_normalize('ｇｒｅｅｎ　　ａｐｐｌｅ') = 'green apple';

  -- 長音符ー・中点・は変換しない（意味を持ちうるためそのまま残る）
  assert public.secret_answer_normalize('ラーメン') = public.secret_answer_normalize('らーめん');
  assert public.secret_answer_normalize('ハイ・キュー') = public.secret_answer_normalize('はい・きゅー');

  -- 違う答えは違う
  assert public.secret_answer_normalize('ポチ') <> public.secret_answer_normalize('タマ');

  raise notice 'secret_answer_normalize: all assertions passed';
end;
$$;
