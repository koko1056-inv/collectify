-- プロフィールの「ショーケース」に飾ったアバターを、プロフィールを見られる人には見えるようにする。
--
-- 以前は ProfileShowcase が avatar_gallery を直接 select していたが、
-- avatar_gallery の RLS は「本人」か「みんなに公開（is_public）したもの」しか読めない。
-- ショーケースに飾るのは「みんな」へ公開していないアバターがほとんどなので、
-- 本人には見えているのに、他の人がプロフィールを開くとアバター欄が「未設定」になっていた。
--
-- avatar_gallery の RLS を広げると prompt や item_ids まで読めてしまうので、
-- 表示に要る列（id / image_url / name）だけを返す関数を用意する。
--  - プロフィール自体を見られるか（公開範囲・フォロー）は profiles の RLS と同じ条件で判定する
--  - featured_avatar_id は本人が自由に書ける列なので、他人のアバターIDを入れられても漏れないよう
--    「そのプロフィールの持ち主のアバター」であることも確かめる
-- なお、アイコンとして設定した「現在のアバター」は set_current_avatar が profiles.avatar_url に
-- 同期しているので、そちらは従来どおり profiles から見える。

create or replace function public.get_profile_featured_avatar(_profile_id uuid)
returns table (id uuid, image_url text, name text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select ag.id, ag.image_url, ag.name
  from public.profiles p
  join public.avatar_gallery ag
    on ag.id = p.featured_avatar_id
   and ag.user_id = p.id
  where p.id = _profile_id
    and (
      p.id = auth.uid()
      or p.privacy_level = 'public'
      or (p.privacy_level = 'followers' and public.is_follower(p.id))
    );
$$;

revoke all on function public.get_profile_featured_avatar(uuid) from public;
grant execute on function public.get_profile_featured_avatar(uuid) to anon, authenticated;
