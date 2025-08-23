-- セキュリティ警告の修正

-- 1) 関数のsearch_path問題を修正
-- 既存の関数にSET search_path = publicを追加

-- handle_new_user関数の修正
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.raw_user_meta_data->>'username' IS NULL THEN
    RAISE EXCEPTION 'username is required';
  END IF;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username')
  );
  RETURN new;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
END;
$$;

-- update_updated_at_column関数の修正
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- update_follower_counts関数の修正
CREATE OR REPLACE FUNCTION public.update_follower_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment counts
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement counts
    UPDATE profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$;

-- notify_users_of_new_item関数の修正
CREATE OR REPLACE FUNCTION public.notify_users_of_new_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create notifications for users who have the content in their interests
  INSERT INTO public.notifications (user_id, title, message, type, data)
  SELECT 
    p.id as user_id,
    '新しいグッズが追加されました！' as title,
    NEW.title || 'が追加されました。' as message,
    'new_item' as type,
    jsonb_build_object(
      'item_id', NEW.id,
      'item_title', NEW.title,
      'content_name', NEW.content_name,
      'image', NEW.image
    ) as data
  FROM public.profiles p
  WHERE p.interests IS NOT NULL 
    AND p.interests @> ARRAY[NEW.content_name]
    AND NEW.content_name IS NOT NULL;
  
  RETURN NEW;
END;
$$;

-- is_follower関数は既に正しく設定されている

-- 注：Extension関連やPassword保護の設定はSupabaseのダッシュボードから
-- 管理者が手動で設定する必要があります