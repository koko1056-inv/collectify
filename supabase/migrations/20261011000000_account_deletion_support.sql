-- アカウント削除（Edge Function delete-account）を成立させるための外部キーの見直し。
--
-- 背景:
--   auth.users を消すと profiles が CASCADE で消え、そこから先の子テーブルも連鎖して消える。
--   ところが ON DELETE NO ACTION のままの外部キーが残っていて、そこに行があると
--   「他の行から参照されています」で削除全体が失敗する。
--   本番の pg_constraint を調べて、削除の邪魔になるもの・他人のデータを巻き込むものだけを直す。
--
-- 方針:
--   1) 本人だけのデータ（いいね・投稿・コレクション・メッセージ等）        -> CASCADE（本人と一緒に消す）
--   2) 全員で共有するカタログ（公式アイテム・作品名・グループ・イベント等）  -> SET NULL（行は残し、作成者だけ外す）
--   3) 他のユーザーとの取引（trade_requests）                           -> 行は残し、本人の id だけ外す（匿名化）
--
-- 何度流しても同じ結果になる（制約名で DROP IF EXISTS してから付け直す）。
-- 対象のテーブル・列が無い環境ではスキップする。

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- (子テーブル, 子の列, 制約名, 参照先, 参照先の列, 削除時の動作)

      -- ---- auth.users を参照しているもの ----
      ('collection_likes',   'collection_owner_id', 'collection_likes_collection_owner_id_fkey', 'auth.users', 'id', 'CASCADE'),
      ('collection_likes',   'user_id',             'collection_likes_user_id_fkey',             'auth.users', 'id', 'CASCADE'),
      ('content_names',      'created_by',          'content_names_created_by_fkey',             'auth.users', 'id', 'SET NULL'),
      ('event_participants', 'user_id',             'event_participants_user_id_fkey',           'auth.users', 'id', 'CASCADE'),
      ('events',             'created_by',          'events_created_by_fkey',                    'auth.users', 'id', 'SET NULL'),
      ('group_members',      'user_id',             'group_members_user_id_fkey',                'auth.users', 'id', 'CASCADE'),
      ('groups',             'created_by',          'groups_created_by_fkey',                    'auth.users', 'id', 'SET NULL'),
      ('messages',           'receiver_id',         'messages_receiver_id_fkey',                 'auth.users', 'id', 'CASCADE'),
      ('messages',           'sender_id',           'messages_sender_id_fkey',                   'auth.users', 'id', 'CASCADE'),
      ('official_items',     'created_by',          'official_items_created_by_fkey',            'auth.users', 'id', 'SET NULL'),
      ('user_item_likes',    'user_id',             'user_item_likes_user_id_fkey',              'auth.users', 'id', 'CASCADE'),

      -- ---- profiles を参照しているもの ----
      ('goods_posts',        'user_id',             'goods_posts_user_id_fkey',                  'public.profiles', 'id', 'CASCADE'),
      ('invite_codes',       'used_by',             'invite_codes_used_by_fkey',                 'public.profiles', 'id', 'SET NULL'),
      ('messages',           'receiver_id',         'messages_receiver_id_fkey_profiles',        'public.profiles', 'id', 'CASCADE'),
      ('messages',           'sender_id',           'messages_sender_id_fkey_profiles',          'public.profiles', 'id', 'CASCADE'),
      ('original_items',     'created_by',          'original_items_created_by_fkey',            'public.profiles', 'id', 'SET NULL'),
      ('profiles',           'referred_by',         'profiles_referred_by_fkey',                 'public.profiles', 'id', 'SET NULL'),
      ('trade_requests',     'receiver_id',         'trade_requests_receiver_id_fkey',           'public.profiles', 'id', 'SET NULL'),
      ('trade_requests',     'sender_id',           'trade_requests_sender_id_fkey',             'public.profiles', 'id', 'SET NULL'),
      ('user_item_likes',    'user_id',             'user_item_likes_user_id_fkey_profiles',     'public.profiles', 'id', 'CASCADE'),
      ('user_items',         'user_id',             'user_items_user_id_fkey',                   'public.profiles', 'id', 'CASCADE'),

      -- ---- user_items を参照しているもの（user_items が消えるときに邪魔をする）----
      ('goods_posts',        'user_item_id',        'goods_posts_user_item_id_fkey',             'public.user_items', 'id', 'CASCADE'),
      ('messages',           'related_item_id',     'messages_related_item_id_fkey',             'public.user_items', 'id', 'SET NULL'),
      ('user_item_likes',    'user_item_id',        'user_item_likes_user_item_id_fkey',         'public.user_items', 'id', 'CASCADE')
    ) AS v(tbl, col, conname, ref_tbl, ref_col, on_delete)
  LOOP
    -- テーブル・列が無ければスキップ
    IF to_regclass(format('public.%I', r.tbl)) IS NULL THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = r.col
    ) THEN
      CONTINUE;
    END IF;

    -- SET NULL にする列は NULL を許す（trade_requests の取引当事者はここで外せるようにする）
    IF r.on_delete = 'SET NULL' THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', r.tbl, r.col);
    END IF;

    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s (%I) ON DELETE %s',
      r.tbl, r.conname, r.col, r.ref_tbl, r.ref_col, r.on_delete
    );
  END LOOP;
END
$$;

COMMENT ON COLUMN public.trade_requests.sender_id IS
  'NULL = 退会済みユーザー（取引の記録は相手のために残し、本人の id だけ外す）';
COMMENT ON COLUMN public.trade_requests.receiver_id IS
  'NULL = 退会済みユーザー（取引の記録は相手のために残し、本人の id だけ外す）';
