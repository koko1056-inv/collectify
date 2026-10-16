-- get_collection_targets は SECURITY DEFINER。関数の既定で PUBLIC（未ログイン）にも実行権が付いていたので外す
-- （ほかの SECURITY DEFINER 関数と同じく、ログインした人だけが呼べるようにする）
revoke all on function public.get_collection_targets(uuid) from public, anon;
grant execute on function public.get_collection_targets(uuid) to authenticated;
