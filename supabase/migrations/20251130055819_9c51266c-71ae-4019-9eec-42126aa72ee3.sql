-- Create binders table for organizing multiple pages
CREATE TABLE IF NOT EXISTS public.binders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'マイバインダー',
  description TEXT,
  cover_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on binders table
ALTER TABLE public.binders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for binders
CREATE POLICY "Users can view their own binders"
  ON public.binders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own binders"
  ON public.binders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own binders"
  ON public.binders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own binders"
  ON public.binders FOR DELETE
  USING (auth.uid() = user_id);

-- Add binder_id column to binder_pages
ALTER TABLE public.binder_pages ADD COLUMN IF NOT EXISTS binder_id UUID REFERENCES public.binders(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_binder_pages_binder_id ON public.binder_pages(binder_id);
CREATE INDEX IF NOT EXISTS idx_binders_user_id ON public.binders(user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_binders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_binders_updated_at
  BEFORE UPDATE ON public.binders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_binders_updated_at();

-- Enable realtime for binders table
ALTER TABLE public.binders REPLICA IDENTITY FULL;