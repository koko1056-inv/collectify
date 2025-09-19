-- Fix security issue: Restrict access to user data based on privacy settings

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can view all likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can view all posts" ON public.goods_posts;
DROP POLICY IF EXISTS "Anyone can view groups" ON public.groups;

-- Create privacy-respecting policies for post_likes
CREATE POLICY "Users can view likes based on privacy settings" 
ON public.post_likes 
FOR SELECT 
USING (
  -- Users can always see their own likes
  auth.uid() = user_id 
  OR 
  -- Or if the post owner has public privacy
  EXISTS (
    SELECT 1 FROM public.goods_posts gp
    JOIN public.profiles p ON p.id = gp.user_id
    WHERE gp.id = post_likes.post_id 
    AND p.privacy_level = 'public'
  )
  OR
  -- Or if the post owner allows followers and current user follows them
  EXISTS (
    SELECT 1 FROM public.goods_posts gp
    JOIN public.profiles p ON p.id = gp.user_id
    WHERE gp.id = post_likes.post_id 
    AND p.privacy_level = 'followers'
    AND public.is_follower(gp.user_id)
  )
);

-- Create privacy-respecting policies for goods_posts
CREATE POLICY "Users can view posts based on privacy settings" 
ON public.goods_posts 
FOR SELECT 
USING (
  -- Users can always see their own posts
  auth.uid() = user_id 
  OR 
  -- Or if the user has public privacy
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = goods_posts.user_id 
    AND p.privacy_level = 'public'
  )
  OR
  -- Or if the user allows followers and current user follows them
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = goods_posts.user_id 
    AND p.privacy_level = 'followers'
    AND public.is_follower(goods_posts.user_id)
  )
);

-- Create privacy-respecting policies for groups
CREATE POLICY "Users can view groups based on privacy settings" 
ON public.groups 
FOR SELECT 
USING (
  -- Users can always see their own groups
  auth.uid() = created_by 
  OR 
  -- Or if the group creator has public privacy
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = groups.created_by 
    AND p.privacy_level = 'public'
  )
  OR
  -- Or if the group creator allows followers and current user follows them
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = groups.created_by 
    AND p.privacy_level = 'followers'
    AND public.is_follower(groups.created_by)
  )
  OR
  -- Or if the user is a member of the group
  EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = groups.id 
    AND gm.user_id = auth.uid()
  )
);