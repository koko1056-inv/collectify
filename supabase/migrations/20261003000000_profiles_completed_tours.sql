-- 画面ごとの操作ガイド（スポットライトツアー）の完了状態を保存する。
--
-- localStorage だけに持つと、端末を変えたりストレージを消した時に
-- 既に見終わったガイドがもう一度出てしまう。プロフィールに持たせて
-- 端末間で同期する。profiles は本人のみ UPDATE できる既存ポリシーが
-- あるため、追加のポリシーは要らない。
alter table public.profiles
  add column if not exists completed_tours text[] not null default '{}';

comment on column public.profiles.completed_tours is
  '完了済みの画面ガイドID（src/components/onboarding/tours.ts の id）。';
