-- 関連するitem_tagsを削除
DELETE FROM item_tags WHERE official_item_id = 'cfb9cda5-f6c9-4659-8edb-51da93428f16';

-- 関連するwishlistsを削除
DELETE FROM wishlists WHERE official_item_id = 'cfb9cda5-f6c9-4659-8edb-51da93428f16';

-- 関連するuser_itemsの参照をnullに
UPDATE user_items SET official_item_id = NULL WHERE official_item_id = 'cfb9cda5-f6c9-4659-8edb-51da93428f16';

-- official_itemを削除
DELETE FROM official_items WHERE id = 'cfb9cda5-f6c9-4659-8edb-51da93428f16';