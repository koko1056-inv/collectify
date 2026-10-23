# はじめてガイド step3「推しグッズを飾る」が完了しない件の修正

## 根本原因
サーバー（`onboarding_step_done` / migration `favorites_step_oshi_room_decorate`、prod 適用済み）は
「推しグッズを5つ選ぶ」か「推しの部屋に1つ以上置いて保存する」のどちらでも `favorites` を達成扱いにしていたが、
クライアント（`OnboardingChecklist.tsx`）は `profiles.favorite_item_ids` の件数しか見ておらず、
模様替え→保存で報酬が付与されても画面のチェックは付かなかった（Bug A）。
加えて、グッズを持っているが推しグッズを1つも選んでいない人も「選ぶ画面」を経ずに空の模様替え画面へ
送られ、置く物が無いまま詰まっていた（Bug B）。

## 直した内容
- `src/components/onboarding/OnboardingChecklist.tsx`
  - チェックリストの `queryFn` で `oshi_rooms.layout.goods` の件数と `onboarding_rewards`（claimedSteps）も取得し、
    `hasFavorites5` を「選んだ数の条件 OR 部屋に置いた数 > 0 OR 既に報酬を受け取っている」に変更（サーバー判定と一致）。
  - `goGuide()` の分岐に `hasFavoriteItems`（`favorite_item_ids.length > 0`）を追加。グッズは持っているが
    1つも選んでいない人は、模様替え（`/oshi?decorate=1`）ではなく通常の選ぶ画面（`/me?guide=favorites`）へ送るよう修正。
- `src/hooks/useOshiRoom.ts`（`useSaveOshiRoom`）/ `src/hooks/useFavoriteItems.ts`（`useUpdateFavoriteItems`）
  - 保存成功時に `["onboarding-checklist", userId]` を直接 invalidate。報酬確認（`claim_completed_onboarding_rewards`）の
    完了を待たずに、チェックリストの✓がすぐ付くようにした。

サーバー側（SQL・migration）は変更なし。既に prod に適用済みのロジックに、クライアントの表示・遷移を合わせただけ。

## テスト
- `npm run typecheck` — 成功
- `npm run test:tours` — 成功（`GUIDE_TASKS` の行き先・文言・ルートの整合性チェック含む全件通過）
- `npx eslint` on changed files — warning/error なし

## PR / 状態
- PR: https://github.com/koko1056-inv/collectify/pull/177
- マージ: 済み（main へ merge, 2026-10-23T11:52:47Z）
- 本番反映: クライアントは main への merge を Vercel が検知して自動デプロイ（新規 SQL なし。既存の prod migration をそのまま使う）
