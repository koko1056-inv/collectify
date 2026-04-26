# AI生成を主役にしたUI/UX刷新プラン

「AI生成（ルーム/アバター）が主役、コレクションは素材」「探索はAI作品＋コレクションを同格に」「リミックス機能フル実装」「/explore統合・ボトムナビ独立タブ」の方針で全Phase段階的に実装します。

---

## Phase 1: 情報設計（IA）とナビゲーション刷新

### 1-1. ホーム画面のタブ再構成
- **`src/components/home/MyRoomHome.tsx`**
  - 構造を「**AI Studio**（デフォルト）」「**コレクション（素材庫）**」の2大タブに再編
  - HeroCardを最新AI生成作品のサムネイル表示に差し替え
  - 「マイルーム」「アバター」セクションを AI Studio タブ内に統合

### 1-2. 探索ページの刷新（`/explore` 統合）
- **新規 `src/pages/Explore.tsx`** を作成（`/rooms/explore` → `/explore` リダイレクト）
- **`src/components/explore/ExploreHub.tsx`** を新規作成し、現在の `RoomExplorer.tsx` を置き換え
- タブ構造を以下に再構築：
  - **AIルーム**（既存）
  - **AIアバター**（新設）
  - **コレクション**（他ユーザーの素材庫を覗く）
  - **ユーザー**（Featured Users）
- マソンリー/グリッドレイアウトの基礎を導入
- `src/App.tsx` のルートを更新（旧 `/rooms/explore` は新ページへリダイレクト）

### 1-3. ボトムナビゲーション独立タブ化
- **`src/components/navigation/MobileBottomNav.tsx`** に「探索」タブを独立配置
  - 構成案: `ホーム / 探索 / ＋(FAB) / コレクション / マイページ`
- アイコンは `Compass` を使用

### 1-4. FAB刷新
- **`src/components/navigation/FloatingActionButton.tsx`**
  - 主要アクションを「✨ AIで作る（ルーム/アバター）」「📷 グッズ追加」の2つに集約
  - 二次機能（交換出品、コレクション作成等）はサブメニューに格納

### 1-5. Navbarスリム化
- **`src/components/Navbar.tsx`**
  - メイン3本柱：`AI Studio` / `コレクション` / `探索`
  - 検索・交換・マッチング等の二次機能はドロップダウンメニュー内に格納

---

## Phase 2: コレクション ⇔ AI Studio 接続強化

### 2-1. コレクションからAIへの素材送り
- **`src/components/UserCollection.tsx`**
  - マルチセレクトモードを強化、選択中フッターバーに「AIで使う」ボタン追加
  - 選択アイテムを `sessionStorage` 経由で AI Studio に渡す

### 2-2. AI Studioでの素材受け取り
- **`src/components/ai-room/AiRoomCreateWizard.tsx`**
  - `initialSelectedItems` プロップを受け取り、最初のステップでプレビュー表示
- **`src/components/avatar-generation/`** 配下のウィザードにも同様の対応

### 2-3. 逆方向リンク（AI作品 → 元素材）
- AI生成ルーム/アバターの詳細ビューに「使われた素材を見る」セクション追加
- 生成時に使用した `binder_items` の ID を保存するフィールドを追加（DB migration）

---

## Phase 3: 探索ページのリミックス機能フル実装

### 3-1. 作品カードへのアクション追加
- **`src/components/explore/ExploreRoomCard.tsx`** （新規）
  - 「**このスタイルで作る**」（プロンプト＋スタイル継承）
  - 「**リミックス**」（同じ素材で別バリエーション生成）
  - 「**素材を見る**」（制作者のコレクションへ）
  - 「**いいね**」「**保存（ブックマーク）**」

### 3-2. リミックス基盤の実装
- DB migration: `ai_generations` テーブル（または既存テーブル）に以下を追加
  - `parent_generation_id`（リミックス元）
  - `style_prompt`、`source_item_ids[]`
- **`src/hooks/useRemixGeneration.ts`** を新規作成
- AI Studio ウィザードに「リミックス元」プレビューを表示

### 3-3. ブックマーク機能
- DB migration: `ai_work_bookmarks` テーブル新設（user_id, work_id, work_type）
- マイページに「保存した作品」タブ追加

### 3-4. フィード型UX
- 探索ページに無限スクロール導入（`useInfiniteQuery`）
- マソンリーレイアウト最適化（モバイルは2列、PCは4列）
- 「For You」レコメンド: ユーザーの `interests` タグベースで並び替え

---

## Phase 4: AI Studio 体験向上 & コミュニティ強化

### 4-1. AI Studio ギャラリー拡張
- **`src/components/ai-room/MyAiRoomsView.tsx`**
  - Instagramライクなグリッドビュー
  - 「再生成」「バリエーション作成」アクション
  - リミックスツリー（自作品の派生系統表示）

### 4-2. 公開作品ページ
- **新規 `src/pages/AiWorkDetail.tsx`** （ルート: `/ai-work/:id`）
  - 探索ページから遷移する詳細ページ
  - リミックス導線、いいね・コメント、シェア用OGP

### 4-3. シェア強化
- AI作品シェア時のウォーターマーク・フレーム追加
- リミックス系統の可視化（「この作品から N 個の派生作品」）

### 4-4. コレクション体験向上
- **`src/components/UserCollection.tsx`**
  - 表示切替: グリッド / リスト / シェルフ（棚）
  - 並び順拡張: 取得日 / カテゴリ / 推し別 / 使用頻度（AI素材として）
- HeroCard下にカテゴリ別チャート、コレクター歴グラフ

---

## 影響範囲・新規作成ファイル

### 新規ファイル
- `src/pages/Explore.tsx`
- `src/pages/AiWorkDetail.tsx`
- `src/components/explore/ExploreHub.tsx`
- `src/components/explore/ExploreRoomCard.tsx`
- `src/components/explore/ExploreAvatarTab.tsx`
- `src/components/explore/ExploreCollectionTab.tsx`
- `src/hooks/useRemixGeneration.ts`
- `src/hooks/useExploreFeed.ts`

### 主要編集ファイル
- `src/App.tsx`（ルート再編）
- `src/components/Navbar.tsx`
- `src/components/navigation/MobileBottomNav.tsx`
- `src/components/navigation/FloatingActionButton.tsx`
- `src/components/home/MyRoomHome.tsx`
- `src/components/UserCollection.tsx`
- `src/components/ai-room/AiRoomCreateWizard.tsx`
- `src/components/ai-room/MyAiRoomsView.tsx`
- `src/components/room3d/RoomExplorer.tsx`（→ ExploreHub に統合）

### DBマイグレーション
- `ai_work_bookmarks` テーブル新設
- AI生成テーブルへ `parent_generation_id`・`source_item_ids` カラム追加
- 必要なRLSポリシー設定

---

## 進め方

各Phaseは独立してリリース可能な単位として段階的に実装します。各Phase完了時に preview 上で確認しながら次に進みます。

- **Phase 1**: 情報設計・ナビゲーション刷新（探索ページ刷新含む）
- **Phase 2**: コレクション ⇔ AI 接続
- **Phase 3**: リミックス機能フル実装
- **Phase 4**: コミュニティ強化・体験向上
