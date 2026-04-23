

# アバター周り 抜本リファクタプラン

「巨大化したアバターページ + 重複した3つのモーダル + DB二重管理」を解体し、**シンプルで一貫した設計**に作り変えます。

## 現状の何が複雑か

| 問題 | 詳細 |
|---|---|
| **715行の神コンポーネント** | `AvatarCenterHome.tsx` が表示・取得・アップロード・削除・名前編集・Popover・Carousel・4つのモーダル制御を全部持っている |
| **モーダルが3つ重複** | `AvatarStudioModal`(779行)、`AvatarDressUpModal`(340行・未使用)、`AvatarGalleryModal`(248行) が同じ `avatar_gallery` テーブルを別々に操作 |
| **DB二重書き込み** | `profiles.avatar_url` と `avatar_gallery.is_current` を毎回手動同期。トリガー任せの箇所と手動の箇所が混在し `setCurrentAvatar` が分岐だらけ |
| **取得ロジックの重複** | 同じ `avatar_gallery` の fetch を `AvatarCenterHome` / `AvatarStudioModal` / `AvatarGalleryModal` がそれぞれ独自に実装 |
| **UIの二重表示** | カルーセル(常時表示) と Popover(隠れ一覧) が両方ある |
| **`window.location.reload()`** | `AvatarDressUpModal` がページごとリロード(悪手) |

## 新しい設計

### 1. 1つのデータソース = カスタムフック `useAvatars`

`src/hooks/useAvatars.ts` に **取得・切替・削除・名前編集・アップロード・AI生成保存** をすべて集約。React Queryで一元管理し、リアルタイム購読も内包。

```ts
const {
  avatars,            // AvatarGalleryRow[]
  currentAvatar,      // AvatarGalleryRow | null （単一の真実）
  isLoading,
  setCurrent,         // (id) => Promise
  remove,             // (id) => Promise
  rename,             // (id, name) => Promise
  uploadFile,         // (file) => Promise
  saveGenerated,      // ({imageUrl, prompt, itemIds?}) => Promise
} = useAvatars(userId);
```

これで `setCurrentAvatar` の分岐地獄、`fetchCurrentAvatar` / `fetchRecentAvatars` / `fetchAvailableAvatars` / `fetchGalleryAvatars` の4種類の重複fetchを **全部1本に統合**。

### 2. コンポーネント分割（神コンポ解体）

```text
src/components/avatar/
├── AvatarCenterHome.tsx        ← 200行以内のレイアウトのみ
├── AvatarMain.tsx              ← 中央の大きなアバター + 編集ボタン
├── AvatarCarousel.tsx          ← 一覧カルーセル(現在/+新規/各タイル)
├── AvatarActionButtons.tsx     ← 4つの円形ボタン
├── AvatarStudioModal/          ← スタジオを分割
│   ├── index.tsx               ← Tabsシェルのみ(150行)
│   ├── GenerateTab.tsx         ← AI生成
│   ├── DressUpTab.tsx          ← 着せ替え
│   └── GalleryTab.tsx          ← ギャラリー
└── dialogs/
    ├── RenameAvatarDialog.tsx
    └── DeleteAvatarDialog.tsx
```

### 3. データモデルの単純化

`avatar_gallery.is_current` を **唯一の真実**にし、`profiles.avatar_url` は派生値として扱う：

- `useAvatars` 内で「`is_current=true` の行」を `currentAvatar` として取得
- 切替時は **1つのRPC `set_current_avatar(avatar_id)` を新設**して、サーバー側で `is_current` リセット + `profiles.avatar_url` 更新をアトミックに実行
- これで `setCurrentAvatar` 関数の `skipGalleryInsert` フラグや `setTimeout(100)` のトリガー待ちが消滅

`avatar-storage.ts` は `ensureProfileImagesPublicUrl`（ストレージ転送）だけ残し、書き込みロジックは全部フックへ。

### 4. 削除する重複ファイル

