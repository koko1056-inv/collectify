-- 自分の持ち物（user_item）への投稿にも、元の公式グッズ（official_item）を結びつける。
--
-- これまで、持ち物から投稿すると user_item_id だけが入り、公式グッズの詳細にある
-- 「みんなの投稿」には出なかった。他の人が撮った写真は、公式グッズの詳細からも見えてほしい。
--   1. 投稿するときに、持ち物の元の公式グッズを自動で入れる
--   2. すでにある投稿にも入れる（バックフィル）

-- 「公式グッズか持ち物か、どちらか一方だけ」の制約を、「少なくとも一方」に緩める。
-- 持ち物への投稿は、持ち物（user_item）と、その元の公式グッズ（official_item）の両方に結びつく。
ALTER TABLE public.item_posts DROP CONSTRAINT IF EXISTS item_posts_check;
ALTER TABLE public.item_posts
  ADD CONSTRAINT item_posts_target_check
  CHECK (official_item_id IS NOT NULL OR user_item_id IS NOT NULL);

CREATE OR REPLACE FUNCTION public.item_posts_fill_official_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.official_item_id IS NULL AND NEW.user_item_id IS NOT NULL THEN
    SELECT ui.official_item_id INTO NEW.official_item_id
    FROM public.user_items ui
    WHERE ui.id = NEW.user_item_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.item_posts_fill_official_item() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER item_posts_fill_official_item_trg
BEFORE INSERT ON public.item_posts
FOR EACH ROW EXECUTE FUNCTION public.item_posts_fill_official_item();

UPDATE public.item_posts p
SET official_item_id = ui.official_item_id
FROM public.user_items ui
WHERE p.user_item_id = ui.id
  AND p.official_item_id IS NULL
  AND ui.official_item_id IS NOT NULL;

-- 公式グッズの詳細で、投稿を新しい順に引くための索引
CREATE INDEX IF NOT EXISTS item_posts_official_item_created_idx
  ON public.item_posts (official_item_id, created_at DESC)
  WHERE official_item_id IS NOT NULL;
