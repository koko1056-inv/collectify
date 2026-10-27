-- 登録者が空（created_by IS NULL）のカタログのグッズを、カタログのアカウント koko に寄せる。
-- 画面では「管理者によって登録されました」と出ていたもの。登録者のいるグッズには触れない。
--
-- created_by の既定値（DEFAULT）は付けない。
-- official_items の INSERT ポリシーは auth.uid() IS NOT NULL だけなので、一般ユーザーが created_by を
-- 省いて登録すると koko の登録扱いになり、record_proxy_allowed_host（koko の画像ホストを信頼する）にも
-- 乗ってしまうため。
--
-- 他の表（content_names / tag_aliases / groups / original_items など）の created_by は画面に出ていないので対象外。

update public.official_items
   set created_by = '2cbe8645-0347-4d9d-8a6d-3dbb8a3c1df3'
 where created_by is null;
