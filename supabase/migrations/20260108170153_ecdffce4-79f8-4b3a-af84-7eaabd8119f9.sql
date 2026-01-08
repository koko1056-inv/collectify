-- コメント追加時に投稿者と返信先ユーザーへ通知を送るトリガー関数
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  post_record RECORD;
  parent_comment_record RECORD;
  commenter_username TEXT;
BEGIN
  -- コメント者のユーザー名を取得
  SELECT username INTO commenter_username 
  FROM public.profiles 
  WHERE id = NEW.user_id;

  -- 投稿情報を取得
  SELECT gp.*, ui.id as item_id, COALESCE(oi.title, ui.title) as item_title, COALESCE(oi.image, ui.image) as item_image
  INTO post_record
  FROM public.goods_posts gp
  LEFT JOIN public.user_items ui ON gp.user_item_id = ui.id
  LEFT JOIN public.official_items oi ON ui.official_item_id = oi.id
  WHERE gp.id = NEW.post_id;

  -- 投稿者への通知（自分自身へのコメントは除く）
  IF post_record.user_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (
      post_record.user_id,
      '投稿にコメントがつきました',
      commenter_username || 'さんがあなたの投稿にコメントしました',
      'comment',
      jsonb_build_object(
        'post_id', NEW.post_id,
        'comment_id', NEW.id,
        'commenter_id', NEW.user_id,
        'commenter_username', commenter_username,
        'comment_text', LEFT(NEW.comment, 50),
        'image', post_record.image_url
      )
    );
  END IF;

  -- 返信コメントの場合、親コメントの投稿者にも通知
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT pc.*, p.username as parent_username
    INTO parent_comment_record
    FROM public.post_comments pc
    JOIN public.profiles p ON pc.user_id = p.id
    WHERE pc.id = NEW.parent_comment_id;

    -- 親コメント投稿者が自分でも投稿者でもない場合のみ通知
    IF parent_comment_record.user_id != NEW.user_id 
       AND parent_comment_record.user_id != post_record.user_id THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        parent_comment_record.user_id,
        'コメントに返信がつきました',
        commenter_username || 'さんがあなたのコメントに返信しました',
        'reply',
        jsonb_build_object(
          'post_id', NEW.post_id,
          'comment_id', NEW.id,
          'parent_comment_id', NEW.parent_comment_id,
          'commenter_id', NEW.user_id,
          'commenter_username', commenter_username,
          'comment_text', LEFT(NEW.comment, 50),
          'image', post_record.image_url
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- トリガーを作成
DROP TRIGGER IF EXISTS on_comment_notify ON public.post_comments;
CREATE TRIGGER on_comment_notify
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment();

-- いいね通知のトリガー関数
CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  post_record RECORD;
  liker_username TEXT;
BEGIN
  -- いいねした人のユーザー名を取得
  SELECT username INTO liker_username 
  FROM public.profiles 
  WHERE id = NEW.user_id;

  -- 投稿情報を取得
  SELECT gp.*, ui.id as item_id
  INTO post_record
  FROM public.goods_posts gp
  LEFT JOIN public.user_items ui ON gp.user_item_id = ui.id
  WHERE gp.id = NEW.post_id;

  -- 投稿者への通知（自分自身へのいいねは除く）
  IF post_record.user_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (
      post_record.user_id,
      '投稿にいいねがつきました',
      liker_username || 'さんがあなたの投稿にいいねしました',
      'like',
      jsonb_build_object(
        'post_id', NEW.post_id,
        'liker_id', NEW.user_id,
        'liker_username', liker_username,
        'image', post_record.image_url
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- トリガーを作成
DROP TRIGGER IF EXISTS on_post_like_notify ON public.post_likes;
CREATE TRIGGER on_post_like_notify
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_post_like();