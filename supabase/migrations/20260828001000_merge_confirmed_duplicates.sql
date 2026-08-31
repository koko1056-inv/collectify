-- 中身が同じと確認できた3組だけを統合する
--
-- 20260828000000 で判定を画像の中身に切り替えた結果、
-- 見出しが一致する14組のうち、本当に同じファイルを指しているのは3組だけだった。
-- 残る12組は同名の別商品なので、ここでは触らない。
--
--   若井A: 同じ写真が2回登録されている
--   若井B: 別の写真が、これも2回登録されている
--          （「Atlantis Gacha Illustration Figure 若井」という同じ名前の
--            別商品が2種類あり、それぞれが重複していた）
--   D賞  : 10行あるうちの2行が同じ写真。残り8行はキャラ違いの別商品
--
-- 残す側は、所持・ウィッシュ・タグの付いている数が多いほうを選んだ。
-- 付け替える行が少ないほど、間違えたときの傷が浅い。
--
-- merge_official_items は行を消さず merged_into で隠すだけなので、
-- 統合そのものは戻せる。この移行は2回流しても同じ結果になる
-- （統合済みの行は merged_into が入るので merge_not_found で素通りする）。

DO $$
DECLARE
  -- 管理者ゲート（has_role）を通すため、実在する管理者として実行する。
  -- 本番の管理者アカウント。設定はトランザクション内だけに効く。
  _admin constant uuid := 'af5d9c70-2d5f-4b97-9c7c-7580341614cb';
  _pair record;
  _res jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', _admin::text, true);

  FOR _pair IN
    SELECT * FROM (VALUES
      ('2b637e9d-5ddc-4a65-8aac-455dca9c1dd6'::uuid, '3c1970b9-3722-4736-a917-8d0166da552a'::uuid, '若井A'),
      ('7bc887a2-2dda-4179-bd1f-b414b5028c31'::uuid, 'aeeeedc5-422c-406b-b1ef-cefdd0fe5d26'::uuid, '若井B'),
      ('04c854e7-504f-460b-aa8b-864668b24b35'::uuid, '23bfc0e0-421d-4235-b153-3b2d9967694d'::uuid, 'D賞')
    ) AS t(keep_id, merge_id, label)
  LOOP
    _res := public.merge_official_items(_pair.keep_id, _pair.merge_id);
    RAISE NOTICE 'merge % -> %', _pair.label, _res;
  END LOOP;
END $$;
