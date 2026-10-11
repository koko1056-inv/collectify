-- ポイントを減らす（AI生成の消費など）が、すべて失敗していたのを直す。
--
-- add_user_points は INSERT ... ON CONFLICT DO UPDATE で残高を足し引きしている。
-- Postgres は ON CONFLICT で更新に回る前に「入れようとした行」に CHECK 制約をかけるため、
-- _points が負（-100 など）だと、残高が十分あっても user_points_total_points_non_negative に引っかかって失敗していた。
-- （2026-07 に残高を負にしない制約を足して以降、AIルーム・アバター・投稿画像・画像編集の有料生成が
--   すべて「ポイント消費に失敗しました」になっていた。初回無料だけは 0pt なので通っていた）
-- grant_points_internal と同じく、新しく行を作るときは 0 未満にしない。
-- 既存の行から引くときは UPDATE 側で制約が効くので、残高不足なら従来どおり失敗する。
CREATE OR REPLACE FUNCTION public.add_user_points(
  _user_id uuid,
  _points integer,
  _transaction_type text,
  _description text DEFAULT NULL::text,
  _reference_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Security: only allow callers to modify their own points (unless invoked via service_role)
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Permission denied: cannot modify another user''s points';
  END IF;

  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_user_id, GREATEST(_points, 0))
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_points = user_points.total_points + _points,
    updated_at = now();

  INSERT INTO public.point_transactions (user_id, points, transaction_type, description, reference_id)
  VALUES (_user_id, _points, _transaction_type, _description, _reference_id);
END;
$function$;
