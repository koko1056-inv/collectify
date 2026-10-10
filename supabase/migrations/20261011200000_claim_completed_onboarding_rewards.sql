-- はじめてガイドの報酬を、達成した時点で取りこぼさず付与する。
--
-- 以前は、達成の判定と付与の呼び出しをコレクション画面のチェックリストが持っていた。
-- そのため「プロフィールを編集して保存した」だけでは付与されず、
-- チェックリストを開き直し、しかもキャッシュ（5分）が切れるまで待つ必要があった。
-- いまはサーバーが「達成済みでまだもらっていない手順」をまとめて付与し、
-- アプリは画面の移動・アプリに戻ったとき・保存の直後にこれを呼ぶ。

-- 1手順の達成判定（claim_onboarding_reward と共通）
CREATE OR REPLACE FUNCTION public.onboarding_step_done(_uid uuid, _step_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE _step_id
    WHEN 'account' THEN true
    WHEN 'profile' THEN EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _uid
        AND (coalesce(p.avatar_url, '') <> '' OR coalesce(p.bio, '') <> ''
             OR (coalesce(p.display_name, '') <> '' AND p.display_name IS DISTINCT FROM p.username))
    )
    WHEN 'first-item' THEN EXISTS (SELECT 1 FROM public.user_items WHERE user_id = _uid)
    -- 5つ選ぶ。持っているグッズが5つ未満なら、持っている数だけ選べば達成（以前は5つ必須で、新しい人は達成できなかった）
    WHEN 'favorites' THEN (
      SELECT coalesce(array_length(p.favorite_item_ids, 1), 0) >= greatest(1, least(5, (SELECT count(*) FROM public.user_items u WHERE u.user_id = _uid)))
      FROM public.profiles p WHERE p.id = _uid
    )
    WHEN 'wishlist' THEN EXISTS (SELECT 1 FROM public.wishlists WHERE user_id = _uid)
    WHEN 'ai-room' THEN EXISTS (SELECT 1 FROM public.ai_generated_rooms WHERE user_id = _uid)
    -- AI で作ったアバター。プロフィール写真のアップロードも avatar_gallery に入るので、それは数えない
    -- （以前は写真を載せただけで「アバターを作る」が達成になっていた）
    WHEN 'avatar' THEN EXISTS (
      SELECT 1 FROM public.avatar_gallery
      WHERE user_id = _uid AND coalesce(prompt, '') NOT IN ('プロフィール画像', 'アップロード画像')
    )
    WHEN 'follow' THEN EXISTS (SELECT 1 FROM public.follows WHERE follower_id = _uid)
    WHEN 'trade-offer' THEN EXISTS (SELECT 1 FROM public.user_items WHERE user_id = _uid AND for_trade)
    WHEN 'bookmark' THEN EXISTS (SELECT 1 FROM public.ai_work_bookmarks WHERE user_id = _uid)
    ELSE false
  END;
$$;

-- 他人の達成状況を覗けないよう、直接は呼ばせない（下の2つの関数の中からだけ使う）
REVOKE ALL ON FUNCTION public.onboarding_step_done(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_onboarding_reward(_step_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  _uid uuid := auth.uid();
  _points integer;
begin
  if _uid is null then
    raise exception 'Not authenticated';
  end if;

  select points into _points
    from public.onboarding_reward_steps where step_id = _step_id;
  if _points is null then
    raise exception 'Unknown onboarding step: %', _step_id;
  end if;

  if not public.onboarding_step_done(_uid, _step_id) then
    return false;
  end if;

  insert into public.onboarding_rewards (user_id, step_id, points_awarded)
  values (_uid, _step_id, _points)
  on conflict (user_id, step_id) do nothing;

  if not found then
    return false;
  end if;

  perform public.grant_points_internal(
    _uid, _points, 'onboarding_reward', 'はじめのステップ達成: ' || _step_id, null
  );

  return true;
end;
$$;

-- 達成済みでまだもらっていない手順を、まとめて付与する。いま付与した手順と額を返す（無ければ0行）
CREATE OR REPLACE FUNCTION public.claim_completed_onboarding_rewards()
RETURNS TABLE(step_id text, points integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
-- 返す列名（step_id / points）と表の列名がぶつかるので、SQL の中では表の列を優先させる
#variable_conflict use_column
declare
  _uid uuid := auth.uid();
  _s record;
begin
  if _uid is null then
    raise exception 'Not authenticated';
  end if;

  for _s in
    select r.step_id, r.points
    from public.onboarding_reward_steps r
    where not exists (
      select 1 from public.onboarding_rewards o where o.user_id = _uid and o.step_id = r.step_id
    )
  loop
    if public.onboarding_step_done(_uid, _s.step_id) then
      insert into public.onboarding_rewards (user_id, step_id, points_awarded)
      values (_uid, _s.step_id, _s.points)
      on conflict (user_id, step_id) do nothing;
      if found then
        perform public.grant_points_internal(
          _uid, _s.points, 'onboarding_reward', 'はじめのステップ達成: ' || _s.step_id, null
        );
        step_id := _s.step_id;
        points := _s.points;
        return next;
      end if;
    end if;
  end loop;
end;
$$;

REVOKE ALL ON FUNCTION public.claim_completed_onboarding_rewards() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_completed_onboarding_rewards() TO authenticated;
