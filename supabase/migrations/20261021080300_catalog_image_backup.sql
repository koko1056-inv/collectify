-- 切り出し画像へ official_items.image を差し替える前の退避。
--
-- 差し替えそのものはこのマイグレーションでは行わない。別の SQL が
--   official_item_id, batch, old_image, new_image
-- を1行残してから image を更新し、戻すときは old_image を書き戻す。
--
-- 本番には既にこのテーブルがある（schema_migrations には載っていない。
-- 2026-10-21 時点で 49 行・4 バッチ。new_image はすべて catalog-crops/）。
-- ここはリポジトリを本番の形に揃えるための記録で、CREATE は IF NOT EXISTS。
-- 適用すると履歴に1行増えるだけで、既存の行は触らない。

create table if not exists public.catalog_image_backup (
  official_item_id uuid not null,
  batch text not null,
  old_image text not null,
  new_image text not null,
  changed_at timestamptz not null default now(),
  primary key (official_item_id, batch)
);

-- 画面からは読ませない。書き込みは service_role（SQL エディタ）だけ。
alter table public.catalog_image_backup enable row level security;
revoke all on public.catalog_image_backup from anon, authenticated;
