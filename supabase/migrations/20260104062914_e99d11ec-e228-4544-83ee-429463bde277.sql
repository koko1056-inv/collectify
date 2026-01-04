-- =====================================================
-- Phase 1: タグの二層構造（正規トピック + 提案システム）
-- =====================================================

-- 1. tagsテーブルにstatusカラム追加（approved=正式、candidate=候補）
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'candidate'));

-- 2. tagsテーブルに曖昧性表示用のコンテキストを追加
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS display_context text;

-- 3. 使用回数を追跡するカラムを追加
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0;

-- 4. タグ候補（ユーザーからの提案）テーブルを作成
CREATE TABLE IF NOT EXISTS public.tag_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('character', 'type', 'series')),
  content_id uuid REFERENCES public.content_names(id) ON DELETE SET NULL,
  suggested_by uuid NOT NULL,
  suggestion_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  merged_to_tag_id uuid REFERENCES public.tags(id) ON DELETE SET NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  UNIQUE(name, category, content_id)
);

-- 5. タグ同義語テーブルを作成（表記ゆれ・愛称対応）
CREATE TABLE IF NOT EXISTS public.tag_aliases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alias_name text NOT NULL,
  canonical_tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(alias_name, canonical_tag_id)
);

-- 6. タグにインデックスを追加
CREATE INDEX IF NOT EXISTS idx_tags_status ON public.tags(status);
CREATE INDEX IF NOT EXISTS idx_tags_category_status ON public.tags(category, status);
CREATE INDEX IF NOT EXISTS idx_tags_name_lower ON public.tags(lower(name));
CREATE INDEX IF NOT EXISTS idx_tag_candidates_status ON public.tag_candidates(status);
CREATE INDEX IF NOT EXISTS idx_tag_aliases_alias_name ON public.tag_aliases(lower(alias_name));

-- 7. RLSを有効化
ALTER TABLE public.tag_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_aliases ENABLE ROW LEVEL SECURITY;

-- 8. tag_candidatesのRLSポリシー
CREATE POLICY "Anyone can view tag candidates"
ON public.tag_candidates FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can suggest tags"
ON public.tag_candidates FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = suggested_by);

CREATE POLICY "Admins can update tag candidates"
ON public.tag_candidates FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can delete tag candidates"
ON public.tag_candidates FOR DELETE
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 9. tag_aliasesのRLSポリシー
CREATE POLICY "Anyone can view tag aliases"
ON public.tag_aliases FOR SELECT
USING (true);

CREATE POLICY "Admins can manage tag aliases"
ON public.tag_aliases FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 10. updated_atを自動更新するトリガー
CREATE TRIGGER update_tag_candidates_updated_at
BEFORE UPDATE ON public.tag_candidates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 11. タグ使用時にusage_countを増やす関数
CREATE OR REPLACE FUNCTION public.increment_tag_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tags
  SET usage_count = usage_count + 1
  WHERE id = NEW.tag_id;
  RETURN NEW;
END;
$$;

-- 12. item_tagsへの挿入時にusage_countを増やすトリガー
DROP TRIGGER IF EXISTS increment_tag_usage_on_item_tag ON public.item_tags;
CREATE TRIGGER increment_tag_usage_on_item_tag
AFTER INSERT ON public.item_tags
FOR EACH ROW
EXECUTE FUNCTION public.increment_tag_usage();

-- 13. user_item_tagsへの挿入時にusage_countを増やすトリガー
DROP TRIGGER IF EXISTS increment_tag_usage_on_user_item_tag ON public.user_item_tags;
CREATE TRIGGER increment_tag_usage_on_user_item_tag
AFTER INSERT ON public.user_item_tags
FOR EACH ROW
EXECUTE FUNCTION public.increment_tag_usage();