-- 外部キー制約を追加
ALTER TABLE public.user_achievements 
ADD CONSTRAINT fk_user_achievements_achievement_id 
FOREIGN KEY (achievement_id) REFERENCES public.achievements(id);

ALTER TABLE public.user_achievements 
ADD CONSTRAINT fk_user_achievements_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;