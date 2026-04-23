

## コードベース整理リファクタリングプラン

### 概要

調査の結果、**未使用コンポーネント・重複機能・肥大ファイル** が多数蓄積していることが判明しました。アプリの動作を変えずに**安全に削除できる不要コード**を整理し、**肥大したファイルを分割**することで、保守性を改善します。

### Phase 1: 完全未使用コンポーネントの削除（リスクほぼゼロ）

調査で「どこからも import されていない」ことを確認したファイルを削除します。

| ファイル | 行数 | 理由 |
|---------|-----|------|
| `src/components/profile/AvatarGenerationModal.tsx` | 308 | 旧アバター生成モーダル。現在は `AvatarStudioModal` に置き換わり未使用 |
| `src/components/profile/ProfileCard.tsx` | 188 | どこからも参照なし |
| `src/components/profile/ProfileStats.tsx` | — | 参照なし |
| `src/components/home/avatar-center/CollectionAnalyticsModal.tsx` | — | 参照なし |
| `src/components/home/avatar-center/RandomPickupModal.tsx` | — | 前回「アバターのUX改善」で参照削除済み、ファイルが残骸化 |

**連鎖的削除**：上記 `ProfileCard.tsx` のみが参照していたファイル群も一緒に削除：

- `src/components/profile/ProfileBio.tsx`
- `src/components/profile/ProfileBioSection.tsx`
- `src/components/profile/ProfileFavorites.tsx`（現行は `FavoriteItemsTop5` に置き換え済み）
- `src/components/profile/ProfileFavoritesSection.tsx`
- `src/components/profile/ProfileImageSection.tsx`
- `src/components/profile/ProfileInterests.tsx`
- `src/components/profile/ProfileWishlist.tsx`
- `src/components/profile/ProfileStatsOptimized.tsx`

削除前に**もう一度 grep で参照ゼロを検証**してから削除します（ProfileCard 削除後に再走査）。

### Phase 2: 同名衝突の解消

- **`src/components/ProfileCollection.tsx`(125行) と `src/components/profile/ProfileCollection.tsx`(164行) が同名で別物**

  → 旧版（`src/components/ProfileCollection.tsx`）の参照状況を確認し、未使用なら削除。使用箇所があれば `LegacyProfileCollection.tsx` にリネーム or 統合。

### Phase 3: ポイント消費ロジックの一元化

- **`useDeductPoints` の利用箇所** はすでに `ImageEditDialog` 1 箇所のみ。ポイント管理は **Edge Function 側に一元化** という方針に統一済み。

  → `ImageEditDialog` の `useDeductPoints` 呼び出しを撤去し、`edit-image` Edge Function 側にポイント管理を持たせる（既存の `generate-avatar` と同パターン）。

  → `useDeductPoints` フックは将来削除予定としてコメントを残し、参照ゼロ化を確認後に消す（次回PR）。

### Phase 4: 巨大ファイルの分割

#### 4-1. `GoodsDisplayModal.tsx` (1026行 / 18 useState) の分割

責務が3つ混在：
1. **アイテム選択** → `GoodsItemSelector.tsx`
2. **背景生成・アップロード・プリセット** → `BackgroundEditor.tsx` + `useBackgroundGenerator.ts` フック
3. **ギャラリー保存・Twitter投稿** → `useGoodsDisplaySave.ts` フック + `ShareToTwitterButton.tsx`

ルートの `GoodsDisplayModal.tsx` はオーケストレーションのみに（〜300行目標）。

#### 4-2. `AiRoomCreateWizard.tsx` (549行) の分割

ステップ別にファイル分割：
- `wizard/SelectItemsStep.tsx`
- `wizard/SelectStyleStep.tsx`
- `wizard/SelectVisualStep.tsx`
- `wizard/GeneratingStep.tsx`
- `wizard/ResultStep.tsx`

ルートの `AiRoomCreateWizard.tsx` はステップ管理＋確認ダイアログのみに（〜200行目標）。

### Phase 5: 削除影響テスト

- `npx tsc --noEmit` で型エラーゼロを確認
- 主要画面（プロフィール、AIルーム作成、アバター生成、投稿作成）で参照切れがないことを目視（ビルドが通れば import 切れは発覚する）

### 実施スコープ（今回のPRで実施する範囲）

**今回のPR**：
- ✅ Phase 1（完全未使用コンポーネント削除：14ファイル / 約 1500 行削減）
- ✅ Phase 2（同名衝突の解消）

**次回PR以降に分ける**（影響範囲が広いため別途）：
- ⏭ Phase 3（ポイント消費一元化）
- ⏭ Phase 4-1（GoodsDisplayModal 分割）
- ⏭ Phase 4-2（AiRoomCreateWizard 分割）

理由：Phase 1 と 2 は機能を一切変えない安全な削除なので、まず確実に通してからリスクのある分割に進む方が安全です。

### 期待される効果

- **約 1500 行の不要コード削減**
- ファイル一覧が見やすくなり「どれが現役か」が明確に
- 似た名前で迷う問題（`ProfileBio` vs `ProfileBioSection` 等）が解消
- 同名ファイルの混乱を解消

