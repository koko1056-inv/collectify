-- avatar_galleryテーブルに部分ユニークインデックスを追加
-- 各ユーザーにつき、is_current=trueのレコードは1つだけにする
CREATE UNIQUE INDEX idx_avatar_gallery_user_current 
ON avatar_gallery (user_id) 
WHERE is_current = true;

-- 新しいアバターがis_current=trueで挿入された時、または既存レコードがis_current=trueに更新された時に
-- 同じユーザーの他のアバターのis_currentを自動的にfalseにするトリガー関数
CREATE OR REPLACE FUNCTION update_avatar_gallery_current()
RETURNS TRIGGER AS $$
BEGIN
  -- 新しいレコードまたは更新されたレコードがis_current=trueの場合
  IF NEW.is_current = true THEN
    -- 同じユーザーの他のすべてのアバターのis_currentをfalseに設定
    UPDATE avatar_gallery
    SET is_current = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- トリガーを作成
CREATE TRIGGER trigger_update_avatar_gallery_current
BEFORE INSERT OR UPDATE OF is_current ON avatar_gallery
FOR EACH ROW
EXECUTE FUNCTION update_avatar_gallery_current();

-- profilesテーブルのavatar_urlが更新された時に、avatar_galleryを同期するトリガー関数
CREATE OR REPLACE FUNCTION sync_profile_avatar_to_gallery()
RETURNS TRIGGER AS $$
DECLARE
  current_avatar_id uuid;
BEGIN
  -- avatar_urlが変更された場合のみ処理
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    -- 既存のis_current=trueのアバターを取得
    SELECT id INTO current_avatar_id
    FROM avatar_gallery
    WHERE user_id = NEW.id
      AND is_current = true
    LIMIT 1;
    
    IF current_avatar_id IS NOT NULL THEN
      -- 既存のcurrentアバターの画像URLを更新
      UPDATE avatar_gallery
      SET image_url = NEW.avatar_url
      WHERE id = current_avatar_id;
    ELSE
      -- currentアバターが存在しない場合は新規作成
      INSERT INTO avatar_gallery (user_id, image_url, is_current, prompt)
      VALUES (NEW.id, NEW.avatar_url, true, 'プロフィール画像');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- トリガーを作成
CREATE TRIGGER trigger_sync_profile_avatar_to_gallery
AFTER UPDATE OF avatar_url ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_profile_avatar_to_gallery();