- ❌ `src/components/home/avatar-center/AvatarDressUpModal.tsx` — `AvatarStudioModal` の dressup タブと完全重複（未使用）
- ❌ `src/components/home/avatar-center/AvatarGalleryModal.tsx` — `AvatarStudioModal` の gallery タブと重複
- ❌ `AvatarCenterHome` 内の Popover（カルーセルと機能重複）
- ❌ `AvatarCenterHome` 内の独自fetch関数群

### 5. UI改善

- メインアバターをタップ → **カルーセル下のアクションボタンが脈動して気付かせる**だけ。Popoverは廃止
- 「編集」バッジは中央の大きなアバターには付けず、操作はすべて4つのボタンに統一
- 名前編集・削除はカルーセルタイル長押し → BottomSheet（モバイルファースト）
- ファイルアップロードは「ギャラリー」タブ内に「画像をアップロード」ボタンとして移動

### 6. アクションフロー（最終形）

```text
中央アバター
  ↓ タップ → スタジオ（gallery タブ）が開く＝今のアバターを変えたいユースケース
  
カルーセル
  ・タップ即切替（currentAvatarに設定）
  ・長押し → 名前編集/削除シート
  ・末尾「+ 新規」 → スタジオ(generate)
  
4ボタン
  ・🪄 生成     → スタジオ(generate)
  ・👕 着せ替え → スタジオ(dressup, baseAvatar=currentAvatar)
  ・🖼️ ギャラリー → スタジオ(gallery)
  ・🎲 ランダム → RandomPickupModal
```

## 技術的な変更点

**新規作成**
- `src/hooks/useAvatars.ts` — React Query ベースの統合フック（取得/切替/削除/名前/アップロード/保存）
- `supabase/migrations/xxx_set_current_avatar_rpc.sql` — `set_current_avatar(avatar_id uuid)` RPC（is_currentリセット + profiles.avatar_url更新をアトミック化）
- `src/components/avatar/AvatarMain.tsx`
- `src/components/avatar/AvatarCarousel.tsx`
- `src/components/avatar/AvatarActionButtons.tsx`
- `src/components/avatar/AvatarStudioModal/{index,GenerateTab,DressUpTab,GalleryTab}.tsx`
- `src/components/avatar/dialogs/{RenameAvatarDialog,DeleteAvatarDialog}.tsx`

**書き換え**
- `src/components/home/AvatarCenterHome.tsx` を200行以下のレイアウトのみに縮小、または `src/components/avatar/AvatarCenterHome.tsx` に移設
- `src/utils/avatar-storage.ts` は `ensureProfileImagesPublicUrl` のみ残し、`setCurrentAvatar` は削除（フックに吸収）
- `src/pages/MyRoom.tsx` の `handleAvatarGenerated` は `useAvatars().saveGenerated` を呼ぶだけに簡素化

**削除**
- `src/components/home/avatar-center/AvatarDressUpModal.tsx`
- `src/components/home/avatar-center/AvatarGalleryModal.tsx`
- `src/components/avatar/AvatarStudioModal.tsx`（779行モノリス → 分割版に置換）

**温存**
- `RandomPickupModal` / `GoodsDisplayModal` / `CollectionAnalyticsModal` — アバター本体とは独立した機能
- `avatar_gallery` テーブル構造は変更なし（既存データはそのまま使える）
- `generate-avatar` / `edit-image` Edge Functions は変更なし

## 影響範囲

- **DB変更**: マイグレーション1本（RPC追加のみ・既存データ非破壊）
- **既存アバター**: 維持される（テーブル変更なし）。最悪消えても可とのことなので、もしRPC適用時に `is_current` の重複があれば最新1件のみ true に正規化
- **ファイル数**: 3,460行 → 約1,800行（ロジック重複の削除で約半減）

## 進め方

タスクは下記6ステップで管理：

1. `useAvatars` フックと `set_current_avatar` RPC 作成
2. スタジオモーダルを4ファイルに分割
3. `AvatarCenterHome` を分割コンポーネントで書き直し
4. 旧モーダル(`AvatarDressUpModal` / `AvatarGalleryModal`)削除
5. `avatar-storage.ts` クリーンアップ + `MyRoom.tsx` 簡素化
6. 動作確認（生成・切替・着せ替え・削除・名前編集）

