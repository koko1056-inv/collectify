-- Migrate legacy goods_posts into item_posts (+ images)
-- Skip rows whose user_item_id no longer exists, and avoid duplicates by created_at+user_id+caption
WITH inserted AS (
  INSERT INTO public.item_posts (id, user_id, user_item_id, caption, created_at, updated_at, like_count, comment_count)
  SELECT 
    gp.id,
    gp.user_id,
    gp.user_item_id,
    gp.caption,
    gp.created_at,
    gp.updated_at,
    COALESCE((SELECT COUNT(*) FROM public.post_likes pl WHERE pl.post_id = gp.id), 0),
    COALESCE((SELECT COUNT(*) FROM public.post_comments pc WHERE pc.post_id = gp.id), 0)
  FROM public.goods_posts gp
  WHERE EXISTS (SELECT 1 FROM public.user_items ui WHERE ui.id = gp.user_item_id)
    AND NOT EXISTS (SELECT 1 FROM public.item_posts ip WHERE ip.id = gp.id)
  RETURNING id
)
INSERT INTO public.item_post_images (post_id, image_url, display_order)
SELECT gp.id, gp.image_url, 0
FROM public.goods_posts gp
JOIN inserted i ON i.id = gp.id
WHERE gp.image_url IS NOT NULL;