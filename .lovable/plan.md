

## ポイント消費の確認UI統一プラン

### 概要

現在ポイントを消費するアクション（AIルーム生成 / アバター生成 / 投稿画像AI生成）が、**確認なしで即座にポイントを消費している**状態です。すでに `SpendPointsDialog`（残高表示と不足ガード付きの共通ダイアログ）が存在するので、これを使って **ポイントが消費されるすべてのアクションの直前に確認ステップ** を挟みます。

### 対象アクションと消費ポイント

| # | 場所 | アクション | コスト | 初回無料 |
|---|------|----------|--------|--------|
| 1 | `AvatarStudioModal/GenerateTab.tsx` | AIアバター生成 | 30pt | ○（履歴なしで0pt） |
| 2 | `profile/AvatarGenerationModal.tsx` | AIアバター生成（旧UI） | 30pt | ○ |
| 3 | `ai-room/AiRoomCreateWizard.tsx` 経由 `useGenerateAiRoom` | AI推しルーム生成 | 100pt | ○ |
| 4 | `item-posts/CreateItemPostModal.tsx` | AI投稿画像生成 | 50pt | × |

※ `edit-image` と `generate-background` は現状ポイント消費していないため対象外（着せ替え・背景変更は引き続き無料）。

### 仕様

**共通の確認ダイアログ**（既存の `SpendPointsDialog` をそのまま流用）：
- タイトル：例「AIアバターを生成しますか？」
- 説明文：何が生成されるかの簡潔な一文
- 消費ポイント表示（30pt / 50pt / 100pt）
- 現在の残高表示
- **初回無料の場合**は「🎁 初回は無料！」バッジを表示し `cost={0}` で渡す
- 不足時はボタンが無効化され、警告メッセージ
- 「キャンセル」「消費して実行」の2ボタン

**初回判定（フロント側）**：
- アバター：`avatar_gallery` 件数 + `point_transactions` の `avatar_generation` 系履歴を取得
- AIルーム：`ai_generated_rooms` 件数 + `point_transactions` の `ai_room_generation` 系履歴を取得
- 両方 0 件なら「初回無料」表示
- 既存の `useFirstTimeFree(transactionType)` フック（新規）を作成して再利用

**フロー**：
```text
[生成ボタン押下]
  ↓
[SpendPointsDialog 表示]
  ├─ キャンセル → 何もしない
  └─ 消費して実行 → 既存の生成処理（functions.invoke）を実行
```

### UI拡張：初回無料バッジ対応

`SpendPointsDialog` を拡張して `freeTrial?: boolean` プロパティを追加：
- `freeTrial=true` の場合、「消費ポイント」行に取り消し線で元価格を表示し、「初回無料 🎁 (0pt)」を強調表示
- 説明文の下に「初回お試しキャンペーン中。次回からは {cost}pt が消費されます」のヒント

### 技術的な変更ファイル

**コンポーネント修正（4箇所）**

1. `src/components/avatar/AvatarStudioModal/GenerateTab.tsx`
   - `SpendPointsDialog` の state（`confirmOpen`）と JSX を追加
   - 「生成」ボタンの onClick → 確認ダイアログを開くだけに変更
   - 確認後に既存の `handleGenerate` を実行
   - 初回無料判定 → 表示

2. `src/components/profile/AvatarGenerationModal.tsx`
   - 同様に確認ダイアログを挟む
   - 既存の `useDeductPoints` 直接呼び出しは不要（Edge Function 側でポイント管理しているため）。フロント側の重複消費ロジックを削除して整理
   - **注意**: 現在このコンポーネントは `useDeductPoints` で **クライアント側でも10ptを消費している** が、Edge Function 側でも30pt消費するため重複している。フロントの消費を削除し Edge Function に一元化

3. `src/components/item-posts/CreateItemPostModal.tsx`
   - AI生成ボタン押下時に `SpendPointsDialog`（cost=50, freeTrial=false）を表示

4. `src/components/ai-room/AiRoomCreateWizard.tsx`
   - 「生成する」ボタン押下時に `SpendPointsDialog`（cost=100, freeTrial=初回判定）を表示

**新規ファイル**

5. `src/hooks/useFirstTimeFree.ts`
   - 引数：`{ transactionTypes: string[]; tableCheck?: { table: string; userId: string } }`
   - `point_transactions` と必要に応じて `avatar_gallery` / `ai_generated_rooms` をチェックし `isFirstTime` を返す
   - React Query で 60 秒キャッシュ

**共通コンポーネント修正**

6. `src/components/shop/SpendPointsDialog.tsx`
   - `freeTrial?: boolean` と `originalCost?: number` プロパティを追加
   - 初回無料時の表示分岐を追加

### 影響範囲外（変更なし）

- Edge Function 側のロジック：既存の認証＋ポイント消費＋初回判定はそのまま
- `useSpendPoints` / `useDeductPoints` フック
- すでに `SpendPointsDialog` を使っている `CollectionLimitBanner.tsx`

### 期待される体験

```text
┌───────────────────────────────────┐
│ AIアバターを生成しますか？        │
│ 入力した説明から3Dアバターを      │
│ 生成します。                      │
│                                   │
│ 消費ポイント        ⭐ 30pt       │
│ 現在の残高              120 pt    │
│                                   │
│       [キャンセル] [消費して実行] │
└───────────────────────────────────┘
```

初回時：
```text
┌───────────────────────────────────┐
│ AIアバターを生成しますか？        │
│                                   │
│ 消費ポイント  ̶3̶0̶p̶t̶ → 🎁 初回無料  │
│ 現在の残高              0 pt      │
│ ※次回から 30pt が消費されます     │
│                                   │
│       [キャンセル]  [無料で実行]  │
└───────────────────────────────────┘
```

