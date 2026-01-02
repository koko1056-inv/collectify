-- official_itemsに新しいアイテムが追加されたときに通知を送るトリガーを作成
CREATE TRIGGER trigger_notify_users_of_new_item
  AFTER INSERT ON public.official_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_users_of_new_item();

-- item_tagsにタグが追加されたときにも通知を送る関数を作成
CREATE OR REPLACE FUNCTION public.notify_users_of_new_item_tag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item_record RECORD;
  tag_record RECORD;
  content_name_value TEXT;
BEGIN
  -- アイテムの情報を取得
  SELECT * INTO item_record FROM public.official_items WHERE id = NEW.official_item_id;
  
  -- タグの情報を取得
  SELECT t.*, cn.name as content_name 
  INTO tag_record 
  FROM public.tags t
  LEFT JOIN public.content_names cn ON t.content_id = cn.id
  WHERE t.id = NEW.tag_id;
  
  -- コンテンツ名を決定（タグに関連するコンテンツ名、またはアイテムのコンテンツ名）
  content_name_value := COALESCE(tag_record.content_name, item_record.content_name);
  
  -- コンテンツ名がある場合のみ通知を作成
  IF content_name_value IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, data)
    SELECT 
      p.id as user_id,
      '新しいグッズにタグが追加されました！' as title,
      item_record.title || 'に「' || tag_record.name || '」タグが追加されました。' as message,
      'new_item_tag' as type,
      jsonb_build_object(
        'item_id', item_record.id,
        'item_title', item_record.title,
        'tag_name', tag_record.name,
        'content_name', content_name_value,
        'image', item_record.image
      ) as data
    FROM public.profiles p
    WHERE p.interests IS NOT NULL 
      AND p.interests @> ARRAY[content_name_value];
  END IF;
  
  RETURN NEW;
END;
$$;

-- item_tagsにタグが追加されたときのトリガー
CREATE TRIGGER trigger_notify_users_of_new_item_tag
  AFTER INSERT ON public.item_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_users_of_new_item_tag();