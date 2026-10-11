-- 着せ替え（4/4）: クライアントからは解放の記録を書けないようにする（RLS に加えて権限でも閉じる）
REVOKE INSERT, UPDATE, DELETE ON public.user_unlocks FROM anon, authenticated;
-- トリガー関数は直接呼ばせない
REVOKE EXECUTE ON FUNCTION public.enforce_profile_cosmetics() FROM PUBLIC, anon, authenticated;
