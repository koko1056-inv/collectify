-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Function to create notifications for new items
CREATE OR REPLACE FUNCTION public.notify_users_of_new_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Create trigger for new official items
CREATE TRIGGER notify_new_official_item
AFTER INSERT ON public.official_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_users_of_new_item();