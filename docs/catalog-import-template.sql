DO $do$
DECLARE j jsonb := $j$@@JSON@@$j$;
  cid uuid;
  ns uuid := '6f1c2a52-8d0e-4b8e-9d6a-0c1b6a7e5d11';
BEGIN
  ALTER TABLE public.official_items DISABLE TRIGGER notify_new_official_item;
  ALTER TABLE public.official_items DISABLE TRIGGER trigger_notify_users_of_new_item;
  ALTER TABLE public.item_tags DISABLE TRIGGER trigger_notify_users_of_new_item_tag;

  INSERT INTO public.content_names (name, type) SELECT '@@CNAME@@', 'anime' WHERE NOT EXISTS (SELECT 1 FROM public.content_names WHERE name = '@@CNAME@@');
  SELECT id INTO cid FROM public.content_names WHERE name = '@@CNAME@@' ORDER BY created_at LIMIT 1;

  CREATE TEMP TABLE _imp ON COMMIT DROP AS
  SELECT extensions.uuid_generate_v5(ns, x.i) AS id, x.t AS title, '@@PRE@@' || x.im AS image, coalesce(x.p,'') AS price, x.d AS rel, x.ty, x.s, x.c, x.sr
  FROM jsonb_to_recordset(j) AS x(i text, t text, im text, p text, d date, ty text, s text, c jsonb, sr jsonb);

  CREATE TEMP TABLE _imp_tags ON COMMIT DROP AS
  SELECT DISTINCT id, tagstr FROM (
    SELECT id, 'content|@@CTAG@@' AS tagstr FROM _imp
    UNION ALL SELECT id, 'type|' || ty FROM _imp WHERE ty IS NOT NULL
    UNION ALL SELECT id, 'series|' || s FROM _imp WHERE s IS NOT NULL
    UNION ALL SELECT id, 'source|' || v FROM _imp, jsonb_array_elements_text(coalesce(sr,'[]'::jsonb)) v
    UNION ALL SELECT id, 'character|' || v FROM _imp, jsonb_array_elements_text(coalesce(c,'[]'::jsonb)) v
  ) q;

  INSERT INTO public.tags (name, category, content_id, display_context)
  SELECT DISTINCT split_part(tagstr,'|',2), split_part(tagstr,'|',1),
         CASE WHEN split_part(tagstr,'|',1) IN ('series','character') THEN cid END,
         CASE split_part(tagstr,'|',1) WHEN 'series' THEN 'シリーズ' WHEN 'type' THEN 'グッズタイプ' WHEN 'source' THEN '入手方法' WHEN 'character' THEN 'キャラクター' ELSE '作品' END
  FROM _imp_tags
  WHERE NOT EXISTS (SELECT 1 FROM public.tags e WHERE e.name = split_part(tagstr,'|',2) AND e.category = split_part(tagstr,'|',1));

  INSERT INTO public.official_items (id, title, image, price, release_date, content_name, item_type, created_by)
  SELECT id, title, image, price, rel, '@@CNAME@@', 'official', '2cbe8645-0347-4d9d-8a6d-3dbb8a3c1df3'::uuid FROM _imp
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.item_tags (official_item_id, tag_id)
  SELECT DISTINCT q.id, pick.id
  FROM _imp_tags q
  JOIN LATERAL (SELECT e.id FROM public.tags e WHERE e.name = split_part(q.tagstr,'|',2) AND e.category = split_part(q.tagstr,'|',1) ORDER BY e.usage_count DESC, e.created_at LIMIT 1) pick ON true
  WHERE EXISTS (SELECT 1 FROM public.official_items o WHERE o.id = q.id)
  ON CONFLICT DO NOTHING;

  ALTER TABLE public.official_items ENABLE TRIGGER notify_new_official_item;
  ALTER TABLE public.official_items ENABLE TRIGGER trigger_notify_users_of_new_item;
  ALTER TABLE public.item_tags ENABLE TRIGGER trigger_notify_users_of_new_item_tag;
END
$do$;
