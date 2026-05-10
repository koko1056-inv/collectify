ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS featured_room_id uuid REFERENCES public.ai_generated_rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS featured_avatar_id uuid REFERENCES public.avatar_gallery(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_featured_room_id ON public.profiles(featured_room_id);
CREATE INDEX IF NOT EXISTS idx_profiles_featured_avatar_id ON public.profiles(featured_avatar_id);