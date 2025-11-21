-- Create avatar_gallery table for storing generated avatars
CREATE TABLE IF NOT EXISTS public.avatar_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  prompt TEXT,
  item_ids UUID[] DEFAULT ARRAY[]::UUID[],
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.avatar_gallery ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own avatar gallery"
  ON public.avatar_gallery
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own avatars"
  ON public.avatar_gallery
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own avatars"
  ON public.avatar_gallery
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own avatars"
  ON public.avatar_gallery
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for better performance
CREATE INDEX idx_avatar_gallery_user_id ON public.avatar_gallery(user_id);
CREATE INDEX idx_avatar_gallery_created_at ON public.avatar_gallery(created_at DESC);