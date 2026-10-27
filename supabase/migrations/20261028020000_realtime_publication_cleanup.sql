-- Realtime の公開（supabase_realtime）から、誰も聞いていない表を外す。
--
-- 公開に入っている表は、変更のたびに Realtime が WAL を読み解いて購読者を探す（realtime.list_changes）。
-- この DB では list_changes が CPU のいちばんの使い手なので、聞く人のいない表は公開から外しておく。
--
-- 外す表（src・api・supabase/functions・ios・scripts のどこにも postgres_changes の購読がない）:
--   item_posts, item_post_likes, item_post_comments, greeting_stamps, match_actions
-- 残す表（いまも画面が聞いている）:
--   trade_requests（useMyTrades）, messages（useChat・ConversationList・useUnreadMessageCount）,
--   notifications（useNotifications）, post_comments（useComments）,
--   room_reactions（useRoomReactions）, item_room_messages（useItemRoom）
--
-- 何度流しても同じ結果になるように、入っているものだけを外す。
-- 公開そのものが無い環境（ローカルの素の Postgres など）では何もしない。
-- あとで画面からこれらの表を聞くようにするときは、公開に戻すマイグレーションを一緒に入れること。
DO $$
DECLARE
  tbl text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'supabase_realtime の公開が無いので何もしません';
    RETURN;
  END IF;
  -- FOR ALL TABLES の公開からは1表ずつ外せない（本番は表を並べる形なので通らない）
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime' AND puballtables) THEN
    RAISE NOTICE 'supabase_realtime が FOR ALL TABLES なので何もしません';
    RETURN;
  END IF;

  FOREACH tbl IN ARRAY ARRAY['item_posts', 'item_post_likes', 'item_post_comments', 'greeting_stamps', 'match_actions'] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', tbl);
      RAISE NOTICE 'supabase_realtime から public.% を外しました', tbl;
    END IF;
  END LOOP;
END $$;
