

## オンボーディング拡張プラン

### 概要

既存の `OnboardingChecklist`（はじめの5ステップ）を、推し活体験の核となる4つの新タスクに置き換え／追加します。AI機能（ルーム生成・アバター生成）は **初回1回だけ無料** で実行できるようにし、ユーザーが Lovable AI のコア体験を気軽に試せる導線を作ります。

### 新しいオンボーディングタスク

最終的なチェックリストは以下の構成にします（既存の「アカウント作成」「プロフィール設定」は残し、それ以外を入れ替え）：

| # | タスク | 検出方法 | 遷移先 |
|---|--------|---------|--------|
| 1 | アカウント作成 | 自動 | – |
| 2 | プロフィール設定 | profiles に bio/avatar/display_name | `/edit-profile` |
| 3 | **最初のグッズ登録** | `user_items` 1件以上 | `/search` |
| 4 | **お気に入りグッズを登録** ⭐ NEW | `profiles.favorite_item_ids` が1件以上 | プロフィール（コレクションタブ） |
| 5 | **AIでルームを作ってみる** ⭐ NEW（初回無料） | `point_transactions` に `ai_room_generation` あり OR `ai_generated_rooms` 1件以上 | `/ai-rooms` 新規作成 |
| 6 | **アバターを作ってみる** ⭐ NEW（初回無料） | `avatar_gallery` 1件以上 | アバタータブ → 生成 |
| 7 | **一回投稿してみる** ⭐ NEW | `goods_posts` 1件以上 | `/posts` |

合計7ステップ。報酬ポイントは各 +20〜30pt で再調整します。

### 「初回1回無料」の仕組み

ポイント不足でも初回だけ AI 生成を実行できる仕組みをエッジ関数側に追加します。

**判定方法**：`point_transactions` テーブルから、対象ユーザーがその `transaction_type` を一度でも実行しているかをチェック。
- `ai_room_generation` → 過去履歴なし＝初回 → ポイント消費スキップ
- `avatar_generation`（新設） → 同上

**変更するエッジ関数**：

1. **`supabase/functions/generate-ai-room/index.ts`**
   - 既存の100pt消費ロジックの前に「過去に `ai_room_generation` または `ai_room_generation_free` の取引があるか」を確認
   - 初回なら `add_user_points(0pt, 'ai_room_generation_free', '初回無料')` を記録してスキップ
   - 2回目以降は今まで通り100pt消費

2. **`supabase/functions/generate-avatar/index.ts`**
   - 現状ポイント消費なし → 今回新たに **2回目以降30pt消費** を追加
   - 初回は `avatar_generation_free` として無料記録
   - 認証ヘッダー・Service Role クライアント・残高チェックを追加（既存の `generate-post-image` を参考に実装）
   - `add_user_points` RPC で原子的にポイント操作

### UIの変更

**`src/components/onboarding/OnboardingChecklist.tsx`**：

- データ取得クエリを拡張：
  - 既存：profile / user_items / goods_posts / follows
  - 追加：`profiles.favorite_item_ids` / `avatar_gallery` 件数 / `ai_generated_rooms` 件数
- チェックリスト配列を上記7項目に再構成
- アクションリンク：
  - お気に入り登録 → `/?userId=<自分のID>` で自分のプロフィールに飛ばし、コレクションタブを開く（既存の `FavoriteItemsTop5` モーダルが起動できる導線へ誘導）
  - AIルーム → `/ai-rooms`
  - アバター → `/my-room` (アバタータブ) … 既に `/my-room` にいるので、アバタータブを開く `?tab=avatar` クエリで誘導
  - 投稿 → `/posts` の新規投稿モーダル（既存リンク）
- 各「初回無料」項目には「初回無料 🎁」バッジを並列表示

### 期待される体験

```text
┌─────────────────────────────────┐
│ ✨ はじめの7ステップ        2/7│
│ ━━━━━━░░░░░░░░░░░░░░░░░░░░░░  │
│                                 │
│ ✓ アカウント作成                │
│ ✓ プロフィール設定              │
│ ○ 最初のグッズ登録      +30pt   │
│ ○ お気に入り登録 ⭐     +20pt   │
│ ○ AIでルームを作る 🎁初回無料   │
│ ○ アバターを作る   🎁初回無料   │
│ ○ 一回投稿する          +20pt   │
└─────────────────────────────────┘
```

### 技術的な変更ファイル

**フロントエンド**
- `src/components/onboarding/OnboardingChecklist.tsx`
  - 取得するデータを追加（favorite_item_ids / avatar_gallery / ai_generated_rooms）
  - items 配列を7項目に再構成
  - 「初回無料」バッジ表示用の条件分岐を追加

**エッジ関数**
- `supabase/functions/generate-ai-room/index.ts`
  - 初回判定（`point_transactions` を `transaction_type IN ('ai_room_generation','ai_room_generation_free')` で検索）
  - 初回はポイント消費をスキップし `ai_room_generation_free` として履歴記録
- `supabase/functions/generate-avatar/index.ts`
  - 認証取得・Service Role クライアント追加
  - 初回判定（`avatar_generation` / `avatar_generation_free`）
  - 2回目以降は **30pt** 消費（失敗時は返金）
  - 既存呼び出し元（`AvatarStudioModal/GenerateTab.tsx` / `AvatarGenerationModal.tsx`）への変更不要（API 形状そのまま）

**DB変更**
- なし（既存の `point_transactions` テーブルと `add_user_points` RPC をそのまま使用）

### 注意事項
- アバター生成にポイント消費を新たに導入するため、既存ユーザーは「2回目以降は30pt」になります。初回判定は履歴ベースなので、過去に既に生成済みのユーザーはいきなり有料扱いになります。これを避けるため、実装時は「`avatar_gallery` に既に1件以上ある場合はチェックリスト上で完了扱いにする」ことで違和感を回避します（無料券は新規ユーザーへの導線として機能）。
- AIルームも同様で、既存の `ai_generated_rooms` 保有ユーザーは完了扱い。

