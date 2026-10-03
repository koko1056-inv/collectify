-- やることリストに「交換に出すグッズを選ぶ」を追加する。
--
-- 付与額はサーバー側のこの表が持つ（クライアントからは step_id しか渡せない）。
-- 行が無い step_id を claim_onboarding_reward に渡しても付与されないため、
-- 画面に項目を足すだけでは「+20pt」が嘘になる。ここで先に登録しておく。
insert into public.onboarding_reward_steps (step_id, points)
values ('trade-offer', 20)
on conflict (step_id) do nothing;
