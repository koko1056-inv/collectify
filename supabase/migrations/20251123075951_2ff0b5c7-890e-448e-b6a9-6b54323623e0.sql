-- Create table for user-uploaded background presets
CREATE TABLE IF NOT EXISTS public.background_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.background_presets ENABLE ROW LEVEL SECURITY;

-- Anyone can view public background presets
CREATE POLICY "Anyone can view public background presets"
  ON public.background_presets
  FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- Users can create their own background presets
CREATE POLICY "Users can create their own background presets"
  ON public.background_presets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own background presets
CREATE POLICY "Users can update their own background presets"
  ON public.background_presets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own background presets
CREATE POLICY "Users can delete their own background presets"
  ON public.background_presets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_background_presets_category ON public.background_presets(category);
CREATE INDEX idx_background_presets_user_id ON public.background_presets(user_id);
CREATE INDEX idx_background_presets_is_public ON public.background_presets(is_public);